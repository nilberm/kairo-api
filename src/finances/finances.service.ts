import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  Transaction,
  TransactionGroup,
  UserFinanceSettings,
} from '../entities';
import type { TransactionGroupKind, TransactionGroupStatus } from '../entities/transaction-group.entity';
import type { CreateTransactionDto } from './dto/create-transaction.dto';

/** Um dia na projeção: entrada, saída, diário, saldo acumulado. */
export interface ProjectionDayDto {
  date: string; // YYYY-MM-DD
  dayLabel: string; // ex: "01 SEX"
  entrada: number;
  saida: number;
  diario: number;
  saldo: number;
}

/** Um mês na projeção: lista de dias. */
export interface ProjectionMonthDto {
  year: number;
  month: number;
  label: string; // ex: "Março 2025"
  days: ProjectionDayDto[];
}

/** Resposta do GET /finances/projection. */
export interface ProjectionResponseDto {
  balanceAsOfDate: string;
  initialBalance: number;
  months: ProjectionMonthDto[];
}

/** Alerta de recorrência prestes a acabar. */
export interface RenewalAlertDto {
  transactionGroupId: string;
  description: string;
  recurrenceEndDate: string;
  type: 'INCOME' | 'EXPENSE';
  /** Mensagem para a UI. */
  message: string;
}

const RECURRING_MONTHS = 24;
const RENEWAL_ALERT_DAYS = 30;

@Injectable()
export class FinancesService {
  constructor(
    @InjectRepository(Transaction)
    private txRepo: Repository<Transaction>,
    @InjectRepository(TransactionGroup)
    private groupRepo: Repository<TransactionGroup>,
    @InjectRepository(UserFinanceSettings)
    private settingsRepo: Repository<UserFinanceSettings>,
    private dataSource: DataSource,
  ) {}

  /**
   * Cria um ou mais lançamentos conforme o DTO.
   * - unique: 1 registro.
   * - installment: N registros (mesmo dia nos meses seguintes), 1 grupo kind=installment.
   * - recurring: 24 registros (mesmo dia nos 24 meses seguintes), 1 grupo kind=recurring com recurrenceEndDate e status=active.
   * Tudo em transação: se falhar uma inserção, faz rollback.
   */
  async create(userId: string, dto: CreateTransactionDto): Promise<{ transactionIds: string[] }> {
    if (dto.kind === 'unique') {
      const tx = await this.txRepo.save({
        userId,
        description: dto.description,
        amount: String(dto.amount),
        date: dto.date,
        type: dto.type,
        categoryId: dto.categoryId ?? null,
        transactionGroupId: null,
        installmentInfo: null,
      });
      return { transactionIds: [tx.id] };
    }

    if (dto.kind === 'installment') {
      return this.createInstallment(userId, dto);
    }

    if (dto.kind === 'recurring') {
      return this.createRecurring(userId, dto);
    }

    throw new Error(`Unsupported kind: ${(dto as any).kind}`);
  }

  /** Cria grupo + N parcelas. Se startInstallment > 1, gera só da parcela startInstallment até N. */
  private async createInstallment(userId: string, dto: CreateTransactionDto): Promise<{ transactionIds: string[] }> {
    const n = Math.max(2, Math.min(120, dto.installments ?? 2));
    const startParcel = Math.max(1, Math.min(n, dto.startInstallment ?? 1));
    const count = n - startParcel + 1; // quantas parcelas gerar (ex.: start 2 de 5 → 4 parcelas)
    const totalAmount = dto.totalAmount ? dto.amount : dto.amount * n;
    const installmentValue = totalAmount / n;
    const amount = dto.type === 'EXPENSE' ? -Math.abs(installmentValue) : Math.abs(installmentValue);

    return this.dataSource.transaction(async (manager) => {
      const group = await manager.save(TransactionGroup, {
        userId,
        kind: 'installment' as TransactionGroupKind,
        recurrenceEndDate: null,
        status: 'active' as TransactionGroupStatus,
      });

      const start = new Date(dto.date);
      const ids: string[] = [];
      for (let i = 0; i < count; i++) {
        const parcelIndex = startParcel + i; // 1-based (ex.: 2, 3, 4, 5)
        const monthsOffset = (startParcel - 1) + i;
        const d = new Date(start.getFullYear(), start.getMonth() + monthsOffset, start.getDate());
        const dateStr = d.toISOString().slice(0, 10);
        const tx = await manager.save(Transaction, {
          userId,
          description: dto.description,
          amount: String(amount),
          date: dateStr,
          type: dto.type,
          categoryId: dto.categoryId ?? null,
          transactionGroupId: group.id,
          installmentInfo: `${parcelIndex}/${n}`,
        });
        ids.push(tx.id);
      }
      return { transactionIds: ids };
    });
  }

