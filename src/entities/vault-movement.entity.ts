import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Vault } from './vault.entity';

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
  date: string;

  @Column('varchar', { length: 20 })
  type: 'deposit' | 'withdraw';

  @Column('decimal', { precision: 18, scale: 2 })
  amount: string;

  @Column('varchar', { length: 32 })
  source: string;

  @Column('uuid', { nullable: true })
  linkedTransactionId: string | null;
}
