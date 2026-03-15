import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  Transaction,
  TransactionGroup,
  UserFinanceSettings,
  Vault,
  VaultMovement,
} from '../entities';
import type { TransactionGroupKind, TransactionGroupStatus } from '../entities/transaction-group.entity';
import type { CreateTransactionDto } from './dto/create-transaction.dto';
import { VaultDto, UpsertVaultDto } from './dto/vault.dto';

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
  /** Média de gastos variáveis no mês atual até hoje (total gasto / dias já passados). */
  currentAverageSpend: number;
  /** Quanto ainda pode gastar hoje de forma segura: (orçamento mês - já gasto) / dias restantes no mês. */
  safeToSpendToday: number;
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

/** Transação para listagem por dia (detalhes do dia). */
export interface TransactionByDateDto {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: 'INCOME' | 'EXPENSE';
  categoryId: string | null;
  installmentInfo: string | null;
  /** UUID do grupo (parcelado/recorrente) ou null se lançamento único. */
  transactionGroupId: string | null;
  /** 'unique' | 'installment' | 'recurring' — para decidir "excluir só este" vs "excluir este e futuros". */
  kind: 'unique' | 'installment' | 'recurring';
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
    @InjectRepository(Vault)
    private vaultRepo: Repository<Vault>,
    @InjectRepository(VaultMovement)
    private movementRepo: Repository<VaultMovement>,
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
   * Transações de um dia (para exibir no modal de detalhes do dia).
   * Inclui transactionGroupId e kind para permitir "excluir só este" vs "excluir este e futuros".
   */
  async getTransactionsByDate(userId: string, date: string): Promise<TransactionByDateDto[]> {
    const list = await this.txRepo.find({
      where: { userId, date },
      relations: ['transactionGroup'],
      order: { createdAt: 'ASC' },
    });
    return list.map((t) => ({
      id: t.id,
      description: t.description,
      amount: Number(t.amount),
      date: t.date,
      type: t.type,
      categoryId: t.categoryId ?? null,
      installmentInfo: t.installmentInfo,
      transactionGroupId: t.transactionGroupId ?? null,
      kind: t.transactionGroup ? (t.transactionGroup.kind as 'installment' | 'recurring') : 'unique',
    }));
  }

