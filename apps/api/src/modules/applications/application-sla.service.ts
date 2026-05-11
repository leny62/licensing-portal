import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { AuditService } from '../../infra/audit/audit.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { ApplicationAction } from './enums/application-action.enum';

@Injectable()
export class ApplicationSlaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  @Cron('*/15 * * * *')
  async markBreachedClocks(): Promise<void> {
    const overdue = await this.prisma.applicationSlaClock.findMany({
      where: {
        dueAt: { lt: new Date() },
        stoppedAt: null,
        breachedAt: null,
      },
      take: 100,
    });

    for (const clock of overdue) {
      await this.prisma.transactional(async (tx) => {
        const updated = await tx.applicationSlaClock.updateMany({
          where: { id: clock.id, breachedAt: null, stoppedAt: null },
          data: { breachedAt: new Date() },
        });

        if (updated.count === 0) {
          return;
        }

        await this.auditService.write(tx, {
          applicationId: clock.applicationId,
          action: ApplicationAction.SlaBreached,
          fromState: clock.state,
          toState: clock.state,
          payload: {
            clockId: clock.id,
            state: clock.state,
            dueAt: clock.dueAt.toISOString(),
          },
        });
      });
    }
  }
}
