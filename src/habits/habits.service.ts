import { randomUUID } from 'crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Habit, HabitProgress } from '../entities';
import { EventsGateway } from '../events/events.gateway';

export type CreateHabitDto = {
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  type: 'counter' | 'boolean' | 'time';
  target?: number;
  unit?: string | null;
};

export type UpdateHabitDto = {
  name?: string;
  frequency?: 'daily' | 'weekly' | 'monthly';
  type?: 'counter' | 'boolean' | 'time';
  target?: number;
  unit?: string | null;
};

@Injectable()
export class HabitsService {
  constructor(
    @InjectRepository(Habit)
    private habitRepo: Repository<Habit>,
    @InjectRepository(HabitProgress)
    private progressRepo: Repository<HabitProgress>,
    private events: EventsGateway,
  ) {}

  async getHabits(userId: string) {
    const list = await this.habitRepo.find({
      where: { userId },
      order: { id: 'ASC' },
    });
    return list.map((h) => ({
      id: h.id,
      name: h.name,
      frequency: h.frequency,
      type: h.type,
      target: h.target,
      unit: h.unit ?? undefined,
    }));
  }

  async create(userId: string, dto: CreateHabitDto) {
    const name = (dto.name ?? '').trim();
    if (!name) throw new NotFoundException('Nome do hábito não pode ser vazio.');
    const frequency = dto.frequency ?? 'daily';
    const type = dto.type ?? 'counter';
    const target = Math.max(1, Math.floor(Number(dto.target) || 1));
    const habit = await this.habitRepo.save({
      id: randomUUID(),
      userId,
      name,
      frequency,
      type,
      target,
      unit: dto.unit ?? null,
    });
    this.events.emitToUser(userId, 'data-update', { type: 'habits' });
    return {
      id: habit.id,
      name: habit.name,
      frequency: habit.frequency,
      type: habit.type,
      target: habit.target,
      unit: habit.unit ?? undefined,
    };
  }

  async update(userId: string, id: string, dto: UpdateHabitDto) {
    const habit = await this.habitRepo.findOne({ where: { id, userId } });
    if (!habit) throw new NotFoundException('Hábito não encontrado.');
    if (dto.name !== undefined) habit.name = (dto.name ?? '').trim() || habit.name;
    if (dto.frequency !== undefined) habit.frequency = dto.frequency;
    if (dto.type !== undefined) habit.type = dto.type;
    if (dto.target !== undefined) habit.target = Math.max(1, Math.floor(Number(dto.target) || 1));
    if (dto.unit !== undefined) habit.unit = dto.unit ?? null;
    await this.habitRepo.save(habit);
    this.events.emitToUser(userId, 'data-update', { type: 'habits' });
    return {
      id: habit.id,
      name: habit.name,
      frequency: habit.frequency,
      type: habit.type,
      target: habit.target,
      unit: habit.unit ?? undefined,
    };
  }

  async delete(userId: string, id: string): Promise<void> {
    const result = await this.habitRepo.delete({ id, userId });
    if (result.affected === 0) throw new NotFoundException('Hábito não encontrado.');
    this.events.emitToUser(userId, 'data-update', { type: 'habits' });
  }

  async getProgress(userId: string, periodKey: string) {
    const list = await this.progressRepo.find({
      where: { periodKey },
      relations: ['habit'],
    });
    const habits = await this.habitRepo.find({ where: { userId } });
    const habitIds = new Set(habits.map((h) => h.id));
    const map: Record<string, number> = {};
    list.filter((p) => habitIds.has(p.habitId)).forEach((p) => (map[p.habitId] = p.value));
    return map;
  }

  async setProgress(userId: string, habitId: string, periodKey: string, value: number) {
    const habit = await this.habitRepo.findOne({
      where: { id: habitId, userId },
    });
    if (!habit) {
      throw new NotFoundException(
        'Hábito não encontrado. Rode o seed: npm run seed (dentro de kairo-api).',
      );
    }
    await this.progressRepo.upsert(
      {
        habitId,
        periodKey,
        value,
      },
      { conflictPaths: ['habitId', 'periodKey'] },
    );
    this.events.emitToUser(userId, 'data-update', { type: 'habits' });
    return this.getProgress(userId, periodKey);
  }

  async getDailyProgress(userId: string, date: string) {
    return this.getProgress(userId, date);
  }

  async getWeeklyProgress(userId: string, weekKey: string) {
    return this.getProgress(userId, weekKey);
  }

