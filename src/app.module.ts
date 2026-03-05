import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDbConfig } from './db-config';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { GoalsModule } from './goals/goals.module';
import { HabitsModule } from './habits/habits.module';
import { TodosModule } from './todos/todos.module';
import { LifeRpgModule } from './life-rpg/life-rpg.module';

const db = getDbConfig();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    EventsModule,
    TypeOrmModule.forRoot({
      ...db,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
    }),
    GoalsModule,
    HabitsModule,
    TodosModule,
    LifeRpgModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
