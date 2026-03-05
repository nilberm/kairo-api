import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { VisionGoal } from './vision-goal.entity';
import { MediumTermGoal } from './medium-term-goal.entity';
import { ShortTermGoal } from './short-term-goal.entity';
import { Habit } from './habit.entity';

@Entity('users')
export class User {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  email: string | null;

  /** Hash bcrypt da senha; null para usuários antigos (ex.: seed) até definirem senha. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordHash: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => VisionGoal, (g) => g.user)
  visionGoals: VisionGoal[];

  @OneToMany(() => MediumTermGoal, (g) => g.user)
  mediumGoals: MediumTermGoal[];

  @OneToMany(() => ShortTermGoal, (g) => g.user)
  shortTermGoals: ShortTermGoal[];

  @OneToMany(() => Habit, (h) => h.user)
  habits: Habit[];
}
