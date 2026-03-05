import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';

function getAllowedOrigins(): string[] {
  const raw = (process.env.WEB_ORIGIN ?? 'http://localhost:3000').trim();
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

function toFullOrigin(origin: string): string {
  const o = origin.trim();
  if (!o) return 'http://localhost:3000';
  if (/^https?:\/\//i.test(o)) return o.replace(/\/$/, '');
  return `https://${o}`;
}

function isOriginAllowed(origin: string, allowedOrigins: string[], allowAny: boolean): boolean {
  const normalized = origin.replace(/\/$/, '').trim().toLowerCase();
  if (allowAny) return true;
  return allowedOrigins.some((o) => {
    const oNorm = o.replace(/\/$/, '').trim().toLowerCase();
    if (oNorm === normalized) return true;
    if (!/^https?:\/\//i.test(oNorm) && (normalized === `https://${oNorm}` || normalized === `http://${oNorm}`)) return true;
    return false;
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new IoAdapter(app));

  const allowedOrigins = getAllowedOrigins();
  const allowAny = allowedOrigins.includes('*');

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || isOriginAllowed(origin, allowedOrigins, allowAny)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    // Sem allowedHeaders restritivo: deixa o Nest usar os padrões e aceitar headers comuns do browser
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
