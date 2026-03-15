import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adiciona dailyBudget e monthlyVariableBudget em user_finance_settings
 * para o cálculo de projeção híbrida (Orçamento Base Zero).
 */
export class AddDailyBudgetToFinanceSettings1730720000000 implements MigrationInterface {
  name = 'AddDailyBudgetToFinanceSettings1730720000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_finance_settings"
      ADD COLUMN IF NOT EXISTS "dailyBudget" decimal(18,2) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "user_finance_settings"
      ADD COLUMN IF NOT EXISTS "monthlyVariableBudget" decimal(18,2) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_finance_settings" DROP COLUMN IF EXISTS "dailyBudget"`);
    await queryRunner.query(`ALTER TABLE "user_finance_settings" DROP COLUMN IF EXISTS "monthlyVariableBudget"`);
  }
}
