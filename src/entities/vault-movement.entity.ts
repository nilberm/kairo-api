import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Vault } from './vault.entity';
import { Transaction } from './transaction.entity';

export type VaultMovementType = 'deposit' | 'withdraw';
export type VaultMovementSource = 'planilha' | 'external' | 'vault';

@Entity('vault_movements')
export class VaultMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  vaultId: string;

  @ManyToOne(() => Vault, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vaultId' })
  vault: Vault;

  @Column('date')
  date: string; // YYYY-MM-DD

  @Column('varchar', { length: 20 })
  type: VaultMovementType;

  /** Valor positivo da movimentação. Sinal é definido por type. */
  @Column('decimal', { precision: 18, scale: 2 })
  amount: string;

  @Column('varchar', { length: 20 })
  source: VaultMovementSource;

  /** Lançamento na planilha associado (quando source = planilha). */
  @Column('uuid', { nullable: true })
  linkedTransactionId: string | null;

  @ManyToOne(() => Transaction, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'linkedTransactionId' })
  linkedTransaction: Transaction | null;

  @CreateDateColumn()
  createdAt: Date;
}

