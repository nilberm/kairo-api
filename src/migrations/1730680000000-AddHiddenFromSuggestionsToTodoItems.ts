import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adiciona coluna hiddenFromSuggestions em todo_items para permitir
 * remover itens não concluídos das sugestões sem apagá-los.
 */
export class AddHiddenFromSuggestionsToTodoItems1730680000000 implements MigrationInterface {
  name = 'AddHiddenFromSuggestionsToTodoItems1730680000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "todo_items"
      ADD COLUMN IF NOT EXISTS "hiddenFromSuggestions" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "todo_items"
      DROP COLUMN IF EXISTS "hiddenFromSuggestions"
    `);
  }
}
