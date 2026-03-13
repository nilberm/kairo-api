export class VaultDto {
  id: string;
  name: string;
  balance: number;
  categoryId: string | null;
}

export class UpsertVaultDto {
  /** Nome do cofre (ex.: "Reserva de emergência", "Investimentos"). */
  name: string;

  /** Saldo atual do cofre. */
  balance: number;

  /** Categoria opcional (slug). */
  categoryId?: string | null;
}

