export class VaultDto {
  id: string;
  name: string;
  balance: number;
  categoryId: string | null;
  goalAmount: number;
  institution: string | null;
  yieldLabel: string | null;
  targetDate: string | null;
}

export class UpsertVaultDto {
  /** Nome do cofre (ex.: "Reserva de emergência", "Investimentos"). */
  name: string;

  /** Saldo atual do cofre. */
  balance: number;

  /** Categoria opcional (slug). */
  categoryId?: string | null;

  /** Meta de valor para o cofre. */
  goalAmount?: number;

  /** Instituição financeira (ex.: Nubank). */
  institution?: string | null;

  /** Descrição do rendimento (ex.: "100% CDI"). */
  yieldLabel?: string | null;

  /** Data-meta amigável (ex.: "Jun 2026"). */
  targetDate?: string | null;
}

