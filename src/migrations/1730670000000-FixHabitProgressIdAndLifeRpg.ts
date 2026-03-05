import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Corrige habit_progress.id (DEFAULT para upsert) e cria life_rpg_progression.
 */
export class FixHabitProgressIdAndLifeRpg1730670000000 implements MigrationInterface {
  name = 'FixHabitProgressIdAndLifeRpg1730670000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "habit_progress"
      ALTER COLUMN "id" SET DEFAULT gen_random_uuid()
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "life_rpg_progression" (
        "userId" uuid NOT NULL,
        "pillar" varchar(20) NOT NULL,
        "value" decimal(12,2) NOT NULL DEFAULT 0,
        "updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_life_rpg_progression" PRIMARY KEY ("userId", "pillar"),
        CONSTRAINT "FK_life_rpg_progression_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "habit_progress" ALTER COLUMN "id" DROP DEFAULT`);
    await queryRunner.query(`DROP TABLE IF EXISTS "life_rpg_progression"`);
  }
}
