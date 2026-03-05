import { randomUUID } from 'crypto';
import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';

const SALT_ROUNDS = 10;
const JWT_EXPIRES = '7d';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(email: string, password: string): Promise<{ access_token: string; user: { id: string; email: string } }> {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !password || password.length < 6) {
      throw new ConflictException('E-mail e senha são obrigatórios. Senha com no mínimo 6 caracteres.');
    }
    const existing = await this.userRepo.findOne({ where: { email: normalized } });
    if (existing) throw new ConflictException('Este e-mail já está em uso.');

    const id = randomUUID();
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await this.userRepo.save({
      id,
      email: normalized,
      passwordHash,
    });

    const access_token = this.jwtService.sign(
      { sub: id },
      { expiresIn: JWT_EXPIRES },
    );
    return { access_token, user: { id, email: normalized } };
  }

  async login(email: string, password: string): Promise<{ access_token: string; user: { id: string; email: string } }> {
    const normalized = email.trim().toLowerCase();
    const user = await this.userRepo.findOne({ where: { email: normalized } });
    if (!user?.passwordHash) throw new UnauthorizedException('E-mail ou senha incorretos.');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('E-mail ou senha incorretos.');

    const access_token = this.jwtService.sign(
      { sub: user.id },
      { expiresIn: JWT_EXPIRES },
    );
    return { access_token, user: { id: user.id, email: user.email! } };
  }

  /** Valida usuário por id (para uso interno, ex.: WebSocket). */
  async validateUserId(userId: string): Promise<boolean> {
    const user = await this.userRepo.findOne({ where: { id: userId }, select: ['id'] });
    return !!user;
  }

  /** Perfil do usuário autenticado (para GET /auth/me). */
  async getProfile(userId: string): Promise<{ id: string; email: string | null }> {
    const user = await this.userRepo.findOne({ where: { id: userId }, select: ['id', 'email'] });
    if (!user) throw new UnauthorizedException('Usuário não encontrado.');
    return { id: user.id, email: user.email };
  }
}
