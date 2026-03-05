import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { VisionGoal } from './vision-goal.entity';

@Entity('vision_goal_transactions')
export class VisionGoalTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 36 })
  visionGoalId: string;

  @ManyToOne(() => VisionGoal, (g) => g.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'visionGoalId' })
  visionGoal: VisionGoal;

  @Column('date')
  date: string;

  @Column('varchar', { length: 20 })
  type: string; // 'aporte' | 'retirada'

  @Column('decimal', { precision: 18, scale: 2 })
  value: number;
}
