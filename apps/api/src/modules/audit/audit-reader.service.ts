import { ForbiddenException, Injectable } from '@nestjs/common';
import { ApplicationAudit, UserRole } from '@prisma/client';

import { verifyAuditChainRows } from '../../infra/audit/audit-chain.verifier';
import { AuditChainVerificationResult } from '../../infra/audit/interfaces/audit-entry.interface';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { PagedResponse } from '../../common/interfaces/paged-response.interface';
import { canViewApplication } from '../applications/access-policy';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { ListAuditQueryDto } from './dto/list-audit-query.dto';
import { ApplicationAuditResponse } from './interfaces/audit-response.interface';

type AuditRowWithActor = ApplicationAudit & {
  actor: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
  } | null;
};

@Injectable()
export class AuditReaderService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    actor: AuthenticatedUser,
    applicationId: string,
    query: ListAuditQueryDto,
  ): Promise<PagedResponse<ApplicationAuditResponse>> {
    await this.assertCanViewAudit(actor, applicationId);
    const page = query.page ?? 0;
    const size = query.size ?? 20;
    const where = { applicationId };
    const [rows, total] = await Promise.all([
      this.prisma.applicationAudit.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              fullName: true,
              role: true,
            },
          },
        },
        orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
        skip: page * size,
        take: size,
      }),
      this.prisma.applicationAudit.count({ where }),
    ]);

    return {
      data: rows.map((row) => this.mapRow(row)),
      meta: { page, size, total, totalPages: Math.max(Math.ceil(total / size), 1) },
    };
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

  private mapRow(row: AuditRowWithActor): ApplicationAuditResponse {
    return {
      id: row.id,
      applicationId: row.applicationId,
      actorId: row.actorId,
      actor: row.actor,
      action: row.action,
      fromState: row.fromState,
      toState: row.toState,
      justification: row.justification,
      sourceIp: row.sourceIp,
      correlationId: row.correlationId,
      payload: row.payload,
      previousHash: row.previousHash,
      entryHash: row.entryHash,
      occurredAt: row.occurredAt,
      clockOffsetMs: row.clockOffsetMs,
    };
  }
}
