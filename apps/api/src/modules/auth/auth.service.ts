import { Injectable } from '@nestjs/common';
import { User, UserRole } from '@prisma/client';

import { InactiveAccountError, InvalidCredentialsError } from '../../common/errors/domain.errors';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { LoginResponse, LoginSuccessResponse } from './interfaces/auth-response.interface';
import { MfaService } from './mfa.service';
import { PasswordHasher } from './password-hasher';
import { RefreshTokensService } from './refresh-tokens.service';
import { TokenService } from './tokens/token.service';

const LOCKOUT_FAILURE_THRESHOLD = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_DEVICE_ID = 'default-device';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
    private readonly refreshTokensService: RefreshTokensService,
    private readonly mfaService: MfaService,
  ) {}

  async login(
    email: string,
    password: string,
    deviceId: string = DEFAULT_DEVICE_ID,
  ): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (user === null) {
      throw new InvalidCredentialsError();
    }

    this.assertCanAttemptLogin(user);

    const passwordMatches = await this.passwordHasher.verify(user.passwordHash, password);

    if (!passwordMatches) {
      await this.recordFailedLogin(user);
      throw new InvalidCredentialsError();
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null },
    });

    const authenticatedUser = this.toAuthenticatedUser(user);

    if (this.requiresMfa(user.role)) {
      return {
        mfaRequired: true,
        mfaToken: this.tokenService.signMfaToken(authenticatedUser),
        user: authenticatedUser,
      };
    }

    return this.issueLoginSuccess(authenticatedUser, deviceId);
  }

  async completeMfaLogin(
    mfaToken: string,
    code: string,
    deviceId: string = DEFAULT_DEVICE_ID,
  ): Promise<LoginSuccessResponse> {
    const payload = this.tokenService.verify(mfaToken, 'mfa');
    await this.mfaService.challenge(payload.sub, code);

    return this.issueLoginSuccess(
      {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      },
      deviceId,
    );
  }

  async refresh(refreshToken: string, deviceId: string = DEFAULT_DEVICE_ID) {
    const rotated = await this.refreshTokensService.rotate(refreshToken, deviceId);
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: rotated.row.userId },
    });

    if (!user.isActive) {
      await this.refreshTokensService.revokeAllForUser(user.id, 'inactive_account');
      throw new InactiveAccountError();
    }

    return {
      accessToken: this.tokenService.signAccessToken(this.toAuthenticatedUser(user)),
      refreshToken: rotated.plaintext,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.refreshTokensService.logout(refreshToken);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const matches = await this.passwordHasher.verify(user.passwordHash, currentPassword);

    if (!matches) {
      throw new InvalidCredentialsError();
    }

    await this.prisma.transactional(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash: await this.passwordHasher.hash(newPassword) },
      });
      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date(), revokeReason: 'password_changed' },
      });
    });
  }

  private async issueLoginSuccess(
    user: AuthenticatedUser,
    deviceId: string,
  ): Promise<LoginSuccessResponse> {
    const refreshToken = await this.refreshTokensService.issueForUser(user.id, deviceId);

    return {
      accessToken: this.tokenService.signAccessToken(user),
      refreshToken: refreshToken.plaintext,
      user,
    };
  }

  private assertCanAttemptLogin(user: User): void {
    if (!user.isActive) {
      throw new InactiveAccountError();
    }

    if (user.lockedUntil !== null && user.lockedUntil.getTime() > Date.now()) {
      throw new InvalidCredentialsError();
    }
  }

  private async recordFailedLogin(user: User): Promise<void> {
    const failedLoginCount = user.failedLoginCount + 1;
    const lockedUntil =
      failedLoginCount >= LOCKOUT_FAILURE_THRESHOLD
        ? new Date(Date.now() + LOCKOUT_WINDOW_MS)
        : null;

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount,
        lockedUntil,
      },
    });
  }

  private requiresMfa(role: UserRole): boolean {
    return role === UserRole.REVIEWER || role === UserRole.APPROVER || role === UserRole.ADMIN;
  }

  private toAuthenticatedUser(user: User): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
