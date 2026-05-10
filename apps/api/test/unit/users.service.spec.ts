import { UserRole } from '@prisma/client';

import { ConflictError } from '../../src/common/errors/domain.errors';
import { PrismaService } from '../../src/infra/prisma/prisma.service';
import { PasswordHasher } from '../../src/modules/auth/password-hasher';
import { RefreshTokensService } from '../../src/modules/auth/refresh-tokens.service';
import { UsersService } from '../../src/modules/users/users.service';

const now = new Date('2026-05-10T06:00:00.000Z');

const userFixture = {
  id: 'user-1',
  email: 'user@example.com',
  passwordHash: 'hash',
  fullName: 'User One',
  role: UserRole.APPLICANT,
  institutionName: null,
  isActive: true,
  failedLoginCount: 0,
  lockedUntil: null,
  createdAt: now,
  updatedAt: now,
};

describe('UsersService', () => {
  const createService = () => {
    const prisma = {
      user: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    const passwordHasher = {
      hash: jest.fn().mockResolvedValue('hashed-password'),
    };
    const refreshTokensService = {
      revokeAllForUser: jest.fn().mockResolvedValue(2),
    };

    return {
      prisma,
      passwordHasher,
      refreshTokensService,
      service: new UsersService(
        prisma as unknown as PrismaService,
        passwordHasher as unknown as PasswordHasher,
        refreshTokensService as unknown as RefreshTokensService,
      ),
    };
  };

  it('creates users with normalised email and hashed password', async () => {
    const { service, prisma, passwordHasher } = createService();
    prisma.user.create.mockResolvedValue(userFixture);

    const created = await service.create({
      email: ' USER@EXAMPLE.COM ',
      password: 'long-password',
      fullName: 'User One',
      role: UserRole.APPLICANT,
    });

    expect(passwordHasher.hash).toHaveBeenCalledWith('long-password');
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'user@example.com',
        passwordHash: 'hashed-password',
        fullName: 'User One',
        role: UserRole.APPLICANT,
      },
    });
    expect(created).not.toHaveProperty('passwordHash');
  });

  it('maps email uniqueness failures to ConflictError', async () => {
    const { service, prisma } = createService();
    prisma.user.create.mockRejectedValue({ code: 'P2002', meta: { target: ['email'] } });

    await expect(
      service.create({
        email: 'dupe@example.com',
        password: 'long-password',
        fullName: 'Duplicate',
        role: UserRole.ADMIN,
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('deactivation revokes all active refresh tokens', async () => {
    const { service, prisma, refreshTokensService } = createService();
    prisma.user.findUnique.mockResolvedValue(userFixture);
    prisma.user.update.mockResolvedValue({ ...userFixture, isActive: false });

    const result = await service.deactivate(userFixture.id);

    expect(result.isActive).toBe(false);
    expect(refreshTokensService.revokeAllForUser).toHaveBeenCalledWith(
      userFixture.id,
      'user_deactivated',
    );
  });

  it('role changes revoke sessions', async () => {
    const { service, prisma, refreshTokensService } = createService();
    prisma.user.findUnique.mockResolvedValue(userFixture);
    prisma.user.update.mockResolvedValue({ ...userFixture, role: UserRole.REVIEWER });

    await service.update(userFixture.id, { role: UserRole.REVIEWER });

    expect(refreshTokensService.revokeAllForUser).toHaveBeenCalledWith(
      userFixture.id,
      'role_changed',
    );
  });
});
