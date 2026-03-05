import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { VisionGoal } from '../entities/vision-goal.entity';
import { VisionGoalTransaction } from '../entities/vision-goal-transaction.entity';
import { VisionValueEntry } from '../entities/vision-value-entry.entity';
import { MediumTermGoal } from '../entities/medium-term-goal.entity';
import { ShortTermGoal } from '../entities/short-term-goal.entity';
import { Habit } from '../entities/habit.entity';
import { HabitProgress } from '../entities/habit-progress.entity';
import { getDbConfig } from '../db-config';
import {
  SEED_VISION_GOALS,
  SEED_MEDIUM_GOALS,
  SEED_SHORT_GOALS,
  SEED_DAILY_HABITS,
  SEED_WEEKLY_HABITS,
  SEED_MONTHLY_HABITS,
} from './data';

const DEFAULT_USER_ID = process.env.DEFAULT_USER_ID ?? '00000000-0000-0000-0000-000000000001';

/** Usado pela API no startup (RUN_SEED_ON_STARTUP=true) ou pelo CLI. Não destrói o DataSource. */
export async function runSeedWithDataSource(ds: DataSource): Promise<void> {
  // Garante que a coluna de senha existe (banco criado antes da auth)
  await ds.query(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "passwordHash" VARCHAR(255);`,
  );

  const userRepo = ds.getRepository(User);
  const visionRepo = ds.getRepository(VisionGoal);
  const mediumRepo = ds.getRepository(MediumTermGoal);
  const shortRepo = ds.getRepository(ShortTermGoal);
  const habitRepo = ds.getRepository(Habit);

  const defaultEmail = 'default@kairo.app';
  const defaultPassword = process.env.SEED_DEFAULT_PASSWORD ?? 'changeme';
  let user = await userRepo.findOne({ where: { id: DEFAULT_USER_ID } });
  if (!user) {
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    user = userRepo.create({
      id: DEFAULT_USER_ID,
      email: defaultEmail,
      passwordHash,
    });
    await userRepo.save(user);
    console.log('Created default user:', user.id, '— login:', defaultEmail, '/', defaultPassword);
  } else {
    if (!user.passwordHash) {
      user.passwordHash = await bcrypt.hash(defaultPassword, 10);
      await userRepo.save(user);
      console.log('Set password for default user — login:', defaultEmail, '/', defaultPassword);
    }
    console.log('Using existing user:', user.id);
  }

  const userId = user.id;

  for (const g of SEED_VISION_GOALS) {
    const existing = await visionRepo.findOne({ where: { id: g.id, userId } });
    if (!existing) {
      await visionRepo.insert({
        id: g.id,
        userId,
        title: g.title,
        subtitle: g.subtitle,
        currentValue: g.currentValue,
        targetValue: g.targetValue,
        unit: g.unit || null,
        deadline: g.deadline,
        status: g.status,
      });
      console.log('Inserted vision goal:', g.id);
    }
  }

  for (const g of SEED_MEDIUM_GOALS) {
    const existing = await mediumRepo.findOne({ where: { id: g.id, userId } });
    if (!existing) {
      await mediumRepo.insert({
        id: g.id,
        userId,
        title: g.title,
        subtitle: g.subtitle ?? null,
        costOrValue: g.costOrValue,
        currency: g.currency ?? null,
        deadline: g.deadline,
        isCompleted: g.isCompleted,
      });
      console.log('Inserted medium goal:', g.id);
    }
  }

  for (const g of SEED_SHORT_GOALS) {
    const existing = await shortRepo.findOne({ where: { id: g.id, userId } });
    if (!existing) {
      await shortRepo.insert({
        id: g.id,
        userId,
        title: g.title,
        subtitle: g.subtitle,
        targetMonths: g.targetMonths ?? null,
        isCompleted: g.isCompleted,
      });
      console.log('Inserted short goal:', g.id);
    }
  }

  const allHabits = [...SEED_DAILY_HABITS, ...SEED_WEEKLY_HABITS, ...SEED_MONTHLY_HABITS];
  for (const h of allHabits) {
    const existing = await habitRepo.findOne({ where: { id: h.id, userId } });
    if (!existing) {
      await habitRepo.insert({
        id: h.id,
        userId,
        name: h.name,
        frequency: h.frequency,
        type: h.type,
        target: h.target,
        unit: h.unit,
      });
      console.log('Inserted habit:', h.id);
    }
  }

  console.log('Seed finished.');
}

/** Script standalone: npm run seed (usa DATABASE_URL ou DB_*). */
async function runSeedStandalone() {
  const config = getDbConfig();
  const ds = new DataSource({
    ...config,
    entities: [
      User,
      VisionGoal,
      VisionGoalTransaction,
      VisionValueEntry,
      MediumTermGoal,
      ShortTermGoal,
      Habit,
      HabitProgress,
    ],
    synchronize: false,
  });
  await ds.initialize();
  await runSeedWithDataSource(ds);
  await ds.destroy();
}

// Só executa o seed quando o arquivo é rodado direto (npm run seed), não quando importado por main.ts
if (require.main === module) {
  runSeedStandalone().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
