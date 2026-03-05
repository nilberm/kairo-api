import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUser } from '../auth/decorators/current-user.decorator';
import { TodosService } from './todos.service';

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

@Controller('todos')
@UseGuards(JwtAuthGuard)
export class TodosController {
  constructor(private readonly todos: TodosService) {}

  @Get()
  listByDate(@CurrentUser() user: JwtUser, @Query('date') date?: string) {
    const d = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayKey();
    return this.todos.listByDate(user.id, d);
  }

  @Post()
  create(@CurrentUser() user: JwtUser, @Body('title') title: string, @Body('date') date?: string) {
    const d = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayKey();
    return this.todos.create(user.id, title ?? '', d);
  }

  @Patch(':id/complete')
  setComplete(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body('completed') completed: boolean) {
    return this.todos.setComplete(user.id, id, !!completed);
  }

  @Delete(':id')
  delete(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.todos.delete(user.id, id);
  }

  @Get('history')
  getHistory(@CurrentUser() user: JwtUser, @Query('limit') limit?: string) {
    const n = Math.min(parseInt(limit ?? '100', 10) || 100, 500);
    return this.todos.getHistory(user.id, n);
  }
}
