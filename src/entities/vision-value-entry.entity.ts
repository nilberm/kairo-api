import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { VisionGoal } from './vision-goal.entity';

@Entity('vision_value_entries')
export class VisionValueEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 36 })
  visionGoalId: string;

  @ManyToOne(() => VisionGoal, (g) => g.valueHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'visionGoalId' })
  visionGoal: VisionGoal;

  @Column('date')
  date: string;

  @Column('decimal', { precision: 18, scale: 2 })
  value: number;
}
