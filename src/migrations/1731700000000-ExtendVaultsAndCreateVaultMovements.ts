import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendVaultsAndCreateVaultMovements1731700000000 implements MigrationInterface {
  name = 'ExtendVaultsAndCreateVaultMovements1731700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "vaults"
      ADD COLUMN "goalAmount" decimal(18,2) NOT NULL DEFAULT 0,
      ADD COLUMN "institution" varchar(120),
      ADD COLUMN "yieldLabel" varchar(120),
      ADD COLUMN "targetDate" varchar(32)
    `);

    await queryRunner.query(`
      CREATE TABLE "vault_movements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "vaultId" uuid NOT NULL,
        "date" date NOT NULL,
        "type" varchar(20) NOT NULL,
        "amount" decimal(18,2) NOT NULL,
        "source" varchar(20) NOT NULL,
        "linkedTransactionId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_vault_movements_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_vault_movements_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_vault_movements_vault" FOREIGN KEY ("vaultId") REFERENCES "vaults"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_vault_movements_tx" FOREIGN KEY ("linkedTransactionId") REFERENCES "transactions"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_vault_movements_user_vault" ON "vault_movements" ("userId","vaultId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_vault_movements_user_vault"`);
    await queryRunner.query(`DROP TABLE "vault_movements"`);
    await queryRunner.query(`
      ALTER TABLE "vaults"
      DROP COLUMN "goalAmount",
      DROP COLUMN "institution",
      DROP COLUMN "yieldLabel",
      DROP COLUMN "targetDate"
    `);
  }
}

