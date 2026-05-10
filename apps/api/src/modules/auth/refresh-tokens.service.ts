import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, RefreshToken } from '@prisma/client';

import { InvalidCredentialsError, RefreshTokenReuseError } from '../../common/errors/domain.errors';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { IssuedRefreshToken } from './interfaces/refresh-token.interface';

type RefreshTokenClient = PrismaService | Prisma.TransactionClient;

const DEFAULT_DEVICE_ID = 'default-device';

@Injectable()
export class RefreshTokensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async issueForUser(
    userId: string,
    deviceId: string = DEFAULT_DEVICE_ID,
    client: RefreshTokenClient = this.prisma,
    familyId: string = randomUUID(),
  ): Promise<IssuedRefreshToken> {
    const plaintext = this.generatePlaintextToken();
    const row = await client.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(plaintext),
        familyId,
        deviceId,
        expiresAt: new Date(Date.now() + this.refreshTtlSeconds() * 1000),
      },
    });

    return { plaintext, row };
  }

  async rotate(
    plaintext: string,
    deviceId: string = DEFAULT_DEVICE_ID,
  ): Promise<IssuedRefreshToken> {
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashToken(plaintext) },
    });

    if (existing === null) {
      throw new InvalidCredentialsError();
    }

    if (existing.revokedAt !== null) {
      await this.revokeFamily(existing.familyId, 'reuse_detected');
      throw new RefreshTokenReuseError();
    }

    if (existing.expiresAt.getTime() <= Date.now()) {
      await this.revokeToken(existing.id, 'expired');
      throw new InvalidCredentialsError();
    }

    if (existing.deviceId !== deviceId) {
      await this.revokeFamily(existing.familyId, 'device_mismatch');
      throw new InvalidCredentialsError();
    }

    return this.prisma.transactional(async (tx) => {
      await this.revokeToken(existing.id, 'rotated', tx);

      return this.issueForUser(existing.userId, existing.deviceId, tx, existing.familyId);
    });
  }

  async logout(plaintext: string): Promise<void> {
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashToken(plaintext) },
    });

    if (existing !== null && existing.revokedAt === null) {
      await this.revokeToken(existing.id, 'logout');
    }
  }

  async revokeAllForUser(userId: string, reason: string): Promise<number> {
    const result = await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: {
        revokedAt: new Date(),
        revokeReason: reason,
      },
    });

    return result.count;
  }

  async revokeFamily(
    familyId: string,
    reason: string,
    client: RefreshTokenClient = this.prisma,
  ): Promise<number> {
    const result = await client.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: {
        revokedAt: new Date(),
        revokeReason: reason,
      },
    });

    return result.count;
  }

  private async revokeToken(
    id: string,
    reason: string,
    client: RefreshTokenClient = this.prisma,
  ): Promise<RefreshToken> {
    return client.refreshToken.update({
      where: { id },
      data: {
        revokedAt: new Date(),
        revokeReason: reason,
      },
    });
  }

  private generatePlaintextToken(): string {
    return randomBytes(48).toString('base64url');
  }

  private hashToken(plaintext: string): string {
    return createHash('sha256').update(plaintext).digest('hex');
  }

  private refreshTtlSeconds(): number {
    return this.configService.getOrThrow<number>('jwt.refreshTtlSeconds');
  }
}
