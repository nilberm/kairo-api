import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Altera categoryId de uuid para varchar para permitir slugs (ex.: "vendas", "salario").
 */
export class TransactionCategoryIdToVarchar1730710000000 implements MigrationInterface {
  name = 'TransactionCategoryIdToVarchar1730710000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "transactions"
      ALTER COLUMN "categoryId" TYPE varchar(64) USING "categoryId"::text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "transactions"
      ALTER COLUMN "categoryId" TYPE uuid USING CASE WHEN "categoryId" ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN "categoryId"::uuid ELSE NULL END
    `);
  }
}
