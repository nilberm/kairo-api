/**
 * Configuração do banco para TypeORM.
 * Se DATABASE_URL existir (ex.: Railway, Heroku), usa ela; senão usa DB_HOST, DB_PORT, etc.
 */
export function getDbConfig(): {
  type: 'postgres';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
} {
  const url = process.env.DATABASE_URL;
  if (url) {
    const parsed = new URL(url);
    return {
      type: 'postgres',
      host: parsed.hostname,
      port: parseInt(parsed.port || '5432', 10),
      username: parsed.username,
      password: parsed.password,
      database: parsed.pathname.slice(1) || 'kairo',
    };
  }
  return {
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_NAME ?? 'kairo',
  };
}
