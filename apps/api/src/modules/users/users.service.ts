import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';

import { ConflictError, ResourceNotFoundError } from '../../common/errors/domain.errors';
import { PagedResponse } from '../../common/interfaces/paged-response.interface';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { PasswordHasher } from '../auth/password-hasher';
import { RefreshTokensService } from '../auth/refresh-tokens.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponse } from './interfaces/user-response.interface';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordHasher: PasswordHasher,
    private readonly refreshTokensService: RefreshTokensService,
  ) {}

  async getMe(userId: string): Promise<UserResponse> {
    return this.mapUser(await this.findUserOrThrow(userId));
  }

  async getById(userId: string): Promise<UserResponse> {
    return this.mapUser(await this.findUserOrThrow(userId));
  }

  async list(query: ListUsersQueryDto): Promise<PagedResponse<UserResponse>> {
    const page = query.page ?? 0;
    const size = query.size ?? 20;

    const where: Prisma.UserWhereInput = {
      ...(query.role !== undefined ? { role: query.role } : {}),
      ...(query.q !== undefined
        ? {
            OR: [
              { email: { contains: query.q, mode: 'insensitive' } },
              { fullName: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: page * size,
        take: size,
      }),
    ]);

    return {
      data: users.map((u) => this.mapUser(u)),
      meta: { page, size, total, totalPages: Math.max(Math.ceil(total / size), 1) },
    };
  }

  async create(dto: CreateUserDto): Promise<UserResponse> {
    try {
      const user = await this.prisma.user.create({
        data: {
          email: this.normaliseEmail(dto.email),
          passwordHash: await this.passwordHasher.hash(dto.password),
          fullName: dto.fullName,
          role: dto.role,
          ...(dto.institutionName !== undefined ? { institutionName: dto.institutionName } : {}),
        },
      });

      return this.mapUser(user);
    } catch (error) {
      this.rethrowUniqueness(error);
      throw error;
    }
  }

  async update(userId: string, dto: UpdateUserDto): Promise<UserResponse> {
    const existing = await this.findUserOrThrow(userId);
    const roleChanged = dto.role !== undefined && dto.role !== existing.role;

    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(dto.email !== undefined ? { email: this.normaliseEmail(dto.email) } : {}),
          ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
          ...(dto.role !== undefined ? { role: dto.role } : {}),
          ...(dto.institutionName !== undefined ? { institutionName: dto.institutionName } : {}),
        },
      });

      if (roleChanged) {
        await this.refreshTokensService.revokeAllForUser(userId, 'role_changed');
      }

      return this.mapUser(user);
    } catch (error) {
      this.rethrowUniqueness(error);
      throw error;
    }
  }

  async resetPassword(userId: string, newPassword: string): Promise<void> {
    await this.findUserOrThrow(userId);
    await this.prisma.transactional(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          passwordHash: await this.passwordHasher.hash(newPassword),
          failedLoginCount: 0,
          lockedUntil: null,
        },
      });
      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date(), revokeReason: 'admin_password_reset' },
      });
    });
  }

  async deactivate(userId: string): Promise<UserResponse> {
    await this.findUserOrThrow(userId);
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
    await this.refreshTokensService.revokeAllForUser(userId, 'user_deactivated');

    return this.mapUser(user);
  }

  async reactivate(userId: string): Promise<UserResponse> {
    await this.findUserOrThrow(userId);
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true, failedLoginCount: 0, lockedUntil: null },
    });

    return this.mapUser(user);
  }

  private async findUserOrThrow(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (user === null) {
      throw new ResourceNotFoundError('User not found.');
    }

    return user;
  }

  private mapUser(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      institutionName: user.institutionName,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private normaliseEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private rethrowUniqueness(error: unknown): void {
    const maybePrisma = error as { code?: string; meta?: unknown };

    if (maybePrisma.code === 'P2002') {
      throw new ConflictError('Email address already exists.', {
        target: maybePrisma.meta,
      });
    }
  }
}
