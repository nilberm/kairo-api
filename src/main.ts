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

function toFullOrigin(origin: string): string {
  if (/^https?:\/\//i.test(origin)) return origin.replace(/\/$/, '');
  return `https://${origin}`;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new IoAdapter(app));

  const allowedOrigins = getAllowedOrigins();
  const allowAny = allowedOrigins.includes('*');

  function isOriginAllowed(origin: string): boolean {
    const normalized = origin.replace(/\/$/, '').toLowerCase();
    if (allowAny) return true;
    return allowedOrigins.some((o) => {
      const oNorm = o.replace(/\/$/, '').toLowerCase();
      if (oNorm === normalized) return true;
      if (!/^https?:\/\//i.test(oNorm) && (normalized === `https://${oNorm}` || normalized === `http://${oNorm}`)) return true;
      return false;
    });
  }

  app.enableCors({
    origin: (origin, callback) => {
      // Proxy (ex.: Railway) pode remover o header Origin; usa o primeiro permitido como fallback
      if (!origin) {
        if (allowedOrigins.length > 0) {
          return callback(null, toFullOrigin(allowedOrigins[0]));
        }
        return callback(null, true);
      }
      if (isOriginAllowed(origin)) {
        return callback(null, origin);
      }
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
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
