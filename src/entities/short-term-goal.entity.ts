import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('short_term_goals')
export class ShortTermGoal {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('varchar', { length: 255 })
  title: string;

  @Column('varchar', { length: 500 })
  subtitle: string;

  @Column('int', { nullable: true })
  targetMonths: number | null;

  @Column('boolean', { default: false })
  isCompleted: boolean;
}
