import { ForbiddenException, Injectable } from '@nestjs/common';
import { ApplicationAudit } from '@prisma/client';

import { verifyAuditChainRows } from '../../infra/audit/audit-chain.verifier';
import { AuditChainVerificationResult } from '../../infra/audit/interfaces/audit-entry.interface';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { canViewApplication } from '../applications/access-policy';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { ApplicationAuditResponse } from './interfaces/audit-response.interface';

@Injectable()
export class AuditReaderService {
  constructor(private readonly prisma: PrismaService) {}

  async list(actor: AuthenticatedUser, applicationId: string): Promise<ApplicationAuditResponse[]> {
    await this.assertCanViewAudit(actor, applicationId);
    const rows = await this.prisma.applicationAudit.findMany({
      where: { applicationId },
      orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
      take: 100,
    });

    return rows.map((row) => this.mapRow(row));
  }

  async verify(
    actor: AuthenticatedUser,
    applicationId: string,
  ): Promise<AuditChainVerificationResult> {
    await this.assertCanViewAudit(actor, applicationId);
    const rows = await this.prisma.applicationAudit.findMany({
      where: { applicationId },
      orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
    });

    return verifyAuditChainRows(rows);
  }

  private async assertCanViewAudit(actor: AuthenticatedUser, applicationId: string): Promise<void> {
    const application = await this.prisma.application.findUnique({ where: { id: applicationId } });

    if (application === null || !canViewApplication(actor, application)) {
      throw new ForbiddenException('Access denied.');
    }
  }

  private mapRow(row: ApplicationAudit): ApplicationAuditResponse {
    return {
      id: row.id,
      applicationId: row.applicationId,
      actorId: row.actorId,
      action: row.action,
      fromState: row.fromState,
      toState: row.toState,
      justification: row.justification,
      payload: row.payload,
      previousHash: row.previousHash,
      entryHash: row.entryHash,
      occurredAt: row.occurredAt,
    };
  }
}
