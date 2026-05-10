import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';

import { RefreshTokenReuseError } from '../../src/common/errors/domain.errors';
import { PrismaService } from '../../src/infra/prisma/prisma.service';
import { RefreshTokensService } from '../../src/modules/auth/refresh-tokens.service';
import {
  applyMigrations,
  startPostgres,
  StartedTestDatabase,
} from './helpers/postgres-test-database';

describe('refresh token rotation', () => {
  jest.setTimeout(120_000);

  let database: StartedTestDatabase;
  let prisma: PrismaService;
  let service: RefreshTokensService;
  const userId = 'fdf77270-1fb0-4471-9ba4-0209e380ddee';

  beforeAll(async () => {
    database = await startPostgres();
    applyMigrations(database.url);
    process.env.DATABASE_URL = database.url;
    prisma = new PrismaService();
    service = new RefreshTokensService(prisma, {
      getOrThrow: jest.fn(() => 60 * 60),
    } as unknown as ConfigService);

    await prisma.user.create({
      data: {
        id: userId,
        email: 'refresh@example.com',
        passwordHash: 'hash',
        fullName: 'Refresh User',
        role: UserRole.APPLICANT,
      },
    });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await database?.stop();
  });

  it('rotates on happy refresh and rejects old-token replay by revoking the family', async () => {
    const issued = await service.issueForUser(userId, 'device-a');
    const rotated = await service.rotate(issued.plaintext, 'device-a');

    expect(rotated.plaintext).not.toBe(issued.plaintext);

    const oldRow = await prisma.refreshToken.findUniqueOrThrow({
      where: { id: issued.row.id },
    });
    expect(oldRow.revokedAt).toBeInstanceOf(Date);
    expect(oldRow.revokeReason).toBe('rotated');

    await expect(service.rotate(issued.plaintext, 'device-a')).rejects.toBeInstanceOf(
      RefreshTokenReuseError,
    );

    const activeInFamily = await prisma.refreshToken.count({
      where: { familyId: issued.row.familyId, revokedAt: null },
    });
    expect(activeInFamily).toBe(0);
  });

  it('rejects wrong device_id and revokes the family', async () => {
    const issued = await service.issueForUser(userId, 'device-b');

    await expect(service.rotate(issued.plaintext, 'device-c')).rejects.toThrow();

    const activeInFamily = await prisma.refreshToken.count({
      where: { familyId: issued.row.familyId, revokedAt: null },
    });
    expect(activeInFamily).toBe(0);
  });

  it('password-change style revocation invalidates every active token for a user', async () => {
    await service.issueForUser(userId, 'device-d');
    await service.issueForUser(userId, 'device-e');

    const revoked = await service.revokeAllForUser(userId, 'password_changed');

    expect(revoked).toBeGreaterThanOrEqual(2);
    await expect(prisma.refreshToken.count({ where: { userId, revokedAt: null } })).resolves.toBe(
      0,
    );
  });
});
