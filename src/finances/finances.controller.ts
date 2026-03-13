import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUser } from '../auth/decorators/current-user.decorator';
import { FinancesService } from './finances.service';
import type { CreateTransactionDto } from './dto/create-transaction.dto';

@Controller('finances')
@UseGuards(JwtAuthGuard)
export class FinancesController {
  constructor(private readonly finances: FinancesService) {}

  /**
   * Transações de um dia (para o modal de detalhes do dia).
   * Query: date (YYYY-MM-DD).
   */
  @Get('transactions')
  getTransactionsByDate(
    @CurrentUser() user: JwtUser,
    @Query('date') date: string,
  ) {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return [];
    }
    return this.finances.getTransactionsByDate(user.id, date);
  }

  /**
   * Projeção de fluxo de caixa: meses com dias (entrada, saída, diário, saldo).
   * Query: months (default 12).
   */
  @Get('projection')
  getProjection(
    @CurrentUser() user: JwtUser,
    @Query('months') months?: string,
  ) {
    const n = Math.min(24, Math.max(1, parseInt(months ?? '12', 10) || 12));
    return this.finances.getProjection(user.id, n);
  }

  /**
   * Alertas de renovação: recorrências que terminam em até 30 dias.
   * O front pode exibir ao abrir a área Finanças ou no dashboard.
   */
  @Get('renewal-alerts')
  getRenewalAlerts(@CurrentUser() user: JwtUser) {
    return this.finances.getRenewalAlerts(user.id);
  }

  /** Novo lançamento (único, parcelado ou recorrente). */
  @Post('transactions')
  createTransaction(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.finances.create(user.id, dto);
  }

  /** Renovar recorrência: gera mais 24 meses. */
  @Post('recurring/:groupId/renew')
  renewRecurring(
    @CurrentUser() user: JwtUser,
    @Param('groupId') groupId: string,
  ) {
    return this.finances.renewRecurring(user.id, groupId);
  }

  /** Encerrar recorrência (não gera mais). */
  @Patch('recurring/:groupId/end')
  endRecurring(
    @CurrentUser() user: JwtUser,
    @Param('groupId') groupId: string,
  ) {
    return this.finances.endRecurring(user.id, groupId);
  }

  /** Define saldo de referência para a projeção. */
  @Patch('settings/balance')
  setBalance(
    @CurrentUser() user: JwtUser,
    @Body('balance') balance: number,
    @Body('asOfDate') asOfDate: string,
  ) {
    return this.finances.setBalance(user.id, Number(balance), asOfDate);
  }
}
