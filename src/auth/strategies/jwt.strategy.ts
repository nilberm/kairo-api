import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtUser } from '../decorators/current-user.decorator';

const JWT_SECRET = process.env.JWT_SECRET ?? 'kairo-dev-secret-change-in-production';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JWT_SECRET,
    });
  }

  validate(payload: { sub: string }): JwtUser {
    if (!payload?.sub) throw new UnauthorizedException('Token inválido.');
    return { id: payload.sub };
  }
}
