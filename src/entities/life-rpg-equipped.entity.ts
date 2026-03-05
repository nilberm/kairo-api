import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { LifeRpgCosmetic } from './life-rpg-cosmetic.entity';

export type LifeRpgPillar = 'focus' | 'cardio' | 'strength';

@Entity('life_rpg_equipped')
export class LifeRpgEquipped {
  @PrimaryColumn('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @PrimaryColumn('varchar', { length: 20 })
  pillar: LifeRpgPillar;

  @PrimaryColumn('varchar', { length: 40 })
  slot: string;

  @Column('uuid', { nullable: true })
  cosmeticId: string | null;

  @ManyToOne(() => LifeRpgCosmetic, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cosmeticId' })
  cosmetic: LifeRpgCosmetic | null;
}
