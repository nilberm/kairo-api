# Deploy (Railway com Docker)

1. Conecte este repositório ao Railway e crie um serviço.
2. Adicione o plugin **PostgreSQL** ao projeto (Railway define `DATABASE_URL` automaticamente).
3. Variáveis de ambiente:
   - `JWT_SECRET` (obrigatório): chave para assinatura dos JWTs.
   - `WEB_ORIGIN`: origens permitidas para CORS (ex.: `https://seu-app.vercel.app`).
   - `PORT`: definido pelo Railway; não é necessário configurar.
4. Build: use o **Dockerfile** na raiz do projeto. As migrations rodam na subida quando `NODE_ENV=production`.

Se não usar o plugin Postgres, configure `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_NAME` em vez de `DATABASE_URL`.