  /**
   * Cria grupo recurring + 24 registros (um por mês), transacional.
   * recurrenceEndDate do grupo = data do último registro gerado.
   */
  private async createRecurring(userId: string, dto: CreateTransactionDto): Promise<{ transactionIds: string[] }> {
    const amount = dto.type === 'EXPENSE' ? -Math.abs(dto.amount) : Math.abs(dto.amount);
    const start = new Date(dto.date);
    const endDate = dto.recurringEndDate
      ? new Date(dto.recurringEndDate)
      : new Date(start.getFullYear(), start.getMonth() + RECURRING_MONTHS, start.getDate());

    return this.dataSource.transaction(async (manager) => {
      const lastDate = new Date(
        Math.min(
          endDate.getTime(),
          new Date(start.getFullYear(), start.getMonth() + RECURRING_MONTHS, start.getDate()).getTime(),
        ),
      );
      const recurrenceEndDate = lastDate.toISOString().slice(0, 10);

      const group = await manager.save(TransactionGroup, {
        userId,
        kind: 'recurring' as TransactionGroupKind,
        recurrenceEndDate,
        status: 'active' as TransactionGroupStatus,
      });

      const ids: string[] = [];
      let d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      while (d <= lastDate) {
        const dateStr = d.toISOString().slice(0, 10);
        const tx = await manager.save(Transaction, {
          userId,
          description: dto.description,
          amount: String(amount),
          date: dateStr,
          type: dto.type,
          categoryId: dto.categoryId ?? null,
          transactionGroupId: group.id,
          installmentInfo: null,
        });
        ids.push(tx.id);
        d.setMonth(d.getMonth() + 1);
      }
      await manager.update(TransactionGroup, { id: group.id }, { recurrenceEndDate });
      return { transactionIds: ids };
    });
  }

  /**
   * Retorna a projeção para o frontend: meses com dias (entrada, saída, diário, saldo).
   * Usa user_finance_settings.balance + balanceAsOfDate e aplica transações a partir dessa data.
   */
  async getProjection(userId: string, months: number = 12): Promise<ProjectionResponseDto> {
    const settings = await this.settingsRepo.findOne({ where: { userId } });
    const asOf = settings?.balanceAsOfDate ?? new Date().toISOString().slice(0, 10);
    let runningBalance = Number(settings?.balance ?? 0);

    const start = new Date(asOf);
    const end = new Date(start.getFullYear(), start.getMonth() + months, 31);

    const transactions = await this.txRepo.find({
      where: { userId },
      order: { date: 'ASC' },
    });

    const byDate = new Map<string, { entrada: number; saida: number }>();
    for (const t of transactions) {
      const d = t.date;
      if (d < asOf) continue;
      const num = Number(t.amount);
      const entry = byDate.get(d) ?? { entrada: 0, saida: 0 };
      if (num > 0) entry.entrada += num;
      else entry.saida += Math.abs(num);
      byDate.set(d, entry);
    }

    const monthsOut: ProjectionMonthDto[] = [];
    const weekdays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
    let cur = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cur <= end && monthsOut.length < months) {
      const year = cur.getFullYear();
      const month = cur.getMonth();
      const monthLabel = cur.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const days: ProjectionDayDto[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const { entrada = 0, saida = 0 } = byDate.get(dateStr) ?? {};
        const diario = entrada - saida;
        if (dateStr >= asOf) runningBalance += diario;
        const d = new Date(year, month, day);
        const dayLabel = `${String(day).padStart(2, '0')} ${weekdays[d.getDay()]}`;
        days.push({
          date: dateStr,
          dayLabel,
          entrada,
          saida,
          diario,
          saldo: runningBalance,
        });
      }
      monthsOut.push({ year, month: month + 1, label: monthLabel, days });
      cur.setMonth(cur.getMonth() + 1);
    }

