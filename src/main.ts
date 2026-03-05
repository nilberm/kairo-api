import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new IoAdapter(app));
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });

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
  await app.listen(port);
  console.log(`Kairo API running on http://localhost:${port}`);
}

bootstrap().catch((err) => {
  console.error('Falha ao iniciar a API:', err);
  process.exit(1);
});
