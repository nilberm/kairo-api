import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  LifeRpgProgression,
  LifeRpgCosmetic,
  LifeRpgUserCosmetic,
  LifeRpgEquipped,
} from '../entities';
import type { LifeRpgPillar } from '../entities/life-rpg-progression.entity';

@Injectable()
export class LifeRpgService {
  constructor(
    @InjectRepository(LifeRpgProgression)
    private progressionRepo: Repository<LifeRpgProgression>,
    @InjectRepository(LifeRpgCosmetic)
    private cosmeticRepo: Repository<LifeRpgCosmetic>,
    @InjectRepository(LifeRpgUserCosmetic)
    private userCosmeticRepo: Repository<LifeRpgUserCosmetic>,
    @InjectRepository(LifeRpgEquipped)
    private equippedRepo: Repository<LifeRpgEquipped>,
  ) {}

  /** Retorna progresso de todos os pilares do usuário. */
  async getProgression(userId: string): Promise<{ pillar: LifeRpgPillar; value: number }[]> {
    const rows = await this.progressionRepo.find({
      where: { userId },
      order: { pillar: 'ASC' },
    });
    return rows.map((r) => ({ pillar: r.pillar as LifeRpgPillar, value: Number(r.value) }));
  }

  /** Adiciona minutos de foco (Pomodoro). Validação anti-cheat: cap opcional por dia pode ser adicionado depois. */
  async addFocusMinutes(userId: string, minutes: number): Promise<{ totalMinutes: number }> {
    if (minutes <= 0 || minutes > 24 * 60) {
      throw new Error('Minutos inválidos (use 1 a 1440).');
    }
    let row = await this.progressionRepo.findOne({
      where: { userId, pillar: 'focus' },
    });
    if (!row) {
      row = this.progressionRepo.create({
        userId,
        pillar: 'focus',
        value: '0',
      });
      await this.progressionRepo.save(row);
    }
    const current = Number(row.value);
    const next = current + minutes;
    row.value = String(next);
    row.updatedAt = new Date();
    await this.progressionRepo.save(row);
    return { totalMinutes: next };
  }

  /** Catálogo de cosméticos por pilar. */
  async getCosmetics(pillar: LifeRpgPillar): Promise<LifeRpgCosmetic[]> {
    return this.cosmeticRepo.find({
      where: { pillar },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  /** Itens desbloqueados pelo usuário no pilar. */
  async getInventory(userId: string, pillar: LifeRpgPillar): Promise<LifeRpgUserCosmetic[]> {
    return this.userCosmeticRepo
      .createQueryBuilder('uc')
      .innerJoinAndSelect('uc.cosmetic', 'c')
      .where('uc.userId = :userId', { userId })
      .andWhere('c.pillar = :pillar', { pillar })
      .orderBy('uc.unlockedAt', 'DESC')
      .getMany();
  }

  /** Equipados por pilar (slot -> cosmeticId). */
  async getEquipped(userId: string, pillar: LifeRpgPillar): Promise<Record<string, string | null>> {
    const rows = await this.equippedRepo.find({
      where: { userId, pillar },
      relations: ['cosmetic'],
    });
    const out: Record<string, string | null> = {};
    for (const r of rows) {
      out[r.slot] = r.cosmeticId ?? null;
    }
    return out;
  }

  /** Define item equipado em um slot (cosmeticId null = desequipar). */
  async setEquipped(userId: string, pillar: LifeRpgPillar, slot: string, cosmeticId: string | null): Promise<void> {
    let row = await this.equippedRepo.findOne({
      where: { userId, pillar, slot },
    });
    if (!row) {
      row = this.equippedRepo.create({ userId, pillar, slot, cosmeticId });
    } else {
      row.cosmeticId = cosmeticId;
    }
    await this.equippedRepo.save(row);
  }
}
