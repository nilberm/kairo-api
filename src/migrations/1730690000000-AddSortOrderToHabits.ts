import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adiciona coluna sortOrder em habits para reordenação (diários, semanais, mensais).
 * Backfill: por usuário e frequency, ordena por id e atribui sortOrder 0, 1, 2, ...
 */
export class AddSortOrderToHabits1730690000000 implements MigrationInterface {
  name = 'AddSortOrderToHabits1730690000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "habits"
      ADD COLUMN IF NOT EXISTS "sortOrder" int NOT NULL DEFAULT 0
    `);
    // Backfill: para cada (userId, frequency), ordenar por id e setar sortOrder
    await queryRunner.query(`
      WITH ordered AS (
        SELECT id, "userId", frequency,
               ROW_NUMBER() OVER (PARTITION BY "userId", frequency ORDER BY id) - 1 AS rn
        FROM "habits"
      )
      UPDATE "habits" h
      SET "sortOrder" = o.rn
      FROM ordered o
      WHERE h.id = o.id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "habits" DROP COLUMN IF EXISTS "sortOrder"`);
  }
}
