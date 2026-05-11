import { PrismaService } from '../../src/infra/prisma/prisma.service';
import { MetricsService } from '../../src/common/observability/metrics.service';
import { HealthService } from '../../src/modules/health/health.service';

describe('HealthService', () => {
  const configService = {
    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, string> = {
        'documents.storageRoot': './var/test-documents',
        'audit.snapshotDestination': './var/test-snapshots',
      };

      return values[key];
    }),
  };
  const metricsService = {
    render: jest.fn(
      (dbUp: boolean) => `licensing_portal_up 1\nlicensing_portal_database_up ${dbUp ? 1 : 0}\n`,
    ),
  } as unknown as MetricsService;

  it('returns ok when the database ping succeeds', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as unknown as PrismaService;
    const service = new HealthService(prisma, configService as never, metricsService);

    const response = await service.healthz();

    expect(response.status).toBe('ok');
    expect(response.checks['database']?.status).toBe('ok');
    expect(response.checks['documentStorage']?.status).toBe('ok');
    expect(response.checks['snapshotStorage']?.status).toBe('ok');
  });

  it('emits a Prometheus-compatible up metric', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as unknown as PrismaService;
    const service = new HealthService(prisma, configService as never, metricsService);

    await expect(service.metrics()).resolves.toContain('licensing_portal_up 1');
  });
});
