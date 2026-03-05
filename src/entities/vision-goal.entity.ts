import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { VisionGoalTransaction } from './vision-goal-transaction.entity';
import { VisionValueEntry } from './vision-value-entry.entity';

@Entity('vision_goals')
export class VisionGoal {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('varchar', { length: 255 })
  title: string;

  @Column('varchar', { length: 500, nullable: true })
  subtitle: string | null;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  currentValue: number;

  @Column('decimal', { precision: 18, scale: 2 })
  targetValue: number;

  @Column('varchar', { length: 20, nullable: true })
  unit: string | null;

  @Column('date')
  deadline: string;

  @Column('varchar', { length: 20, default: 'in_progress' })
  status: string;

  @OneToMany(() => VisionGoalTransaction, (t) => t.visionGoal)
  transactions: VisionGoalTransaction[];

  @OneToMany(() => VisionValueEntry, (e) => e.visionGoal)
  valueHistory: VisionValueEntry[];
}
