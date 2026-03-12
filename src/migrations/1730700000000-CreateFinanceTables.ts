import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Módulo financeiro: transaction_groups, transactions, user_finance_settings.
 * - transaction_groups: agrupa parceladas e recorrentes; recurrence_end_date + status para alerta de renovação.
 * - transactions: lançamentos (único, parcela ou recorrência); amount com sinal, transaction_group_id, installment_info.
 * - user_finance_settings: saldo atual do usuário para cálculo da projeção.
 */
export class CreateFinanceTables1730700000000 implements MigrationInterface {
  name = 'CreateFinanceTables1730700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "transaction_groups" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "kind" varchar(20) NOT NULL,
        "recurrenceEndDate" date,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_transaction_groups" PRIMARY KEY ("id"),
        CONSTRAINT "FK_transaction_groups_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "transactions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "description" varchar(500) NOT NULL,
        "amount" decimal(18,2) NOT NULL,
        "date" date NOT NULL,
        "type" varchar(20) NOT NULL,
        "categoryId" uuid,
        "transactionGroupId" uuid,
        "installmentInfo" varchar(20),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_transactions_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_transactions_group" FOREIGN KEY ("transactionGroupId") REFERENCES "transaction_groups"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_finance_settings" (
        "userId" uuid NOT NULL,
        "balance" decimal(18,2) NOT NULL DEFAULT 0,
        "balanceAsOfDate" date NOT NULL,
        CONSTRAINT "PK_user_finance_settings" PRIMARY KEY ("userId"),
        CONSTRAINT "FK_user_finance_settings_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_transactions_user_date"
      ON "transactions" ("userId", "date")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_transactions_group"
      ON "transactions" ("transactionGroupId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_transaction_groups_user_status"
      ON "transaction_groups" ("userId", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "transaction_groups"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_finance_settings"`);
  }
}
