import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';

function getAllowedOrigins(): string[] {
  const raw = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new IoAdapter(app));

  const allowedOrigins = getAllowedOrigins();
  const allowAny = allowedOrigins.includes('*');
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowAny) return callback(null, true);
      const normalized = origin.replace(/\/$/, '');
      const allowed = allowedOrigins.some((o) => o.replace(/\/$/, '') === normalized);
      callback(null, allowed);
    },
    credentials: true,
  });
  console.log('CORS allowed origins:', allowedOrigins);

  if (process.env.NODE_ENV === 'production') {
    try {
      const dataSource = app.get(DataSource);
      await dataSource.runMigrations();
    } catch (migrationErr) {
      console.error('Erro ao rodar migrations (a API sobe mesmo assim):', migrationErr);
      // Não derruba o processo; tabelas podem já existir ou você pode corrigir as migrations.
    }
  }

  const port = process.env.PORT ?? 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`Kairo API running on port ${port}`);
}

bootstrap().catch((err) => {
  console.error('Falha ao iniciar a API:', err);
  process.exit(1);
});
