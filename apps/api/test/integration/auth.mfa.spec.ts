import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { authenticator } from 'otplib';

import { MfaReuseError } from '../../src/common/errors/domain.errors';
import { PrismaService } from '../../src/infra/prisma/prisma.service';
import { LocalKekProvider } from '../../src/infra/storage/local-kek-provider';
import { MfaService } from '../../src/modules/auth/mfa.service';
import { PasswordHasher } from '../../src/modules/auth/password-hasher';
import {
  applyMigrations,
  startPostgres,
  StartedTestDatabase,
} from './helpers/postgres-test-database';

describe('MfaService', () => {
  jest.setTimeout(120_000);

  let database: StartedTestDatabase;
  let prisma: PrismaService;
  let service: MfaService;
  const userId = 'cc1b8251-3929-4358-b73a-ef1bd5339b58';

  beforeAll(async () => {
    database = await startPostgres();
    applyMigrations(database.url);
    process.env.DATABASE_URL = database.url;
    prisma = new PrismaService();
    const config = {
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, Buffer | number> = {
          'documents.keyEncryptionKey': Buffer.alloc(32, 3),
          'argon2.memoryCost': 4096,
          'argon2.timeCost': 2,
          'argon2.parallelism': 1,
        };

        return values[key];
      }),
    } as unknown as ConfigService;

    service = new MfaService(prisma, new PasswordHasher(config), new LocalKekProvider(config));

    await prisma.user.create({
      data: {
        id: userId,
        email: 'mfa@example.com',
        passwordHash: 'hash',
        fullName: 'MFA User',
        role: UserRole.REVIEWER,
      },
    });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await database?.stop();
  });

  it('enrols, accepts a valid TOTP once, and rejects reuse in the same step', async () => {
    const enrolment = await service.enrol(userId);
    const code = authenticator.generate(enrolment.secret);

    await expect(service.challenge(userId, code)).resolves.toBeUndefined();
    await expect(service.challenge(userId, code)).rejects.toBeInstanceOf(MfaReuseError);
  });

  it('consumes recovery codes single-use', async () => {
    const enrolment = await service.enrol(userId);
    const recoveryCode = enrolment.recoveryCodes[0];

    if (recoveryCode === undefined) {
      throw new Error('Expected at least one recovery code.');
    }

    await expect(service.challenge(userId, recoveryCode)).resolves.toBeUndefined();
    await expect(service.challenge(userId, recoveryCode)).rejects.toThrow();
  });

  it('admin reset removes existing MFA factors', async () => {
    await service.enrol(userId);
    await service.reset(userId);

    await expect(prisma.userMfaSecret.findUnique({ where: { userId } })).resolves.toBeNull();
    await expect(prisma.userMfaRecoveryCode.count({ where: { userId } })).resolves.toBe(0);
  });
});
