import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cria a tabela users (necessária antes de AddPasswordHashToUsers em banco novo).
 */
export class CreateUsersTable1730600000000 implements MigrationInterface {
  name = 'CreateUsersTable1730600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL,
        "email" character varying(255) UNIQUE,
        "passwordHash" character varying(255),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
