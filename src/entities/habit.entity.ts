import { Entity, PrimaryColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { HabitProgress } from './habit-progress.entity';

@Entity('habits')
export class Habit {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('varchar', { length: 255 })
  name: string;

  @Column('varchar', { length: 20 })
  frequency: string; // 'daily' | 'weekly' | 'monthly'

  @Column('varchar', { length: 20 })
  type: string; // 'counter' | 'boolean' | 'time'

  @Column('int', { default: 1 })
  target: number;

  @Column('varchar', { length: 50, nullable: true })
  unit: string | null;

  @OneToMany(() => HabitProgress, (p) => p.habit)
  progressRecords: HabitProgress[];
}
