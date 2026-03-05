import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUser } from '../auth/decorators/current-user.decorator';
import { GoalsService } from './goals.service';

@Controller('goals')
@UseGuards(JwtAuthGuard)
export class GoalsController {
  constructor(private readonly goals: GoalsService) {}

  @Get('vision')
  getVisionGoals(@CurrentUser() user: JwtUser) {
    return this.goals.getVisionGoals(user.id);
  }

  @Patch('vision/:id/current-value')
  updateVisionCurrentValue(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body('currentValue') currentValue: number,
  ) {
    return this.goals.updateVisionGoalCurrentValue(user.id, id, currentValue);
  }

  @Post('vision/:id/transactions')
  addVisionTransaction(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body('type') type: 'aporte' | 'retirada',
    @Body('value') value: number,
  ) {
    return this.goals.addVisionTransaction(user.id, id, type, value);
  }

  @Post('vision/:id/value-entries')
  addVisionValueEntry(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body('value') value: number,
  ) {
    return this.goals.addVisionValueEntry(user.id, id, value);
  }

  @Patch('vision/:id/boolean')
  setVisionBoolean(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body('value') value: 0 | 1,
  ) {
    return this.goals.setVisionBoolean(user.id, id, value);
  }

  @Get('medium')
  getMediumGoals(@CurrentUser() user: JwtUser) {
    return this.goals.getMediumGoals(user.id);
  }

  @Patch('medium/:id/completed')
  setMediumCompleted(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body('isCompleted') isCompleted: boolean,
  ) {
    return this.goals.setMediumGoalCompleted(user.id, id, isCompleted);
  }

  @Get('short')
  getShortTermGoals(@CurrentUser() user: JwtUser) {
    return this.goals.getShortTermGoals(user.id);
  }
}
