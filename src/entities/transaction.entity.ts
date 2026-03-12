import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { TransactionGroup } from './transaction-group.entity';

export type TransactionType = 'INCOME' | 'EXPENSE';

/**
 * Lançamento financeiro: único, parcela de compra parcelada ou ocorrência de recorrência.
 * amount: positivo = entrada, negativo = saída (ou use type + valor absoluto; aqui usamos sinal).
 */
@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('varchar', { length: 500 })
  description: string;

  /** Valor: positivo = entrada, negativo = saída. */
  @Column('decimal', { precision: 18, scale: 2 })
  amount: string;

  @Column('date')
  date: string;

  @Column('varchar', { length: 20 })
  type: TransactionType;

  /** Opcional; para agrupamentos/categorias futuros. */
  @Column('uuid', { nullable: true })
  categoryId: string | null;

  /** Agrupa parcelas (2/10) ou recorrências (mesmo gasto/receita todo mês). */
  @Column('uuid', { nullable: true })
  transactionGroupId: string | null;

  @ManyToOne(() => TransactionGroup, (gr) => gr.transactions, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'transactionGroupId' })
  transactionGroup: TransactionGroup | null;

  /** Exibição: "2/10" (parcela 2 de 10) ou null para único/recorrente sem label. */
  @Column('varchar', { length: 20, nullable: true })
  installmentInfo: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
