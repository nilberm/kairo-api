# Deploy (Railway com Docker)

1. Conecte este repositório ao Railway e crie um serviço.
2. Adicione o plugin **PostgreSQL** ao projeto (Railway define `DATABASE_URL` automaticamente).
3. Variáveis de ambiente:
   - `JWT_SECRET` (obrigatório): chave para assinatura dos JWTs.
   - `WEB_ORIGIN`: origens permitidas para CORS (ex.: `https://seu-app.vercel.app`).
   - `PORT`: definido pelo Railway; não é necessário configurar.
4. Build: use o **Dockerfile** na raiz do projeto. As migrations rodam na subida quando `NODE_ENV=production`.

Se não usar o plugin Postgres, configure `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_NAME` em vez de `DATABASE_URL`.

### Seed no servidor (conta default)

Se o banco estiver vazio (ex.: primeiro deploy), você pode popular com o usuário e dados iniciais de duas formas:

1. **Na subida da API:** No Railway, defina `RUN_SEED_ON_STARTUP=true`. No próximo deploy a API roda o seed após as migrations. Depois pode remover a variável.
2. **Pelo terminal (Railway CLI):** Instale o [Railway CLI](https://docs.railway.app/develop/cli), faça login e vincule o projeto. Na pasta da API, rode: `railway run npm run seed`. O comando usa a `DATABASE_URL` do projeto e cria o usuário `default@kairo.app` / senha `changeme` (ou o valor de `SEED_DEFAULT_PASSWORD`).
