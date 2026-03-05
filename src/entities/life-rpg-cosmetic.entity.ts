import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export type LifeRpgPillar = 'focus' | 'cardio' | 'strength';

@Entity('life_rpg_cosmetic')
export class LifeRpgCosmetic {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 20 })
  pillar: LifeRpgPillar;

  @Column('varchar', { length: 40 })
  slot: string;

  @Column('varchar', { length: 255 })
  name: string;

  @Column('varchar', { length: 512 })
  imageUrl: string;

  @Column('int', { default: 0 })
  sortOrder: number;
}
