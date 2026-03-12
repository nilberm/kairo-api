/**
 * DTO para criação de lançamento.
 * O tipo (unique | installment | recurring) define o fluxo no service.
 */
export type CreateTransactionKind = 'unique' | 'installment' | 'recurring';

export class CreateTransactionDto {
  /** Descrição (ex.: "Mercado", "Conta de Luz", "Salário"). */
  description: string;

  /** Valor: positivo = entrada, negativo = saída. Para parcelada: valor da parcela ou valor total (conforme totalAmount). */
  amount: number;

  /** Data do primeiro lançamento (dia do mês será replicado em parceladas/recorrentes). */
  date: string; // YYYY-MM-DD

  /** INCOME | EXPENSE */
  type: 'INCOME' | 'EXPENSE';

  /** unique = 1 registro; installment = N parcelas; recurring = 24 meses (recorrência). */
  kind: CreateTransactionKind;

  /** Para kind = installment: número de parcelas. */
  installments?: number;

  /** Para kind = installment: true = amount é o total; false = amount é o valor de cada parcela. */
  totalAmount?: boolean;

  /** Para kind = recurring: data fim (opcional). Se não informado, gera 24 meses. */
  recurringEndDate?: string; // YYYY-MM-DD

  categoryId?: string | null;
}
