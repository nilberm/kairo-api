import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisionGoal, VisionGoalTransaction, VisionValueEntry, MediumTermGoal, ShortTermGoal } from '../entities';
import { GoalsService } from './goals.service';
import { GoalsController } from './goals.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VisionGoal,
      VisionGoalTransaction,
      VisionValueEntry,
      MediumTermGoal,
      ShortTermGoal,
    ]),
  ],
  controllers: [GoalsController],
  providers: [GoalsService],
  exports: [GoalsService],
})
export class GoalsModule {}
