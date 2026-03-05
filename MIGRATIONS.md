# Migrations (TypeORM)

O projeto usa **migrations** para evoluir o schema do banco de forma controlada. Em desenvolvimento o `synchronize: true` ainda atualiza o banco a partir das entidades; em **produção** o schema é alterado apenas pelas migrations.

## Comandos

```bash
# Rodar migrations pendentes (usa .env para conexão)
npm run migration:run

# Gerar uma nova migration a partir das mudanças nas entidades
# (exige banco rodando e schema atualizado; gera o diff)
npm run migration:generate -- src/migrations/NomeDaMigration
```

## Em produção

- **NODE_ENV=production**: o app **roda as migrations pendentes** na subida (em `main.ts`), antes de abrir a porta.
- O build (`npm run build`) gera os arquivos em `dist/`, incluindo `dist/migrations/*.js`.
- Se preferir rodar migrations à parte do app (ex.: no CI), execute antes do deploy:
  ```bash
  npm run build
  npm run migration:run   # usa src/data-source.ts com ts-node; em CI pode usar node -d dist/data-source.js
  npm run start:prod
  ```

## Estrutura

- `src/data-source.ts` — configuração do TypeORM para o CLI (migration:run / migration:generate).
- `src/migrations/` — arquivos de migration (cada um tem `up` e `down`).
- A tabela `migrations` no PostgreSQL guarda quais migrations já foram aplicadas.

## Primeira migration

- `1730650000000-AddPasswordHashToUsers.ts`: adiciona a coluna `passwordHash` na tabela `users` (seguro para banco já existente: `ADD COLUMN IF NOT EXISTS`).
