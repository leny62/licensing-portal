import { randomBytes } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';

import { MfaInvalidError, MfaReuseError } from '../../common/errors/domain.errors';
import { KekProvider } from '../../infra/storage/interfaces/kek-provider.interface';
import { KEK_PROVIDER } from '../../infra/storage/storage.tokens';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { PasswordHasher } from './password-hasher';
import { MfaEnrollment } from './interfaces/mfa.interface';

const TOTP_STEP_SECONDS = 30;
const RECOVERY_CODE_COUNT = 10;

@Injectable()
export class MfaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordHasher: PasswordHasher,
    @Inject(KEK_PROVIDER) private readonly kekProvider: KekProvider,
  ) {
    authenticator.options = {
      step: TOTP_STEP_SECONDS,
      window: 1,
    };
  }

  async enrol(userId: string): Promise<MfaEnrollment> {
    const secret = authenticator.generateSecret();
    const recoveryCodes = this.generateRecoveryCodes();

    await this.prisma.transactional(async (tx) => {
      await tx.userMfaSecret.upsert({
        where: { userId },
        update: {
          secretEncrypted: await this.kekProvider.wrap(Buffer.from(secret, 'utf8')),
          enrolledAt: new Date(),
          lastUsedAt: null,
        },
        create: {
          userId,
          secretEncrypted: await this.kekProvider.wrap(Buffer.from(secret, 'utf8')),
        },
      });

      await tx.userMfaRecoveryCode.deleteMany({ where: { userId } });

      await tx.userMfaRecoveryCode.createMany({
        data: await Promise.all(
          recoveryCodes.map(async (code) => ({
            userId,
            codeHash: await this.passwordHasher.hash(code),
          })),
        ),
      });
    });

    return { secret, recoveryCodes };
  }

  async challenge(userId: string, code: string): Promise<void> {
    if (code.includes('-')) {
      await this.consumeRecoveryCode(userId, code);
      return;
    }

    const secretRow = await this.prisma.userMfaSecret.findUnique({ where: { userId } });

    if (secretRow === null) {
      throw new MfaInvalidError('MFA is not enrolled for this user.');
    }

    const currentWindowStart = new Date(
      Math.floor(Date.now() / (TOTP_STEP_SECONDS * 1000)) * TOTP_STEP_SECONDS * 1000,
    );

    if (secretRow.lastUsedAt !== null && secretRow.lastUsedAt >= currentWindowStart) {
      throw new MfaReuseError();
    }

    const secret = (await this.kekProvider.unwrap(secretRow.secretEncrypted)).toString('utf8');

    if (!authenticator.check(code, secret)) {
      throw new MfaInvalidError('Invalid MFA code.');
    }

    await this.prisma.userMfaSecret.update({
      where: { userId },
      data: { lastUsedAt: new Date() },
    });
  }

  async reset(userId: string): Promise<void> {
    await this.prisma.transactional(async (tx) => {
      await tx.userMfaRecoveryCode.deleteMany({ where: { userId } });
      await tx.userMfaSecret.deleteMany({ where: { userId } });
    });
  }

  private async consumeRecoveryCode(userId: string, code: string): Promise<void> {
    const candidates = await this.prisma.userMfaRecoveryCode.findMany({
      where: { userId, usedAt: null },
    });

    for (const candidate of candidates) {
      if (await this.passwordHasher.verify(candidate.codeHash, code)) {
        await this.prisma.userMfaRecoveryCode.update({
          where: { id: candidate.id },
          data: { usedAt: new Date() },
        });
        return;
      }
    }

    throw new MfaInvalidError('Invalid MFA recovery code.');
  }

  private generateRecoveryCodes(): string[] {
    return Array.from({ length: RECOVERY_CODE_COUNT }, () => {
      const left = randomBytes(4).toString('hex').toUpperCase();
      const right = randomBytes(4).toString('hex').toUpperCase();

      return `${left}-${right}`;
    });
  }
}
