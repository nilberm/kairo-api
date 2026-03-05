import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adiciona a coluna passwordHash na tabela users (autenticação).
 * Seguro para rodar em banco já existente: usa IF NOT EXISTS.
 */
export class AddPasswordHashToUsers1730650000000 implements MigrationInterface {
  name = 'AddPasswordHashToUsers1730650000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordHash" VARCHAR(255)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "passwordHash"`);
  }
}
