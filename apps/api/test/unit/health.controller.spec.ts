import { UnauthorizedException } from '@nestjs/common';

import { HealthController } from '../../src/modules/health/health.controller';
import { HealthService } from '../../src/modules/health/health.service';

describe('HealthController', () => {
  const healthService = {
    metrics: jest.fn().mockResolvedValue('licensing_portal_up 1'),
  } as unknown as HealthService;

  it('allows metrics without a configured bearer token', async () => {
    const controller = new HealthController(healthService, {
      get: jest.fn(() => undefined),
    } as never);

    await expect(controller.metrics()).resolves.toBe('licensing_portal_up 1');
  });

  it('rejects metrics when the bearer token is missing', async () => {
    const controller = new HealthController(healthService, {
      get: jest.fn(() => 'm'.repeat(32)),
    } as never);

    await expect(controller.metrics()).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('allows metrics with the configured bearer token', async () => {
    const token = 'm'.repeat(32);
    const controller = new HealthController(healthService, {
      get: jest.fn(() => token),
    } as never);

    await expect(controller.metrics(`Bearer ${token}`)).resolves.toBe('licensing_portal_up 1');
  });
});
