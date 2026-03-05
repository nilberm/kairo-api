# Kairo API

API NestJS do Kairo (hábitos, metas, todos, life-rpg). Autenticação JWT; Postgres + TypeORM; migrations; WebSocket.

## Desenvolvimento local

```bash
npm install
cp .env.example .env   # ajuste DB_* e JWT_SECRET
npm run migration:run
npm run seed
npm run start:dev
```

## Docker (local ou staging)

```bash
docker-compose up --build
```

API em `http://localhost:4000`; Postgres em `localhost:5432` (user `kairo`, senha `kairo`, DB `kairo`).

## Deploy no Railway

1. Conecte este repositório ao Railway.
2. Adicione o plugin **PostgreSQL** (Railway define `DATABASE_URL`).
3. Defina as variáveis: `JWT_SECRET`, `WEB_ORIGIN` (CORS).
4. Build: use o **Dockerfile** na raiz. As migrations rodam na subida em produção.

Variáveis opcionais: `PORT` (Railway define); se não usar o plugin Postgres, use `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.

Mais detalhes: [DEPLOY.md](./DEPLOY.md).
