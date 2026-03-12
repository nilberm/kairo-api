# Módulo Finanças (Kairo)

## Schema (TypeORM)

- **transaction_groups**: Agrupa parceladas e recorrentes. `kind` = `installment` | `recurring`; `recurrenceEndDate` (última data gerada); `status` = `active` | `ended`.
- **transactions**: Lançamentos. `amount` com sinal; `transactionGroupId` + `installmentInfo` (ex: "2/10") para parceladas/recorrentes.
- **user_finance_settings**: Saldo de referência do usuário (`balance`, `balanceAsOfDate`) para o cálculo da projeção.

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/finances/projection?months=12` | Projeção de fluxo de caixa (meses com dias: entrada, saída, diário, saldo). |
| GET | `/finances/renewal-alerts` | Alertas de recorrências que terminam em até 30 dias. |
| POST | `/finances/transactions` | Criar lançamento (body: kind = unique \| installment \| recurring, amount, date, type, …). |
| POST | `/finances/recurring/:groupId/renew` | Renovar recorrência (+24 meses). |
| PATCH | `/finances/recurring/:groupId/end` | Encerrar recorrência. |
| PATCH | `/finances/settings/balance` | Definir saldo de referência (body: balance, asOfDate). |

## Regras

- **Recorrentes**: criação gera 24 registros físicos + grupo com `recurrenceEndDate`. Alerta quando `recurrenceEndDate` está a &lt; 30 dias; usuário pode "Renovar" (+24 meses) ou "Encerrar".
- **Edição "este e os próximos"**: `FinancesService.updateGroupFromDate(userId, groupId, fromDate, { amount?, description? }, onlyThis)` — implementado; falta expor no controller (ex.: PATCH `/finances/transactions/:id` com body `{ onlyThis: boolean, amount?, description? }`).

## Migration

Rodar: `npm run migration:run` (a migration `CreateFinanceTables1730700000000` cria as 3 tabelas).
