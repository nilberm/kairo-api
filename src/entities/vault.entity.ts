import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('vaults')
export class Vault {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('varchar', { length: 255 })
  name: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  balance: string;

  @Column('varchar', { length: 64, nullable: true })
  categoryId: string | null;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  goalAmount: string;

  @Column('varchar', { length: 255, nullable: true })
  institution: string | null;

  @Column('varchar', { length: 64, nullable: true })
  yieldLabel: string | null;

  @Column('date', { nullable: true })
  targetDate: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
