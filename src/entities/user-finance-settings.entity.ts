import { Entity, PrimaryColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

/**
 * Saldo atual do usuário (referência para projeção).
 * O backend usa balance + balanceAsOfDate e aplica transações a partir dessa data
 * para calcular o saldo acumulado dia a dia na projeção.
 */
@Entity('user_finance_settings')
export class UserFinanceSettings {
  @PrimaryColumn('uuid')
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  balance: string;

  /** Data em que o saldo (balance) foi definido/atualizado. */
  @Column('date')
  balanceAsOfDate: string;

  /** Orçamento diário para gastos variáveis (ex: R$ 45/dia). Usado na projeção para dias hoje/futuro. */
  @Column('decimal', { precision: 18, scale: 2, nullable: true })
  dailyBudget: string | null;

  /** Orçamento total do mês para gastos variáveis (ex: R$ 1400). Se null, usa dailyBudget * dias no mês. */
  @Column('decimal', { precision: 18, scale: 2, nullable: true })
  monthlyVariableBudget: string | null;
}
