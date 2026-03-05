import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { LifeRpgCosmetic } from './life-rpg-cosmetic.entity';

@Entity('life_rpg_user_cosmetic')
export class LifeRpgUserCosmetic {
  @PrimaryColumn('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @PrimaryColumn('uuid')
  cosmeticId: string;

  @ManyToOne(() => LifeRpgCosmetic, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cosmeticId' })
  cosmetic: LifeRpgCosmetic;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  unlockedAt: Date;
}
