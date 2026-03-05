import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  VisionGoal,
  VisionGoalTransaction,
  VisionValueEntry,
  MediumTermGoal,
  ShortTermGoal,
} from '../entities';

@Injectable()
export class GoalsService {
  constructor(
    @InjectRepository(VisionGoal)
    private visionRepo: Repository<VisionGoal>,
    @InjectRepository(VisionGoalTransaction)
    private visionTxRepo: Repository<VisionGoalTransaction>,
    @InjectRepository(VisionValueEntry)
    private visionEntryRepo: Repository<VisionValueEntry>,
    @InjectRepository(MediumTermGoal)
    private mediumRepo: Repository<MediumTermGoal>,
    @InjectRepository(ShortTermGoal)
    private shortRepo: Repository<ShortTermGoal>,
  ) {}

  // ---------- Vision Goals ----------
  async getVisionGoals(userId: string) {
    const list = await this.visionRepo.find({
      where: { userId },
      order: { id: 'ASC' },
      relations: ['transactions', 'valueHistory'],
    });
    return list.map((g) => ({
      id: g.id,
      title: g.title,
      subtitle: g.subtitle ?? undefined,
      currentValue: Number(g.currentValue),
      targetValue: Number(g.targetValue),
      unit: g.unit ?? undefined,
      deadline: g.deadline,
      status: g.status,
      transactions: (g.transactions ?? []).map((t) => ({
        date: t.date,
        type: t.type,
        value: Number(t.value),
      })),
      valueHistory: (g.valueHistory ?? []).map((e) => ({
        date: e.date,
        value: Number(e.value),
      })),
    }));
  }

  async updateVisionGoalCurrentValue(userId: string, id: string, currentValue: number) {
    await this.visionRepo.update(
      { id, userId },
      { currentValue } as any,
    );
    return this.getVisionGoals(userId).then((list) => list.find((g) => g.id === id));
  }

  async addVisionTransaction(userId: string, goalId: string, type: 'aporte' | 'retirada', value: number) {
    const goal = await this.visionRepo.findOne({ where: { id: goalId, userId } });
    if (!goal) return null;
    const current = Number(goal.currentValue);
    const next = type === 'aporte' ? current + value : Math.max(0, current - value);
    await this.visionTxRepo.insert({
      visionGoalId: goalId,
      date: new Date().toISOString().slice(0, 10),
      type,
      value,
    } as any);
    await this.visionRepo.update(
      { id: goalId, userId },
      { currentValue: next } as any,
    );
    return this.getVisionGoals(userId).then((list) => list.find((g) => g.id === goalId));
  }

  async addVisionValueEntry(userId: string, goalId: string, value: number) {
    const goal = await this.visionRepo.findOne({ where: { id: goalId, userId } });
    if (!goal) return null;
    await this.visionEntryRepo.insert({
      visionGoalId: goalId,
      date: new Date().toISOString().slice(0, 10),
      value,
    } as any);
    await this.visionRepo.update(
      { id: goalId, userId },
      { currentValue: value } as any,
    );
    return this.getVisionGoals(userId).then((list) => list.find((g) => g.id === goalId));
  }

  async setVisionBoolean(userId: string, goalId: string, value: 0 | 1) {
    await this.visionRepo.update(
      { id: goalId, userId },
      { currentValue: value } as any,
    );
    return this.getVisionGoals(userId).then((list) => list.find((g) => g.id === goalId));
  }

  // ---------- Medium Goals ----------
  async getMediumGoals(userId: string) {
    const list = await this.mediumRepo.find({
      where: { userId },
      order: { id: 'ASC' },
    });
    return list.map((g) => ({
      id: g.id,
      title: g.title,
      subtitle: g.subtitle ?? undefined,
      costOrValue: Number(g.costOrValue),
      currency: g.currency ?? undefined,
      deadline: g.deadline,
      isCompleted: g.isCompleted,
    }));
  }

  async setMediumGoalCompleted(userId: string, id: string, isCompleted: boolean) {
    await this.mediumRepo.update({ id, userId }, { isCompleted });
    return this.getMediumGoals(userId).then((list) => list.find((g) => g.id === id));
  }

  // ---------- Short Term Goals ----------
  async getShortTermGoals(userId: string) {
    const list = await this.shortRepo.find({
      where: { userId },
      order: { id: 'ASC' },
    });
    return list.map((g) => ({
      id: g.id,
      title: g.title,
      subtitle: g.subtitle,
      targetMonths: g.targetMonths ?? undefined,
      isCompleted: g.isCompleted,
    }));
  }
}