  async getMonthlyProgress(userId: string, monthKey: string) {
    return this.getProgress(userId, monthKey);
  }

  /** Gera lista de periodKeys para os últimos N dias (YYYY-MM-DD). */
  private getDailyPeriodKeys(count: number): string[] {
    const keys: string[] = [];
    const d = new Date();
    for (let i = count - 1; i >= 0; i--) {
      const date = new Date(d);
      date.setDate(date.getDate() - i);
      keys.push(date.toISOString().slice(0, 10));
    }
    return keys;
  }

  /**
   * Streak no estilo Duolingo: sequência de dias consecutivos (contando de hoje para trás) em que
   * todos os hábitos diários foram cumpridos. Também retorna os 7 dias da semana atual (hoje-6 até hoje)
   * com status completed/isToday para exibir os círculos.
   */
  async getStreak(userId: string): Promise<{
    currentStreak: number;
    weekDays: { date: string; dayOfWeek: number; completed: boolean; isToday: boolean }[];
  }> {
    const dailyHabits = await this.habitRepo.find({
      where: { userId, frequency: 'daily' },
      select: ['id', 'target'],
    });
    const habitIds = dailyHabits.map((h) => h.id);
    const targets = new Map(dailyHabits.map((h) => [h.id, h.target]));

    const dayKeys = this.getDailyPeriodKeys(7);
    if (habitIds.length === 0) {
      const today = new Date().toISOString().slice(0, 10);
      return {
        currentStreak: 0,
        weekDays: dayKeys.map((date, i) => ({
          date,
          dayOfWeek: new Date(date + 'T12:00:00').getDay(),
          completed: false,
          isToday: date === today,
        })),
      };
    }

    const list = await this.progressRepo.find({
      where: { habitId: In(habitIds), periodKey: In(dayKeys) },
    });
    const byDay = new Map<string, Record<string, number>>();
    for (const key of dayKeys) byDay.set(key, {});
    for (const p of list) {
      const m = byDay.get(p.periodKey);
      if (m) m[p.habitId] = p.value;
    }

    const today = new Date().toISOString().slice(0, 10);
    const weekDays = dayKeys.map((date) => {
      const data = byDay.get(date) ?? {};
      // Dia conta se pelo menos um hábito diário estiver completo (atingiu a meta).
      // Ex.: Água 0/3 precisa chegar a 3/3 para contar; boolean 1/1 já conta.
      const completed =
        habitIds.length > 0 &&
        habitIds.some((id) => (data[id] ?? 0) >= (targets.get(id) ?? 1));
      return {
        date,
        dayOfWeek: new Date(date + 'T12:00:00').getDay(),
        completed,
        isToday: date === today,
      };
    });

    let currentStreak = 0;
    for (let i = dayKeys.length - 1; i >= 0; i--) {
      const w = weekDays[i];
      if (!w.completed) break;
      currentStreak++;
    }

    return { currentStreak, weekDays };
  }

