import { Injectable } from '@nestjs/common';
import { Prisma, SystemLog } from '@prisma/client';

import { MigrationRequiredError } from '../../common/errors/domain.errors';
import { PagedResponse } from '../../common/interfaces/paged-response.interface';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { ListSystemLogsQueryDto } from './dto/list-system-logs-query.dto';
import {
  CreateSystemLogInput,
  SystemLogResponse,
} from './interfaces/system-log-response.interface';

@Injectable()
export class SystemLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListSystemLogsQueryDto): Promise<PagedResponse<SystemLogResponse>> {
    const page = query.page ?? 0;
    const size = query.size ?? 20;
    const where = this.where(query);
    const [rows, total] = await this.withMigrationHint(
      Promise.all([
        this.prisma.systemLog.findMany({
          where,
          orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
          skip: page * size,
          take: size,
        }),
        this.prisma.systemLog.count({ where }),
      ]),
    );

    return {
      data: rows.map((row) => this.mapRow(row)),
      meta: { page, size, total, totalPages: Math.max(Math.ceil(total / size), 1) },
    };
  }

  async exportCsv(query: ListSystemLogsQueryDto): Promise<string> {
    const rows = await this.withMigrationHint(
      this.prisma.systemLog.findMany({
        where: this.where(query),
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        take: 5000,
      }),
    );

    const header = [
      'Date',
      'UserName',
      'Level',
      'Url',
      'Message',
      'RequestId',
      'Exception',
      'Logger',
      'HostAddress',
      'Browser',
      'ServerName',
      'Code',
      'DeviceId',
      'Thread',
      'ApplicationName',
    ];

    return [
      header.join(','),
      ...rows.map((row) =>
        [
          row.occurredAt.toISOString(),
          row.userName,
          row.level,
          row.url,
          row.message,
          row.requestId,
          row.exception,
          row.logger,
          row.hostAddress,
          row.browser,
          row.serverName,
          row.code,
          row.deviceId,
          row.thread,
          row.applicationName,
        ]
          .map((value) => this.csvValue(value))
          .join(','),
      ),
    ].join('\n');
  }

  async write(input: CreateSystemLogInput): Promise<void> {
    await this.withMigrationHint(
      this.prisma.systemLog.create({
        data: {
          userId: input.userId ?? null,
          userName: input.userName ?? null,
          level: input.level,
          method: input.method ?? null,
          url: input.url,
          message: input.message,
          requestId: input.requestId ?? null,
          exception: input.exception ?? null,
          logger: input.logger ?? null,
          hostAddress: input.hostAddress ?? null,
          browser: input.browser ?? null,
          serverName: input.serverName ?? null,
          code: input.code ?? null,
          deviceId: input.deviceId ?? null,
          thread: input.thread ?? null,
          businessLayer: input.businessLayer ?? null,
          applicationName: input.applicationName ?? 'Licensing Portal API',
        },
      }),
    );
  }

  private where(query: ListSystemLogsQueryDto): Prisma.SystemLogWhereInput {
    const where: Prisma.SystemLogWhereInput = {};

    if (query.level !== undefined) {
      where.level = query.level;
    }

    if (query.logger !== undefined && query.logger.trim() !== '') {
      where.logger = { contains: query.logger.trim(), mode: 'insensitive' };
    }

    if (query.userName !== undefined && query.userName.trim() !== '') {
      where.userName = { contains: query.userName.trim(), mode: 'insensitive' };
    }

    if (query.from !== undefined || query.to !== undefined) {
      const occurredAt: Prisma.DateTimeFilter<'SystemLog'> = {};
      if (query.from !== undefined) {
        occurredAt.gte = new Date(query.from);
      }
      if (query.to !== undefined) {
        occurredAt.lte = new Date(query.to);
      }
      where.occurredAt = occurredAt;
    }

    if (query.q !== undefined && query.q.trim() !== '') {
      const term = query.q.trim();
      where.OR = [
        { url: { contains: term, mode: 'insensitive' } },
        { message: { contains: term, mode: 'insensitive' } },
        { requestId: { contains: term, mode: 'insensitive' } },
        { exception: { contains: term, mode: 'insensitive' } },
        { code: { contains: term, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private mapRow(row: SystemLog): SystemLogResponse {
    return {
      id: row.id,
      occurredAt: row.occurredAt,
      userId: row.userId,
      userName: row.userName,
      level: row.level,
      method: row.method,
      url: row.url,
      message: row.message,
      requestId: row.requestId,
      exception: row.exception,
      logger: row.logger,
      hostAddress: row.hostAddress,
      browser: row.browser,
      serverName: row.serverName,
      code: row.code,
      deviceId: row.deviceId,
      thread: row.thread,
      businessLayer: row.businessLayer,
      applicationName: row.applicationName,
    };
  }

  private csvValue(value: Date | string | number | null): string {
    if (value === null) {
      return '';
    }

    return `"${String(value).replaceAll('"', '""')}"`;
  }

  private async withMigrationHint<T>(operation: Promise<T>): Promise<T> {
    try {
      return await operation;
    } catch (error) {
      if (this.isSystemLogsTableMissing(error)) {
        throw new MigrationRequiredError('System logs database migration has not been applied.');
      }

      throw error;
    }
  }

  private isSystemLogsTableMissing(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2021' &&
      String(error.meta?.['table'] ?? '').includes('system_logs')
    );
  }
}
