import { constants } from 'node:fs';
import { access, mkdir } from 'node:fs/promises';
import path from 'node:path';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MetricsService } from '../../common/observability/metrics.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { HealthCheck, HealthResponse } from './interfaces/health-response.interface';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly metricsService: MetricsService,
  ) {}

  async healthz(): Promise<HealthResponse> {
    return this.readyz();
  }

  livez(): HealthResponse {
    return this.response({
      process: { status: 'ok' },
    });
  }

  async readyz(): Promise<HealthResponse> {
    const [database, documentStorage, snapshotStorage] = await Promise.all([
      this.databaseCheck(),
      this.directoryCheck(this.configService.getOrThrow<string>('documents.storageRoot')),
      this.directoryCheck(this.configService.getOrThrow<string>('audit.snapshotDestination')),
    ]);

    return this.response({
      process: { status: 'ok' },
      database,
      documentStorage,
      snapshotStorage,
    });
  }

  async metrics(): Promise<string> {
    return this.metricsService.render((await this.databaseCheck()).status === 'ok');
  }

  private async databaseCheck(): Promise<HealthCheck> {
    const startedAt = process.hrtime.bigint();

    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return { status: 'ok', latencyMs: this.elapsedMs(startedAt) };
    } catch {
      return { status: 'error', latencyMs: this.elapsedMs(startedAt) };
    }
  }

  private async directoryCheck(directory: string): Promise<HealthCheck> {
    const startedAt = process.hrtime.bigint();

    try {
      const absolutePath = path.resolve(directory);
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      await mkdir(absolutePath, { recursive: true, mode: 0o700 });
      await access(absolutePath, constants.R_OK | constants.W_OK);

      return { status: 'ok', latencyMs: this.elapsedMs(startedAt) };
    } catch {
      return { status: 'error', latencyMs: this.elapsedMs(startedAt) };
    }
  }

  private response(checks: Record<string, HealthCheck>): HealthResponse {
    const hasError = Object.values(checks).some((check) => check.status === 'error');

    return {
      status: hasError ? 'error' : 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Number(process.uptime().toFixed(3)),
      checks,
    };
  }

  private elapsedMs(startedAt: bigint): number {
    return Number((Number(process.hrtime.bigint() - startedAt) / 1_000_000).toFixed(3));
  }
}