  /** Gera lista de periodKeys para as últimas N semanas (YYYY-Www, ISO week). */
  private getWeeklyPeriodKeys(count: number): string[] {
    const getISOWeekKey = (date: Date): string => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + 4 - (d.getDay() || 7));
      const yearStart = new Date(d.getFullYear(), 0, 1);
      const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    };
    const keys: string[] = [];
    const seen = new Set<string>();
    const d = new Date();
    for (let i = 0; i < count * 7; i += 7) {
      const date = new Date(d);
      date.setDate(date.getDate() - i);
      const key = getISOWeekKey(date);
      if (!seen.has(key)) {
        seen.add(key);
        keys.push(key);
        if (keys.length >= count) break;
      }
    }
    return keys.sort();
  }

  /** Gera lista de periodKeys para os últimos N meses (YYYY-MM). */
  private getMonthlyPeriodKeys(count: number): string[] {
    const keys: string[] = [];
    const d = new Date();
    for (let i = count - 1; i >= 0; i--) {
      const date = new Date(d.getFullYear(), d.getMonth() - i, 1);
      keys.push(date.toISOString().slice(0, 7));
    }
    return keys;
  }

  /**
   * Histórico de progresso para vários períodos.
   * frequency: daily | weekly | monthly
   * count: quantos períodos (ex: 30 dias, 12 semanas, 6 meses)
   * Retorna: { periodKey, data: { habitId: value }, label }[]
   */
  async getProgressHistory(userId: string, frequency: 'daily' | 'weekly' | 'monthly', count: number) {
    const keys =
      frequency === 'daily'
        ? this.getDailyPeriodKeys(count)
        : frequency === 'weekly'
          ? this.getWeeklyPeriodKeys(count)
          : this.getMonthlyPeriodKeys(count);

    const habits = await this.habitRepo.find({
      where: { userId, frequency },
      order: { id: 'ASC' },
    });
    const habitIds = habits.map((h) => h.id);
    if (habitIds.length === 0) {
      return keys.map((periodKey) => ({ periodKey, data: {} as Record<string, number>, label: periodKey }));
    }

    const list = await this.progressRepo.find({
      where: { habitId: In(habitIds), periodKey: In(keys) },
    });

    const byPeriod = new Map<string, Record<string, number>>();
    for (const key of keys) {
      byPeriod.set(key, {});
    }
    for (const p of list) {
      const m = byPeriod.get(p.periodKey);
      if (m) m[p.habitId] = p.value;
    }

    return keys.map((periodKey) => ({
      periodKey,
      data: byPeriod.get(periodKey) ?? {},
      label: periodKey,
    }));
  }

  /** Converte periodKey para a primeira data do período (para ordenação). */
  private periodKeyToDate(periodKey: string): Date | null {
    const dailyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(periodKey);
    if (dailyMatch) return new Date(parseInt(dailyMatch[1], 10), parseInt(dailyMatch[2], 10) - 1, parseInt(dailyMatch[3], 10));
    const monthlyMatch = /^(\d{4})-(\d{2})$/.exec(periodKey);
    if (monthlyMatch) return new Date(parseInt(monthlyMatch[1], 10), parseInt(monthlyMatch[2], 10) - 1, 1);
    const weeklyMatch = /^(\d{4})-W(\d{2})$/.exec(periodKey);
    if (weeklyMatch) {
      const year = parseInt(weeklyMatch[1], 10);
      const week = parseInt(weeklyMatch[2], 10);
      const jan4 = new Date(year, 0, 4);
      const thursday = new Date(jan4);
      thursday.setDate(jan4.getDate() + (week - 1) * 7);
      const dayFromMon = (thursday.getDay() + 6) % 7;
      const monday = new Date(thursday);
      monday.setDate(thursday.getDate() - dayFromMon);
      return monday;
    }
    return null;
  }

  /**
   * Retorna a primeira data em que o usuário tem algum registro de progresso.
   * Formato YYYY-MM-DD ou null se não houver dados.
   */
  async getFirstActivityDate(userId: string): Promise<string | null> {
    const habits = await this.habitRepo.find({ where: { userId } });
    const habitIds = habits.map((h) => h.id);
    if (habitIds.length === 0) return null;
    const list = await this.progressRepo.find({
      where: { habitId: In(habitIds) },
      select: ['periodKey'],
    });
    const dates = list.map((p) => this.periodKeyToDate(p.periodKey)).filter((d): d is Date => d != null);
    if (dates.length === 0) return null;
    const min = new Date(Math.min(...dates.map((d) => d.getTime())));
    return min.toISOString().slice(0, 10);
  }

  /** Dias do mês no formato YYYY-MM-DD. month: 1-12. */
  private getDaysInMonth(year: number, month: number): string[] {
    const lastDay = new Date(year, month, 0).getDate();
    const keys: string[] = [];
    const y = String(year);
    const m = String(month).padStart(2, '0');
    for (let d = 1; d <= lastDay; d++) keys.push(`${y}-${m}-${String(d).padStart(2, '0')}`);
    return keys;
  }

  /** Semanas ISO que tocam no mês (pelo menos um dia do mês). */
  private getWeekKeysInMonth(year: number, month: number): string[] {
    const first = new Date(year, month - 1, 1);
    const last = new Date(year, month, 0);
    const getISOWeekKey = (date: Date): string => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + 4 - (d.getDay() || 7));
      const yearStart = new Date(d.getFullYear(), 0, 1);
      const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    };
    const seen = new Set<string>();
    for (let day = new Date(first); day <= last; day.setDate(day.getDate() + 1)) {
      seen.add(getISOWeekKey(new Date(day)));
    }
    return Array.from(seen).sort();
  }

  /**
   * Progresso de um mês: diário (todos os dias), semanal (semanas que tocam o mês), mensal (o mês).
   * month: YYYY-MM
   */
  async getProgressByMonth(userId: string, month: string): Promise<{
    month: string;
    daily: { periodKeys: string[]; data: Record<string, Record<string, number>> };
    weekly: { periodKeys: string[]; data: Record<string, Record<string, number>> };
    monthly: { periodKeys: string[]; data: Record<string, Record<string, number>> };
  }> {
    const [y, m] = month.split('-').map(Number);
    const dailyKeys = this.getDaysInMonth(y, m);
    const weeklyKeys = this.getWeekKeysInMonth(y, m);
    const monthlyKeys = [month];

    const habits = await this.habitRepo.find({ where: { userId }, order: { id: 'ASC' } });
    const dailyHabitIds = habits.filter((h) => h.frequency === 'daily').map((h) => h.id);
    const weeklyHabitIds = habits.filter((h) => h.frequency === 'weekly').map((h) => h.id);
    const monthlyHabitIds = habits.filter((h) => h.frequency === 'monthly').map((h) => h.id);

    const allKeys = [...dailyKeys, ...weeklyKeys, ...monthlyKeys];
    const list = await this.progressRepo.find({
      where: { habitId: In(habits.map((h) => h.id)), periodKey: In(allKeys) },
    });

    const byPeriod = new Map<string, Record<string, number>>();
    for (const key of allKeys) byPeriod.set(key, {});
    for (const p of list) {
      const map = byPeriod.get(p.periodKey);
      if (map) map[p.habitId] = p.value;
    }

    const dailyData: Record<string, Record<string, number>> = {};
    dailyKeys.forEach((k) => (dailyData[k] = byPeriod.get(k) ?? {}));
    const weeklyData: Record<string, Record<string, number>> = {};
    weeklyKeys.forEach((k) => (weeklyData[k] = byPeriod.get(k) ?? {}));
    const monthlyData: Record<string, Record<string, number>> = {};
    monthlyKeys.forEach((k) => (monthlyData[k] = byPeriod.get(k) ?? {}));

    return {
      month,
      daily: { periodKeys: dailyKeys, data: dailyData },
      weekly: { periodKeys: weeklyKeys, data: weeklyData },
      monthly: { periodKeys: monthlyKeys, data: monthlyData },
    };
  }

  /**
   * Resumo por mês: de 'from' até 'to' (YYYY-MM), com % de completude diária, semanal e mensal em cada mês.
   */
  async getSummaryByMonths(userId: string, from: string, to: string): Promise<
    { month: string; dailyPct: number; weeklyPct: number; monthlyPct: number }[]
  > {
    const habits = await this.habitRepo.find({ where: { userId } });
    const dailyHabits = habits.filter((h) => h.frequency === 'daily');
    const weeklyHabits = habits.filter((h) => h.frequency === 'weekly');
    const monthlyHabits = habits.filter((h) => h.frequency === 'monthly');

    const months: string[] = [];
    let [y, m] = from.split('-').map(Number);
    const [endY, endM] = to.split('-').map(Number);
    while (y < endY || (y === endY && m <= endM)) {
      months.push(`${y}-${String(m).padStart(2, '0')}`);
      if (m === 12) {
        m = 1;
        y++;
      } else m++;
    }

    const result: { month: string; dailyPct: number; weeklyPct: number; monthlyPct: number }[] = [];

    for (const month of months) {
      const byMonth = await this.getProgressByMonth(userId, month);
      const dailyPct = this.avgCompletude(dailyHabits, byMonth.daily.periodKeys, byMonth.daily.data);
      const weeklyPct = this.avgCompletude(weeklyHabits, byMonth.weekly.periodKeys, byMonth.weekly.data);
      const monthlyPct = this.avgCompletude(monthlyHabits, byMonth.monthly.periodKeys, byMonth.monthly.data);
      result.push({ month, dailyPct, weeklyPct, monthlyPct });
    }
    return result;
  }

  private avgCompletude(
    habits: { id: string; target: number }[],
    periodKeys: string[],
    data: Record<string, Record<string, number>>,
  ): number {
    if (habits.length === 0 || periodKeys.length === 0) return 0;
    let sum = 0;
    for (const key of periodKeys) {
      let totalTarget = 0;
      let totalValue = 0;
      for (const h of habits) {
        totalTarget += h.target;
        totalValue += Math.min(data[key]?.[h.id] ?? 0, h.target);
      }
      if (totalTarget > 0) sum += (totalValue / totalTarget) * 100;
    }
    return Math.round(sum / periodKeys.length);
  }
}
