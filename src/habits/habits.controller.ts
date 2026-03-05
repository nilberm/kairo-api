import { Controller, Get, Put, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUser } from '../auth/decorators/current-user.decorator';
import { HabitsService } from './habits.service';

/**
 * GET /habits/progress?periodKey=<chave>
 *
 * Retorna o progresso dos hábitos para um período. A chave define o tipo:
 *
 * - periodKey=YYYY-MM-DD (ex: 2026-02-20) → progresso do DIA (hábitos diários)
 * - periodKey=YYYY-Www (ex: 2026-W08)   → progresso da SEMANA (hábitos semanais)
 * - periodKey=YYYY-MM (ex: 2026-02)      → progresso do MÊS (hábitos mensais)
 *
 * Todas as rotas exigem autenticação (Bearer JWT).
 */
@Controller('habits')
@UseGuards(JwtAuthGuard)
export class HabitsController {
  constructor(private readonly habits: HabitsService) {}

  @Get()
  getHabits(@CurrentUser() user: JwtUser) {
    return this.habits.getHabits(user.id);
  }

  @Get('progress')
  getProgress(@CurrentUser() user: JwtUser, @Query('periodKey') periodKey: string) {
    return this.habits.getProgress(user.id, periodKey);
  }

  /**
   * GET /habits/streak
   * Retorna currentStreak (dias consecutivos até hoje) e weekDays (7 dias: hoje-6 até hoje) com completed/isToday.
   */
  @Get('streak')
  getStreak(@CurrentUser() user: JwtUser) {
    return this.habits.getStreak(user.id);
  }

  /**
   * GET /habits/progress/history?frequency=daily|weekly|monthly&count=30
   */
  @Get('progress/history')
  getProgressHistory(
    @CurrentUser() user: JwtUser,
    @Query('frequency') frequency: 'daily' | 'weekly' | 'monthly',
    @Query('count') count?: string,
  ) {
    const limit = Math.min(Math.max(parseInt(count ?? '30', 10) || 30, 1), 365);
    return this.habits.getProgressHistory(user.id, frequency, limit);
  }

  /**
   * GET /habits/progress/first-activity
   * Retorna { firstDate: "YYYY-MM-DD" | null }.
   */
  @Get('progress/first-activity')
  async getFirstActivity(@CurrentUser() user: JwtUser): Promise<{ firstDate: string | null }> {
    const firstDate = await this.habits.getFirstActivityDate(user.id);
    return { firstDate };
  }

  /**
   * GET /habits/progress/by-month?month=YYYY-MM
   */
  @Get('progress/by-month')
  getProgressByMonth(@CurrentUser() user: JwtUser, @Query('month') month: string) {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      const now = new Date();
      month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    return this.habits.getProgressByMonth(user.id, month);
  }

  /**
   * GET /habits/progress/summary-by-months?from=YYYY-MM&to=YYYY-MM
   */
  @Get('progress/summary-by-months')
  getSummaryByMonths(
    @CurrentUser() user: JwtUser,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const now = new Date();
    const defaultTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (!/^\d{4}-\d{2}$/.test(from)) from = defaultTo;
    if (!/^\d{4}-\d{2}$/.test(to)) to = defaultTo;
    return this.habits.getSummaryByMonths(user.id, from, to);
  }

  @Put('progress')
  setProgress(
    @CurrentUser() user: JwtUser,
    @Body('habitId') habitId: string,
    @Body('periodKey') periodKey: string,
    @Body('value') value: number,
  ) {
    return this.habits.setProgress(user.id, habitId, periodKey, value);
  }
}
