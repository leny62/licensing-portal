import { ApplicationState } from '@prisma/client';

import { AuditService } from '../../src/infra/audit/audit.service';
import { PrismaService } from '../../src/infra/prisma/prisma.service';
import { ApplicationSlaService } from '../../src/modules/applications/application-sla.service';
import { ApplicationAction } from '../../src/modules/applications/enums/application-action.enum';

const now = new Date('2026-05-10T10:00:00.000Z');
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

const overdueClock = {
  id: 'clock-1',
  applicationId: 'app-1',
  state: ApplicationState.SUBMITTED,
  startedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
  dueAt: yesterday,
  stoppedAt: null,
  breachedAt: null,
};

const createService = () => {
  const txMock = {
    applicationSlaClock: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };

  const prisma = {
    applicationSlaClock: {
      findMany: jest.fn(),
    },
    transactional: jest.fn().mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
      fn(txMock),
    ),
  };

  const auditService = { write: jest.fn().mockResolvedValue(undefined) };

  return {
    prisma,
    txMock,
    auditService,
    service: new ApplicationSlaService(
      prisma as unknown as PrismaService,
      auditService as unknown as AuditService,
    ),
  };
};

describe('ApplicationSlaService', () => {
  describe('markBreachedClocks', () => {
    it('marks overdue open clocks as breached', async () => {
      const { prisma, txMock, service } = createService();
      prisma.applicationSlaClock.findMany.mockResolvedValue([overdueClock]);

      await service.markBreachedClocks();

      expect(txMock.applicationSlaClock.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: overdueClock.id, breachedAt: null }),
          data: expect.objectContaining({ breachedAt: expect.any(Date) }),
        }),
      );
    });

    it('writes an audit entry when a clock is breached', async () => {
      const { prisma, auditService, service } = createService();
      prisma.applicationSlaClock.findMany.mockResolvedValue([overdueClock]);

      await service.markBreachedClocks();

      expect(auditService.write).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          applicationId: overdueClock.applicationId,
          action: ApplicationAction.SlaBreached,
        }),
      );
    });

    it('is a no-op when no overdue clocks exist', async () => {
      const { prisma, auditService, service } = createService();
      prisma.applicationSlaClock.findMany.mockResolvedValue([]);

      await service.markBreachedClocks();

      expect(auditService.write).not.toHaveBeenCalled();
    });

    it('skips the audit write when the clock was already breached concurrently', async () => {
      const { prisma, txMock, auditService, service } = createService();
      prisma.applicationSlaClock.findMany.mockResolvedValue([overdueClock]);
      txMock.applicationSlaClock.updateMany.mockResolvedValue({ count: 0 });

      await service.markBreachedClocks();

      expect(auditService.write).not.toHaveBeenCalled();
    });
  });
});
