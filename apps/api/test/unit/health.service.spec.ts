import { PrismaService } from '../../src/infra/prisma/prisma.service';
import { HealthService } from '../../src/modules/health/health.service';

describe('HealthService', () => {
  it('returns ok when the database ping succeeds', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as unknown as PrismaService;
    const service = new HealthService(prisma);

    await expect(service.healthz()).resolves.toEqual({ status: 'ok', db: 'ok' });
  });

  it('emits a Prometheus-compatible up metric', () => {
    const service = new HealthService({} as PrismaService);

    expect(service.metrics()).toContain('licensing_portal_up 1');
  });
});
