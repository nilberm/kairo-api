import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Transaction } from './transaction.entity';

export type TransactionGroupKind = 'installment' | 'recurring';

/** Status do grupo: ativo (gera projeção/renovação) ou encerrado. */
export type TransactionGroupStatus = 'active' | 'ended';

/**
 * Agrupa transações parceladas ou recorrentes.
 * - Parcelada: mesma compra em N meses (installment_info "2/10" em cada transaction).
 * - Recorrente: mesma despesa/receita todo mês; recurrence_end_date = data do último registro gerado;
 *   quando está perto do fim, o sistema alerta para "Renovar" (gera +24 meses) ou "Encerrar" (status = ended).
 */
@Entity('transaction_groups')
export class TransactionGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /** Tipo do grupo: parcelada (compra em N vezes) ou recorrente (fixo mensal). */
  @Column('varchar', { length: 20 })
  kind: TransactionGroupKind;

  /**
   * Data do último lançamento gerado (só para kind = recurring).
   * Usado para alerta de renovação: se está a &lt; 30 dias ou no mês atual → exibir aviso.
   */
  @Column('date', { nullable: true })
  recurrenceEndDate: string | null;

  /** active = ainda gera/renova; ended = usuário encerrou (não gera mais). */
  @Column('varchar', { length: 20, default: 'active' })
  status: TransactionGroupStatus;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Transaction, (t) => t.transactionGroup)
  transactions: Transaction[];
}
