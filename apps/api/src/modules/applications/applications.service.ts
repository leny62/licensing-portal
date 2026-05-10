import { ForbiddenException, Injectable } from '@nestjs/common';
import { Application, ApplicationState, Prisma, UserRole } from '@prisma/client';

import { ResourceNotFoundError, VersionConflictError } from '../../common/errors/domain.errors';
import { PagedResponse } from '../../common/interfaces/paged-response.interface';
import { AuditService } from '../../infra/audit/audit.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { canEditDraft, canViewApplication } from './access-policy';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ListApplicationsQueryDto } from './dto/transition.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { ApplicationAction } from './enums/application-action.enum';
import { ApplicationDecision } from './enums/application-decision.enum';
import { ApplicationResponse } from './interfaces/application-response.interface';
import { transitionApplication } from './state-machine';

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createDraft(
    actor: AuthenticatedUser,
    dto: CreateApplicationDto,
  ): Promise<ApplicationResponse> {
    if (actor.role !== UserRole.APPLICANT) {
      throw new ForbiddenException('Only applicants can create applications.');
    }

    return this.mapApplication(
      await this.prisma.application.create({
        data: {
          applicantId: actor.id,
          institutionName: dto.institutionName,
          legalForm: dto.legalForm,
          country: dto.country,
          contactPerson: dto.contactPerson,
          contactEmail: dto.contactEmail,
          contactPhone: dto.contactPhone,
          summary: dto.summary,
        },
      }),
    );
  }

  async list(
    actor: AuthenticatedUser,
    query: ListApplicationsQueryDto,
  ): Promise<PagedResponse<ApplicationResponse>> {
    const page = query.page ?? 0;
    const size = query.size ?? 20;

    const where: Prisma.ApplicationWhereInput = {
      ...this.roleScopedWhere(actor),
      ...(query.state !== undefined ? { state: query.state } : {}),
      ...(query.reviewerId !== undefined ? { reviewerId: query.reviewerId } : {}),
      ...(query.q !== undefined
        ? {
            OR: [
              { referenceNumber: { contains: query.q, mode: 'insensitive' } },
              { institutionName: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, applications] = await this.prisma.$transaction([
      this.prisma.application.count({ where }),
      this.prisma.application.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: page * size,
        take: size,
      }),
    ]);

    return {
      data: applications.map((a) => this.mapApplication(a)),
      meta: { page, size, total, totalPages: Math.max(Math.ceil(total / size), 1) },
    };
  }

  async get(actor: AuthenticatedUser, id: string): Promise<ApplicationResponse> {
    const application = await this.findApplicationOrThrow(id);
    this.assertCanView(actor, application);

    return this.mapApplication(application);
  }

  async updateDraft(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateApplicationDto,
  ): Promise<ApplicationResponse> {
    const application = await this.findApplicationOrThrow(id);

    if (!canEditDraft(actor, application)) {
      throw new ForbiddenException('Only the applicant can edit their draft.');
    }

    return this.mapApplication(
      await this.prisma.application.update({
        where: { id },
        data: dto,
      }),
    );
  }

  async submit(actor: AuthenticatedUser, id: string): Promise<ApplicationResponse> {
    return this.transition(actor, id, ApplicationAction.Submit, {});
  }

  async withdraw(actor: AuthenticatedUser, id: string): Promise<ApplicationResponse> {
    return this.transition(actor, id, ApplicationAction.Withdraw, {});
  }

  async claim(actor: AuthenticatedUser, id: string): Promise<ApplicationResponse> {
    return this.transition(actor, id, ApplicationAction.Claim, { reviewerId: actor.id });
  }

  async assign(
    actor: AuthenticatedUser,
    id: string,
    reviewerId: string,
  ): Promise<ApplicationResponse> {
    return this.transition(actor, id, ApplicationAction.Assign, { reviewerId });
  }

  async requestInfo(
    actor: AuthenticatedUser,
    id: string,
    justification: string,
  ): Promise<ApplicationResponse> {
    return this.transition(actor, id, ApplicationAction.RequestInfo, { justification });
  }

  async resubmit(actor: AuthenticatedUser, id: string): Promise<ApplicationResponse> {
    return this.transition(actor, id, ApplicationAction.Resubmit, { lastResubmitAt: new Date() });
  }

  async recommend(
    actor: AuthenticatedUser,
    id: string,
    recommendation: ApplicationDecision,
    justification: string,
  ): Promise<ApplicationResponse> {
    return this.transition(
      actor,
      id,
      recommendation === ApplicationDecision.Approve
        ? ApplicationAction.RecommendApproval
        : ApplicationAction.RecommendRejection,
      { justification },
    );
  }

  async decide(
    actor: AuthenticatedUser,
    id: string,
    decision: ApplicationDecision,
    justification: string,
  ): Promise<ApplicationResponse> {
    return this.transition(
      actor,
      id,
      decision === ApplicationDecision.Approve
        ? ApplicationAction.Approve
        : ApplicationAction.Reject,
      {
        approverId: actor.id,
        decidedAt: new Date(),
        justification,
      },
    );
  }

  private async transition(
    actor: AuthenticatedUser,
    id: string,
    action: ApplicationAction,
    data: {
      reviewerId?: string;
      approverId?: string;
      justification?: string;
      decidedAt?: Date;
      lastResubmitAt?: Date;
    },
  ): Promise<ApplicationResponse> {
    return this.prisma.transactional(async (tx) => {
      await tx.$queryRaw`SELECT id FROM applications WHERE id = ${id}::uuid FOR UPDATE`;
      const application = await tx.application.findUnique({ where: { id } });

      if (application === null) {
        throw new ResourceNotFoundError('Application not found.');
      }

      this.assertCanView(actor, application);

      const context = {
        applicationId: application.id,
        applicantId: application.applicantId,
        reviewerId: application.reviewerId,
        reviewerHistoryIds: await this.reviewerHistoryIds(tx, application),
        hasRequiredDocuments:
          (await tx.applicationDocument.count({ where: { applicationId: id } })) > 0,
        hasDocumentAfterLastRequest:
          (await tx.applicationDocument.count({
            where: { applicationId: id, createdAt: { gt: application.updatedAt } },
          })) > 0,
      };

      const result = transitionApplication({
        currentState: application.state,
        action,
        actor,
        context,
        ...(data.justification !== undefined ? { justification: data.justification } : {}),
      });

      const updated = await tx.application.updateMany({
        where: { id, rowVersion: application.rowVersion },
        data: {
          state: result.nextState,
          rowVersion: { increment: 1 },
          ...(data.reviewerId !== undefined ? { reviewerId: data.reviewerId } : {}),
          ...(data.approverId !== undefined ? { approverId: data.approverId } : {}),
          ...(data.justification !== undefined ? { justification: data.justification } : {}),
          ...(data.decidedAt !== undefined ? { decidedAt: data.decidedAt } : {}),
          ...(data.lastResubmitAt !== undefined ? { lastResubmitAt: data.lastResubmitAt } : {}),
          ...(action === ApplicationAction.Submit ? { submittedAt: new Date() } : {}),
        },
      });

      if (updated.count === 0) {
        throw new VersionConflictError(id);
      }

      await this.auditService.write(tx, {
        applicationId: id,
        actorId: actor.id,
        action,
        fromState: application.state,
        toState: result.nextState,
        payload: { rowVersion: application.rowVersion },
        ...(data.justification !== undefined ? { justification: data.justification } : {}),
      });

      const refreshed = await tx.application.findUniqueOrThrow({ where: { id } });

      return this.mapApplication(refreshed);
    });
  }

  private async reviewerHistoryIds(
    tx: Prisma.TransactionClient,
    application: Application,
  ): Promise<string[]> {
    const auditRows = await tx.applicationAudit.findMany({
      where: {
        applicationId: application.id,
        action: {
          in: [
            ApplicationAction.Claim,
            ApplicationAction.RecommendApproval,
            ApplicationAction.RecommendRejection,
          ],
        },
        actorId: { not: null },
      },
      select: { actorId: true },
    });
    const ids = new Set(auditRows.flatMap((row) => (row.actorId === null ? [] : [row.actorId])));

    if (application.reviewerId !== null) {
      ids.add(application.reviewerId);
    }

    return [...ids];
  }

  private roleScopedWhere(actor: AuthenticatedUser): Prisma.ApplicationWhereInput {
    if (actor.role === UserRole.ADMIN) {
      return {};
    }

    if (actor.role === UserRole.APPLICANT) {
      return { applicantId: actor.id };
    }

    if (actor.role === UserRole.REVIEWER) {
      return { OR: [{ state: ApplicationState.SUBMITTED }, { reviewerId: actor.id }] };
    }

    return {
      OR: [
        { state: ApplicationState.RECOMMENDED_FOR_APPROVAL },
        { state: ApplicationState.RECOMMENDED_FOR_REJECTION },
        { approverId: actor.id },
      ],
    };
  }

  private async findApplicationOrThrow(id: string): Promise<Application> {
    const application = await this.prisma.application.findUnique({ where: { id } });

    if (application === null) {
      throw new ResourceNotFoundError('Application not found.');
    }

    return application;
  }

  private assertCanView(actor: AuthenticatedUser, application: Application): void {
    if (!canViewApplication(actor, application)) {
      throw new ForbiddenException('Access denied.');
    }
  }

  private mapApplication(application: Application): ApplicationResponse {
    return {
      id: application.id,
      referenceNumber: application.referenceNumber,
      applicantId: application.applicantId,
      institutionName: application.institutionName,
      legalForm: application.legalForm,
      country: application.country,
      contactPerson: application.contactPerson,
      contactEmail: application.contactEmail,
      contactPhone: application.contactPhone,
      summary: application.summary,
      state: application.state,
      rowVersion: application.rowVersion,
      reviewerId: application.reviewerId,
      approverId: application.approverId,
      submittedAt: application.submittedAt,
      lastResubmitAt: application.lastResubmitAt,
      decidedAt: application.decidedAt,
      justification: application.justification,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
    };
  }
}
