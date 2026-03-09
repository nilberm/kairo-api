import { randomUUID } from 'crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Not, Repository } from 'typeorm';
import { TodoItem } from '../entities';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class TodosService {
  constructor(
    @InjectRepository(TodoItem)
    private repo: Repository<TodoItem>,
    private events: EventsGateway,
  ) {}

  /** Lista itens de um dia: não completos primeiro, depois completos (por completedAt desc). */
  async listByDate(userId: string, date: string): Promise<
    { id: string; title: string; date: string; completedAt: string | null; createdAt: string }[]
  > {
    const list = await this.repo.find({
      where: { userId, date },
      order: { completedAt: 'ASC', createdAt: 'ASC' },
    });
    const incomplete = list.filter((t) => !t.completedAt);
    const complete = list.filter((t) => t.completedAt).sort((a, b) => (b.completedAt!.getTime() - a.completedAt!.getTime()));
    return [...incomplete, ...complete].map((t) => ({
      id: t.id,
      title: t.title,
      date: t.date,
      completedAt: t.completedAt ? t.completedAt.toISOString() : null,
      createdAt: t.createdAt.toISOString(),
    }));
  }

  /** Itens não concluídos de dias anteriores que ainda aparecem nas sugestões. */
  async listIncompletePast(userId: string, today: string): Promise<
    { id: string; title: string; date: string }[]
  > {
    const list = await this.repo.find({
      where: {
        userId,
        date: LessThan(today),
        completedAt: IsNull(),
        hiddenFromSuggestions: false,
      },
      order: { date: 'ASC', createdAt: 'ASC' },
    });
    return list.map((t) => ({ id: t.id, title: t.title, date: t.date }));
  }

  async setHiddenFromSuggestions(userId: string, id: string, hidden: boolean): Promise<void> {
    const item = await this.repo.findOne({ where: { id, userId } });
    if (!item) throw new NotFoundException('Item não encontrado.');
    item.hiddenFromSuggestions = hidden;
    await this.repo.save(item);
    this.events.emitToUser(userId, 'data-update', { type: 'todos' });
  }

  async create(userId: string, title: string, date: string): Promise<{ id: string; title: string; date: string; completedAt: null; createdAt: string }> {
    const trimmed = title.trim();
    if (!trimmed) throw new NotFoundException('Título não pode ser vazio.');
    const item = await this.repo.save({
      id: randomUUID(),
      userId,
      title: trimmed,
      date,
      completedAt: null,
    });
    this.events.emitToUser(userId, 'data-update', { type: 'todos' });
    return {
      id: item.id,
      title: item.title,
      date: item.date,
      completedAt: null,
      createdAt: item.createdAt.toISOString(),
    };
  }

  async setComplete(userId: string, id: string, completed: boolean): Promise<{ id: string; completedAt: string | null }> {
    const item = await this.repo.findOne({ where: { id, userId } });
    if (!item) throw new NotFoundException('Item não encontrado.');
    item.completedAt = completed ? new Date() : null;
    await this.repo.save(item);
    this.events.emitToUser(userId, 'data-update', { type: 'todos' });
    return { id: item.id, completedAt: item.completedAt ? item.completedAt.toISOString() : null };
  }

  async delete(userId: string, id: string): Promise<void> {
    const result = await this.repo.delete({ id, userId });
    if (result.affected === 0) throw new NotFoundException('Item não encontrado.');
    this.events.emitToUser(userId, 'data-update', { type: 'todos' });
  }

  /** Histórico de itens completos (completedAt preenchido), ordenado por completedAt desc. */
  async getHistory(userId: string, limit = 100): Promise<
    { id: string; title: string; date: string; completedAt: string; createdAt: string }[]
  > {
    const list = await this.repo.find({
      where: { userId, completedAt: Not(IsNull()) },
      order: { completedAt: 'DESC' },
      take: limit,
    });
    const completed = list as (TodoItem & { completedAt: Date })[];
    return completed.map((t) => ({
      id: t.id,
      title: t.title,
      date: t.date,
      completedAt: t.completedAt.toISOString(),
      createdAt: t.createdAt.toISOString(),
    }));
  }
}