  /**
   * Retorna a projeção para o frontend: meses com dias (entrada, saída, diário, saldo).
   * Saldo de cada dia = saldo inicial + soma dos diários do início até esse dia.
   * Projeção híbrida: no passado usa só transações reais; em hoje/futuro usa transações reais + dailyBudget.
   */
  async getProjection(userId: string, months: number = 12): Promise<ProjectionResponseDto> {
    const settings = await this.settingsRepo.findOne({ where: { userId } });
    const asOf = settings?.balanceAsOfDate ?? new Date().toISOString().slice(0, 10);
    const initialBalance = Number(settings?.balance ?? 0);
    const dailyBudget = Number(settings?.dailyBudget ?? 0);
    const monthlyVariableBudget = settings?.monthlyVariableBudget != null ? Number(settings.monthlyVariableBudget) : null;

    // Hoje no fuso do servidor (YYYY-MM-DD) para comparar datas
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const start = new Date(asOf);
    const end = new Date(start.getFullYear(), start.getMonth() + months, 31);
    const firstDayStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`;

    const transactions = await this.txRepo.find({
      where: { userId },
      order: { date: 'ASC' },
    });

    const byDate = new Map<string, { entrada: number; saida: number }>();
    for (const t of transactions) {
      const d = t.date;
      if (d < firstDayStr) continue;
      const num = Number(t.amount);
      const entry = byDate.get(d) ?? { entrada: 0, saida: 0 };
      if (num > 0) entry.entrada += num;
      else entry.saida += Math.abs(num);
      byDate.set(d, entry);
    }

    const monthsOut: ProjectionMonthDto[] = [];
    const weekdays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
    let cur = new Date(start.getFullYear(), start.getMonth(), 1);
    const allDays: { dateStr: string; entrada: number; saida: number; diario: number }[] = [];

    // Monta cada dia: passado = só real; hoje/futuro = real + dailyBudget (projeção)
    while (cur <= end && monthsOut.length < months) {
      const year = cur.getFullYear();
      const month = cur.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const { entrada = 0, saida: saidaReal = 0 } = byDate.get(dateStr) ?? {};
        const saidaProj = dateStr < todayStr ? saidaReal : saidaReal + dailyBudget;
        const diario = entrada - saidaProj;
        allDays.push({ dateStr, entrada, saida: saidaProj, diario });
      }
      cur.setMonth(cur.getMonth() + 1);
    }

    const saldoByDate = new Map<string, number>();
    let runningBalance = initialBalance;
    for (const { dateStr, diario } of allDays) {
      runningBalance += diario;
      saldoByDate.set(dateStr, runningBalance);
    }

    // KPIs do mês atual (mês de hoje)
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth() + 1;
    const dayOfMonth = now.getDate();
    const daysInCurrentMonth = new Date(todayYear, todayMonth, 0).getDate();
    const currentMonthPrefix = `${todayYear}-${String(todayMonth).padStart(2, '0')}-`;
    let totalRealSpentCurrentMonth = 0;
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const dateStr = `${currentMonthPrefix}${String(day).padStart(2, '0')}`;
      const entry = byDate.get(dateStr);
      if (entry) totalRealSpentCurrentMonth += entry.saida;
    }
    const daysPassed = dayOfMonth;
    const daysRemaining = Math.max(0, daysInCurrentMonth - dayOfMonth + 1);
    const monthlyBudget =
      monthlyVariableBudget ?? dailyBudget * daysInCurrentMonth;
    const currentAverageSpend = daysPassed > 0 ? totalRealSpentCurrentMonth / daysPassed : 0;
    const safeToSpendToday =
      daysRemaining > 0 ? (monthlyBudget - totalRealSpentCurrentMonth) / daysRemaining : 0;

    cur = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cur <= end && monthsOut.length < months) {
      const year = cur.getFullYear();
      const month = cur.getMonth();
      const monthLabel = cur.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const days: ProjectionDayDto[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayData = allDays.find((x) => x.dateStr === dateStr);
        const entrada = dayData?.entrada ?? 0;
        const saida = dayData?.saida ?? 0;
        const diario = dayData?.diario ?? 0;
        const saldo = saldoByDate.get(dateStr) ?? initialBalance;
        const d = new Date(year, month, day);
        const dayLabel = `${String(day).padStart(2, '0')} ${weekdays[d.getDay()]}`;
        days.push({
          date: dateStr,
          dayLabel,
          entrada,
          saida,
          diario,
          saldo,
        });
      }
      monthsOut.push({ year, month: month + 1, label: monthLabel, days });
      cur.setMonth(cur.getMonth() + 1);
    }

    return {
      balanceAsOfDate: asOf,
      initialBalance,
      months: monthsOut,
      currentAverageSpend,
      safeToSpendToday,
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

  /**
   * Exclui transação(ões).
   * - scope = 'this': exclui apenas esta transação (única ou uma ocorrência de parcelado/recorrente).
   * - scope = 'future': exclui esta transação e todas as futuras do mesmo grupo (só para installment/recurring).
   */
  async deleteTransaction(
    userId: string,
    transactionId: string,
    scope: 'this' | 'future',
  ): Promise<void> {
    const tx = await this.txRepo.findOne({
      where: { id: transactionId, userId },
      relations: ['transactionGroup'],
    });
    if (!tx) return;

    if (scope === 'this') {
      await this.txRepo.delete({ id: transactionId, userId });
      return;
    }

    const groupId = tx.transactionGroupId;
    if (!groupId) {
      await this.txRepo.delete({ id: transactionId, userId });
      return;
    }

    await this.dataSource.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .delete()
        .from(Transaction)
        .where('userId = :userId', { userId })
        .andWhere('transactionGroupId = :groupId', { groupId })
        .andWhere('date >= :fromDate', { fromDate: tx.date })
        .execute();

      const group = tx.transactionGroup;
      if (group?.kind === 'recurring' && group.recurrenceEndDate) {
        const dayBefore = new Date(tx.date);
        dayBefore.setDate(dayBefore.getDate() - 1);
        const newEnd = dayBefore.toISOString().slice(0, 10);
        if (newEnd < group.recurrenceEndDate) {
          await manager.update(TransactionGroup, { id: groupId }, { recurrenceEndDate: newEnd });
        }
      }
    });
  }

  /**
   * Atualiza uma transação (PATCH /finances/transactions/:id).
   * Para parcelada/recorrente: onlyThis = só esta ocorrência; senão esta e as futuras.
   */
  async updateTransaction(
    userId: string,
    transactionId: string,
    payload: { description?: string; amount?: number; date?: string; type?: Transaction['type']; categoryId?: string | null; onlyThis?: boolean },
  ): Promise<void> {
    const tx = await this.txRepo.findOne({
      where: { id: transactionId, userId },
      relations: ['transactionGroup'],
    });
    if (!tx) return;
    const onlyThis = payload.onlyThis ?? true;
    const updates: Partial<Transaction> = {};
    if (payload.description != null) updates.description = payload.description;
    if (payload.amount != null) updates.amount = String(payload.amount);
    if (payload.date != null) updates.date = payload.date;
    if (payload.type != null) updates.type = payload.type;
    if (payload.categoryId !== undefined) updates.categoryId = payload.categoryId;
    if (Object.keys(updates).length === 0) return;

    if (!tx.transactionGroupId || onlyThis) {
      await this.txRepo.update({ id: transactionId, userId }, updates);
      return;
    }
    if (payload.amount != null || payload.description != null) {
      await this.updateGroupFromDate(
        userId,
        tx.transactionGroupId,
        tx.date,
        { amount: payload.amount, description: payload.description },
        false,
      );
    }
    const bulkUpdates: Partial<Transaction> = {};
    if (payload.date != null) bulkUpdates.date = payload.date;
    if (payload.type != null) bulkUpdates.type = payload.type;
    if (payload.categoryId !== undefined) bulkUpdates.categoryId = payload.categoryId;
    if (Object.keys(bulkUpdates).length > 0) {
      await this.txRepo
        .createQueryBuilder()
        .update(Transaction)
        .set(bulkUpdates)
        .where('userId = :userId', { userId })
        .andWhere('transactionGroupId = :groupId', { groupId: tx.transactionGroupId })
        .andWhere('date >= :fromDate', { fromDate: tx.date })
        .execute();
    }
  }

  /** Atualiza saldo de referência do usuário (para projeção). */
  async setBalance(userId: string, balance: number, asOfDate: string): Promise<void> {
    await this.settingsRepo.upsert(
      { userId, balance: String(balance), balanceAsOfDate: asOfDate },
      { conflictPaths: ['userId'] },
    );
  }

  /** Atualiza orçamento diário e/ou mensal para gastos variáveis (projeção híbrida). undefined = não alterar. */
  async setDailyBudget(
    userId: string,
    dailyBudget: number | null | undefined,
    monthlyVariableBudget: number | null | undefined,
  ): Promise<void> {
    const existing = await this.settingsRepo.findOne({ where: { userId } });
    if (existing) {
      if (dailyBudget !== undefined) existing.dailyBudget = dailyBudget != null ? String(dailyBudget) : null;
      if (monthlyVariableBudget !== undefined)
        existing.monthlyVariableBudget = monthlyVariableBudget != null ? String(monthlyVariableBudget) : null;
      await this.settingsRepo.save(existing);
      return;
    }
    if (dailyBudget === undefined && monthlyVariableBudget === undefined) return;
    await this.settingsRepo.save(
      this.settingsRepo.create({
        userId,
        balance: '0',
        balanceAsOfDate: new Date().toISOString().slice(0, 10),
        dailyBudget: dailyBudget != null ? String(dailyBudget) : null,
        monthlyVariableBudget: monthlyVariableBudget != null ? String(monthlyVariableBudget) : null,
      }),
    );
  }

  // Cofres (vaults)

  async listVaults(userId: string): Promise<VaultDto[]> {
    const list = await this.vaultRepo.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
    return list.map((v) => ({
      id: v.id,
      name: v.name,
      balance: Number(v.balance),
      categoryId: v.categoryId,
      goalAmount: Number(v.goalAmount),
      institution: v.institution,
      yieldLabel: v.yieldLabel,
      targetDate: v.targetDate,
    }));
  }

  async upsertVault(userId: string, id: string | null, dto: UpsertVaultDto): Promise<VaultDto> {
    const payload: Partial<Vault> = {
      userId,
      name: dto.name.trim(),
      balance: String(dto.balance ?? 0),
      categoryId: dto.categoryId ?? null,
      goalAmount: String(dto.goalAmount ?? 0),
      institution: dto.institution?.trim() || null,
      yieldLabel: dto.yieldLabel?.trim() || null,
      targetDate: dto.targetDate?.trim() || null,
    };

    let entity: Vault;
    if (id) {
      const existing = await this.vaultRepo.findOne({
        where: { id, userId },
      });
      if (!existing) {
        // Cria se não existir (upsert).
        entity = this.vaultRepo.create(payload);
      } else {
        Object.assign(existing, payload);
        entity = existing;
      }
    } else {
      entity = this.vaultRepo.create(payload);
    }

    const saved = await this.vaultRepo.save(entity);
    return {
      id: saved.id,
      name: saved.name,
      balance: Number(saved.balance),
      categoryId: saved.categoryId,
      goalAmount: Number(saved.goalAmount),
      institution: saved.institution,
      yieldLabel: saved.yieldLabel,
      targetDate: saved.targetDate,
    };
  }

  async deleteVault(userId: string, id: string): Promise<void> {
    await this.vaultRepo.delete({ id, userId });
  }

  async getVaultHistory(userId: string, vaultId: string, months: number = 12): Promise<{ month: string; value: number }[]> {
    const vault = await this.vaultRepo.findOne({ where: { id: vaultId, userId } });
    if (!vault) throw new NotFoundException('Vault not found');

    const n = Math.min(24, Math.max(1, months));
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - (n - 1), 1);

    const movements = await this.movementRepo.find({
      where: { userId, vaultId },
      order: { date: 'ASC' },
    });

    const result: { month: string; value: number }[] = [];
    let balance = 0;
    let idx = 0;

    for (let i = 0; i < n; i++) {
      const d = new Date(from.getFullYear(), from.getMonth() + i + 1, 0);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      while (idx < movements.length && movements[idx].date <= d.toISOString().slice(0, 10)) {
        const m = movements[idx];
        const amt = Number(m.amount);
        balance += m.type === 'deposit' ? amt : -amt;
        idx++;
      }

      result.push({ month: monthKey, value: balance });
    }

    return result;
  }

  /** Lista movimentações do cofre para o frontend (id, kind, amount, date). */
  async listVaultMovements(userId: string, vaultId: string): Promise<{ id: string; kind: 'GUARDAR' | 'RESGATAR' | 'TRANSFER'; amount: number; date: string }[]> {
    const list = await this.movementRepo.find({
      where: { userId, vaultId },
      order: { date: 'DESC' },
    });
    return list.map((m) => {
      let kind: 'GUARDAR' | 'RESGATAR' | 'TRANSFER' = m.type === 'deposit' ? 'GUARDAR' : 'RESGATAR';
      if (m.source === 'vault') kind = 'TRANSFER';
      return {
        id: m.id,
        kind,
        amount: Number(m.amount),
        date: m.date,
      };
    });
  }

  async createVaultMovement(
    userId: string,
    vaultId: string,
    dto: {
      kind: 'GUARDAR' | 'RESGATAR' | 'TRANSFER';
      amount: number;
      date: string;
      source?: 'planilha' | 'external';
      targetVaultId?: string;
    },
  ): Promise<void> {
    const amount = Math.abs(dto.amount);
    if (!amount || Number.isNaN(amount)) {
      throw new BadRequestException('Valor inválido');
    }

    const date = dto.date || new Date().toISOString().slice(0, 10);

    if (dto.kind === 'TRANSFER') {
      const targetId = dto.targetVaultId;
      if (!targetId || targetId === vaultId) {
        throw new BadRequestException('Transferência requer outro cofre');
      }

      await this.dataSource.transaction(async (manager) => {
        // Retira do cofre origem
        await manager.save(VaultMovement, {
          userId,
          vaultId,
          date,
          type: 'withdraw',
          amount: String(amount),
          source: 'vault',
          linkedTransactionId: null,
        });
        // Adiciona no cofre destino
        await manager.save(VaultMovement, {
          userId,
          vaultId: targetId,
          date,
          type: 'deposit',
          amount: String(amount),
          source: 'vault',
          linkedTransactionId: null,
        });

        const from = await manager.findOne(Vault, { where: { id: vaultId, userId } });
        const to = await manager.findOne(Vault, { where: { id: targetId, userId } });
        if (!from || !to) throw new NotFoundException('Vault not found');
        const fromBal = Number(from.balance) - amount;
        if (fromBal < 0) throw new BadRequestException('Saldo insuficiente no cofre de origem');
        from.balance = String(fromBal);
        to.balance = String(Number(to.balance) + amount);
        await manager.save(Vault, from);
        await manager.save(Vault, to);
      });
      return;
    }

    if (dto.kind === 'GUARDAR') {
      const source = dto.source ?? 'external';
      await this.dataSource.transaction(async (manager) => {
        let linkedTxId: string | null = null;

        if (source === 'planilha') {
          const tx = await manager.save(Transaction, {
            userId,
            description: `Transferência para cofre`,
            amount: String(-amount),
            date,
            type: 'EXPENSE',
            categoryId: null,
            transactionGroupId: null,
            installmentInfo: null,
          });
          linkedTxId = tx.id;
        }

        await manager.save(VaultMovement, {
          userId,
          vaultId,
          date,
          type: 'deposit',
          amount: String(amount),
          source,
          linkedTransactionId: linkedTxId,
        });

        const vault = await manager.findOne(Vault, { where: { id: vaultId, userId } });
        if (!vault) throw new NotFoundException('Vault not found');
        vault.balance = String(Number(vault.balance) + amount);
        await manager.save(Vault, vault);
      });
      return;
    }

    if (dto.kind === 'RESGATAR') {
      await this.dataSource.transaction(async (manager) => {
        const vault = await manager.findOne(Vault, { where: { id: vaultId, userId } });
        if (!vault) throw new NotFoundException('Vault not found');
        const current = Number(vault.balance);
        if (current < amount) throw new BadRequestException('Saldo insuficiente no cofre');

        const tx = await manager.save(Transaction, {
          userId,
          description: `Resgate de cofre`,
          amount: String(amount),
          date,
          type: 'INCOME',
          categoryId: null,
          transactionGroupId: null,
          installmentInfo: null,
        });

        await manager.save(VaultMovement, {
          userId,
          vaultId,
          date,
          type: 'withdraw',
          amount: String(amount),
          source: 'planilha',
          linkedTransactionId: tx.id,
        });

        vault.balance = String(current - amount);
        await manager.save(Vault, vault);
      });
      return;
    }

    throw new BadRequestException('Tipo de movimentação inválido');
  }
}
