import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  LifeRpgProgression,
  LifeRpgCosmetic,
  LifeRpgUserCosmetic,
  LifeRpgEquipped,
} from '../entities';
import { LifeRpgService } from './life-rpg.service';
import { LifeRpgController } from './life-rpg.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LifeRpgProgression,
      LifeRpgCosmetic,
      LifeRpgUserCosmetic,
      LifeRpgEquipped,
    ]),
  ],
  controllers: [LifeRpgController],
  providers: [LifeRpgService],
  exports: [LifeRpgService],
})
export class LifeRpgModule {}
