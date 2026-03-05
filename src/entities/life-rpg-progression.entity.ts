import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export type LifeRpgPillar = 'focus' | 'cardio' | 'strength';

@Entity('life_rpg_progression')
export class LifeRpgProgression {
  @PrimaryColumn('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @PrimaryColumn('varchar', { length: 20 })
  pillar: LifeRpgPillar;

  /** Foco: minutos totais. Cardio: km. Força: minutos ou volume (escolher uma). */
  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  value: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