    return {
      balanceAsOfDate: asOf,
      initialBalance: Number(settings?.balance ?? 0),
      months: monthsOut,
    };
  }

  /**
   * Alertas de renovação: grupos recurring com status active e recurrenceEndDate
   * dentro dos próximos 30 dias ou no mês atual.
   */
  async getRenewalAlerts(userId: string): Promise<RenewalAlertDto[]> {
    const today = new Date();
    const in30 = new Date(today);
    in30.setDate(in30.getDate() + RENEWAL_ALERT_DAYS);
    const todayStr = today.toISOString().slice(0, 10);
    const in30Str = in30.toISOString().slice(0, 10);

    const groups = await this.groupRepo.find({
      where: { userId, kind: 'recurring', status: 'active' },
      relations: ['transactions'],
    });

    const alerts: RenewalAlertDto[] = [];
    for (const g of groups) {
      const end = g.recurrenceEndDate;
      if (!end || end > in30Str) continue;
      const first = g.transactions?.[0];
      const description = first?.description ?? 'Recorrência';
      const type = (first?.type ?? 'EXPENSE') as 'INCOME' | 'EXPENSE';
      alerts.push({
        transactionGroupId: g.id,
        description,
        recurrenceEndDate: end,
        type,
        message: `A sua recorrência de "${description}" está prestes a encerrar as projeções (até ${end}). Você ainda possui este gasto/receita?`,
      });
    }
    return alerts;
  }

  /** Renovar recorrência: gera mais 24 meses a partir de recurrenceEndDate + 1 mês. */
  async renewRecurring(userId: string, transactionGroupId: string): Promise<{ transactionIds: string[] }> {
    const group = await this.groupRepo.findOne({
      where: { id: transactionGroupId, userId, kind: 'recurring', status: 'active' },
      relations: ['transactions'],
    });
    if (!group?.recurrenceEndDate) throw new Error('Grupo não encontrado ou sem data fim.');
    const first = group.transactions?.[0];
    if (!first) throw new Error('Nenhuma transação no grupo.');

    const amount = Number(first.amount);
    const last = new Date(group.recurrenceEndDate);
    const start = new Date(last.getFullYear(), last.getMonth() + 1, last.getDate());
    const end = new Date(start.getFullYear(), start.getMonth() + RECURRING_MONTHS, start.getDate());
    const newRecurrenceEndDate = end.toISOString().slice(0, 10);

    return this.dataSource.transaction(async (manager) => {
      await manager.update(TransactionGroup, { id: group.id }, { recurrenceEndDate: newRecurrenceEndDate });
      const ids: string[] = [];
      let d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      while (d <= end) {
        const dateStr = d.toISOString().slice(0, 10);
        const tx = await manager.save(Transaction, {
          userId,
          description: first.description,
          amount: first.amount,
          date: dateStr,
          type: first.type,
          categoryId: first.categoryId,
          transactionGroupId: group.id,
          installmentInfo: null,
        });
        ids.push(tx.id);
        d.setMonth(d.getMonth() + 1);
      }
      return { transactionIds: ids };
    });
  }

  /** Encerrar recorrência: marca grupo como ended (não gera mais). */
  async endRecurring(userId: string, transactionGroupId: string): Promise<void> {
    await this.groupRepo.update(
      { id: transactionGroupId, userId, kind: 'recurring' },
      { status: 'ended' as TransactionGroupStatus },
    );
  }

  /**
   * Edição de exceção: alterar apenas esta ocorrência ou esta e as próximas.
   * - onlyThis: atualiza só o transaction com a data informada.
   * - thisAndFuture: atualiza todos os registros do grupo com date >= fromDate.
   */
  async updateGroupFromDate(
    userId: string,
    transactionGroupId: string,
    fromDate: string,
    payload: { amount?: number; description?: string },
    onlyThis: boolean,
  ): Promise<void> {
    if (onlyThis) {
      const tx = await this.txRepo.findOne({
        where: { userId, transactionGroupId, date: fromDate },
      });
      if (!tx) return;
      const updates: Partial<Transaction> = {};
      if (payload.amount != null) updates.amount = String(payload.amount);
      if (payload.description != null) updates.description = payload.description;
      if (Object.keys(updates).length) await this.txRepo.update(tx.id, updates);
      return;
    }
    const updates: Partial<Transaction> = {};
    if (payload.amount != null) updates.amount = String(payload.amount);
    if (payload.description != null) updates.description = payload.description;
    if (Object.keys(updates).length === 0) return;
    await this.txRepo
      .createQueryBuilder()
      .update(Transaction)
      .set(updates)
      .where('userId = :userId', { userId })
      .andWhere('transactionGroupId = :groupId', { transactionGroupId })
      .andWhere('date >= :fromDate', { fromDate })
      .execute();
  }

  /** Atualiza saldo de referência do usuário (para projeção). */
  async setBalance(userId: string, balance: number, asOfDate: string): Promise<void> {
    await this.settingsRepo.upsert(
      { userId, balance: String(balance), balanceAsOfDate: asOfDate },
      { conflictPaths: ['userId'] },
    );
  }
}
