import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Transaction,
  TransactionGroup,
  UserFinanceSettings,
  Vault,
} from '../entities';
import { FinancesService } from './finances.service';
import { FinancesController } from './finances.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Transaction,
      TransactionGroup,
      UserFinanceSettings,
      Vault,
    ]),
  ],
  controllers: [FinancesController],
  providers: [FinancesService],
  exports: [FinancesService],
})
export class FinancesModule {}
