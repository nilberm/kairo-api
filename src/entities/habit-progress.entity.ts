import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Habit } from './habit.entity';

@Entity('habit_progress')
@Unique(['habitId', 'periodKey'])
export class HabitProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 36 })
  habitId: string;

  @ManyToOne(() => Habit, (h) => h.progressRecords, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'habitId' })
  habit: Habit;

  /** YYYY-MM-DD for daily, YYYY-Www for weekly, YYYY-MM for monthly */
  @Column('varchar', { length: 20 })
  periodKey: string;

  @Column('int', { default: 0 })
  value: number;
}
