import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cria tabelas usadas pelo app e pelo seed (vision_goals, habits, goals, todo_items, etc.).
 * Rodar após CreateUsersTable e AddPasswordHashToUsers.
 */
export class CreateAppTables1730660000000 implements MigrationInterface {
  name = 'CreateAppTables1730660000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "vision_goals" (
        "id" varchar(36) NOT NULL,
        "userId" uuid NOT NULL,
        "title" varchar(255) NOT NULL,
        "subtitle" varchar(500),
        "currentValue" decimal(18,2) NOT NULL DEFAULT 0,
        "targetValue" decimal(18,2) NOT NULL,
        "unit" varchar(20),
        "deadline" date NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'in_progress',
        CONSTRAINT "PK_vision_goals" PRIMARY KEY ("id"),
        CONSTRAINT "FK_vision_goals_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "medium_term_goals" (
        "id" varchar(36) NOT NULL,
        "userId" uuid NOT NULL,
        "title" varchar(255) NOT NULL,
        "subtitle" varchar(500),
        "costOrValue" decimal(18,2) NOT NULL DEFAULT 0,
        "currency" varchar(10),
        "deadline" date NOT NULL,
        "isCompleted" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_medium_term_goals" PRIMARY KEY ("id"),
        CONSTRAINT "FK_medium_term_goals_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "short_term_goals" (
        "id" varchar(36) NOT NULL,
        "userId" uuid NOT NULL,
        "title" varchar(255) NOT NULL,
        "subtitle" varchar(500) NOT NULL,
        "targetMonths" int,
        "isCompleted" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_short_term_goals" PRIMARY KEY ("id"),
        CONSTRAINT "FK_short_term_goals_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "habits" (
        "id" varchar(36) NOT NULL,
        "userId" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "frequency" varchar(20) NOT NULL,
        "type" varchar(20) NOT NULL,
        "target" int NOT NULL DEFAULT 1,
        "unit" varchar(50),
        CONSTRAINT "PK_habits" PRIMARY KEY ("id"),
        CONSTRAINT "FK_habits_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "todo_items" (
        "id" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "title" varchar(500) NOT NULL,
        "date" varchar(10) NOT NULL,
        "completedAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_todo_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_todo_items_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "vision_goal_transactions" (
        "id" uuid NOT NULL,
        "visionGoalId" varchar(36) NOT NULL,
        "date" date NOT NULL,
        "type" varchar(20) NOT NULL,
        "value" decimal(18,2) NOT NULL,
        CONSTRAINT "PK_vision_goal_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_vision_goal_transactions_goal" FOREIGN KEY ("visionGoalId") REFERENCES "vision_goals"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "vision_value_entries" (
        "id" uuid NOT NULL,
        "visionGoalId" varchar(36) NOT NULL,
        "date" date NOT NULL,
        "value" decimal(18,2) NOT NULL,
        CONSTRAINT "PK_vision_value_entries" PRIMARY KEY ("id"),
        CONSTRAINT "FK_vision_value_entries_goal" FOREIGN KEY ("visionGoalId") REFERENCES "vision_goals"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "habit_progress" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "habitId" varchar(36) NOT NULL,
        "periodKey" varchar(20) NOT NULL,
        "value" int NOT NULL DEFAULT 0,
        CONSTRAINT "PK_habit_progress" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_habit_progress_period" UNIQUE ("habitId", "periodKey"),
        CONSTRAINT "FK_habit_progress_habit" FOREIGN KEY ("habitId") REFERENCES "habits"("id") ON DELETE CASCADE
      )
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
    await queryRunner.query(`DROP TABLE IF EXISTS "life_rpg_progression"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "habit_progress"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vision_value_entries"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vision_goal_transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "todo_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "habits"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "short_term_goals"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "medium_term_goals"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vision_goals"`);
  }
}
