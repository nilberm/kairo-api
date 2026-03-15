export interface VaultDto {
  id: string;
  name: string;
  balance: number;
  categoryId: string | null;
  goalAmount: number;
  institution: string | null;
  yieldLabel: string | null;
  targetDate: string | null;
}

export interface UpsertVaultDto {
  name: string;
  balance?: number;
  categoryId?: string | null;
  goalAmount?: number;
  institution?: string | null;
  yieldLabel?: string | null;
  targetDate?: string | null;
}
