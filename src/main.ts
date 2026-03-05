import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { runSeedWithDataSource } from './seed/run-seed';

function getCorsOrigins(): string[] {
  const raw = (process.env.WEB_ORIGIN ?? 'http://localhost:3000').trim();
  return raw.split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);
}

function isOriginAllowed(origin: string, allowed: string[]): boolean {
  const norm = origin.replace(/\/$/, '').toLowerCase();
  return allowed.some((o) => {
    const oNorm = o.toLowerCase();
    if (oNorm === norm) return true;
    if (!/^https?:\/\//i.test(oNorm) && (norm === `https://${oNorm}` || norm === `http://${oNorm}`)) return true;
    return false;
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new IoAdapter(app));

  const corsOrigins = getCorsOrigins();
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || isOriginAllowed(origin, corsOrigins)) callback(null, true);
      else callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  if (process.env.NODE_ENV === 'production') {
    try {
      const dataSource = app.get(DataSource);
      await dataSource.runMigrations();
      if (process.env.RUN_SEED_ON_STARTUP === 'true') {
        await runSeedWithDataSource(dataSource);
      }
    } catch (migrationErr) {
      console.error('Erro ao rodar migrations (a API sobe mesmo assim):', migrationErr);
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
