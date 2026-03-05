import 'dotenv/config';
import { DataSource } from 'typeorm';
import { getDbConfig } from './db-config';

/**
 * DataSource usado pelo CLI do TypeORM (migration:run, migration:generate).
 * Respeita DATABASE_URL (Railway, Heroku) ou DB_*.
 */
const db = getDbConfig();

export const AppDataSource = new DataSource({
  ...db,
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  migrationsTableName: 'migrations',
  synchronize: false,
});
