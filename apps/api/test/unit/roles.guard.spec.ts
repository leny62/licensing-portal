import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';

import { RolesGuard } from '../../src/modules/auth/guards/roles.guard';

const createContext = (role: UserRole): ExecutionContext =>
  ({
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({
        user: {
          id: 'user-1',
          email: 'user@example.com',
          role,
        },
      }),
    }),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  it.each([
    [UserRole.ADMIN, true],
    [UserRole.APPLICANT, false],
    [UserRole.REVIEWER, false],
    [UserRole.APPROVER, false],
  ])('admin-only route matrix for %s', (role, allowed) => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const assertion = () => guard.canActivate(createContext(role));

    if (allowed) {
      expect(assertion()).toBe(true);
    } else {
      expect(assertion).toThrow(ForbiddenException);
    }
  });

  it('allows routes with no declared roles', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createContext(UserRole.APPLICANT))).toBe(true);
  });
});
