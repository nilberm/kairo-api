import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('medium_term_goals')
export class MediumTermGoal {
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
  costOrValue: number;

  @Column('varchar', { length: 10, nullable: true })
  currency: string | null;

  @Column('date')
  deadline: string;

  @Column('boolean', { default: false })
  isCompleted: boolean;
}
