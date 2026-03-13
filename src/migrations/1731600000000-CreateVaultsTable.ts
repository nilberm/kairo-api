import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVaultsTable1731600000000 implements MigrationInterface {
  name = 'CreateVaultsTable1731600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "vaults" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "name" varchar(200) NOT NULL,
        "balance" decimal(18,2) NOT NULL DEFAULT 0,
        "categoryId" varchar(64),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_vaults_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_vaults_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_vaults_user" ON "vaults" ("userId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_vaults_user"`);
    await queryRunner.query(`DROP TABLE "vaults"`);
  }
}

