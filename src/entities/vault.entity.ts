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

/**
 * Cofre financeiro: valores guardados/investidos, fora do saldo mensal da planilha.
 */
@Entity('vaults')
export class Vault {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('varchar', { length: 200 })
  name: string;

  /**
   * Saldo atual do cofre.
   */
  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  balance: string;

  /**
   * Categoria opcional (ex.: 'reserva-emergencia', 'investimentos', 'viagem').
   */
  @Column('varchar', { length: 64, nullable: true })
  categoryId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

