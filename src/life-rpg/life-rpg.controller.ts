import { Controller, Get, Post, Put, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUser } from '../auth/decorators/current-user.decorator';
import { LifeRpgService } from './life-rpg.service';
import type { LifeRpgPillar } from '../entities/life-rpg-progression.entity';

@Controller('life-rpg')
@UseGuards(JwtAuthGuard)
export class LifeRpgController {
  constructor(private readonly lifeRpg: LifeRpgService) {}

  @Get('progression')
  getProgression(@CurrentUser() user: JwtUser) {
    return this.lifeRpg.getProgression(user.id);
  }

  @Post('focus/time')
  async addFocusMinutes(@CurrentUser() user: JwtUser, @Body('minutes') minutes: number) {
    return this.lifeRpg.addFocusMinutes(user.id, Number(minutes) || 0);
  }

  @Get('cosmetics')
  getCosmetics(@Query('pillar') pillar: LifeRpgPillar) {
    return this.lifeRpg.getCosmetics(pillar || 'focus');
  }

  @Get('inventory')
  getInventory(@CurrentUser() user: JwtUser, @Query('pillar') pillar: LifeRpgPillar) {
    return this.lifeRpg.getInventory(user.id, pillar || 'focus');
  }

  @Get('equipped')
  getEquipped(@CurrentUser() user: JwtUser, @Query('pillar') pillar: LifeRpgPillar) {
    return this.lifeRpg.getEquipped(user.id, pillar || 'focus');
  }

  @Put('equipped')
  setEquipped(
    @CurrentUser() user: JwtUser,
    @Body('pillar') pillar: LifeRpgPillar,
    @Body('slot') slot: string,
    @Body('cosmeticId') cosmeticId: string | null,
  ) {
    return this.lifeRpg.setEquipped(user.id, pillar || 'focus', slot || '', cosmeticId ?? null);
  }
}
