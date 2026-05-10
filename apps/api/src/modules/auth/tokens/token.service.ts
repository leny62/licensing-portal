import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import jwt, { JwtHeader } from 'jsonwebtoken';

import { KeyProvider } from '../../../infra/keys/interfaces/key-provider.interface';
import { KEY_PROVIDER } from '../../../infra/keys/keys.tokens';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { AuthTokenType, JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class TokenService {
  constructor(
    private readonly configService: ConfigService,
    @Inject(KEY_PROVIDER) private readonly keyProvider: KeyProvider,
  ) {}

  sign(payload: Omit<JwtPayload, 'iat' | 'exp' | 'iss' | 'aud'>): string {
    const ttlSeconds = payload.type === 'access' ? this.accessTtlSeconds() : 5 * 60;

    return jwt.sign(payload, this.keyProvider.getPrivateKey(), {
      algorithm: 'RS256',
      audience: this.configService.getOrThrow<string>('jwt.audience'),
      expiresIn: ttlSeconds,
      issuer: this.configService.getOrThrow<string>('jwt.issuer'),
      keyid: this.keyProvider.getKid(),
    });
  }

  signAccessToken(user: AuthenticatedUser): string {
    return this.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
    });
  }

  signMfaToken(user: AuthenticatedUser): string {
    return this.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'mfa',
    });
  }

  verify(token: string, expectedType: AuthTokenType = 'access'): JwtPayload {
    const decoded = jwt.decode(token, { complete: true });
    const header = decoded?.header as JwtHeader | undefined;

    if (header?.kid !== this.keyProvider.getKid()) {
      throw new UnauthorizedException('Unknown token key id.');
    }

    const payload = jwt.verify(token, this.keyProvider.getPublicKey(), {
      algorithms: ['RS256'],
      audience: this.configService.getOrThrow<string>('jwt.audience'),
      issuer: this.configService.getOrThrow<string>('jwt.issuer'),
    }) as JwtPayload;

    if (payload.type !== expectedType || !this.isUserRole(payload.role)) {
      throw new UnauthorizedException('Invalid token payload.');
    }

    return payload;
  }

  private accessTtlSeconds(): number {
    return this.configService.getOrThrow<number>('jwt.accessTtlSeconds');
  }

  private isUserRole(value: unknown): value is UserRole {
    return (
      value === UserRole.APPLICANT ||
      value === UserRole.REVIEWER ||
      value === UserRole.APPROVER ||
      value === UserRole.ADMIN
    );
  }
}
