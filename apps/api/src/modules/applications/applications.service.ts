import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  Application,
  ApplicationDecisionOutcome,
  ApplicationState,
  BankCategory,
  ComplianceFindingStatus,
  ComplianceFindingSeverity,
  DecisionType,
  FeeStatus,
  FitAndProperStatus,
  NotificationType,
  Prisma,
  SeniorManagerRole,
  UserRole,
} from '@prisma/client';

import {
  ConflictError,
  ResourceNotFoundError,
  VersionConflictError,
} from '../../common/errors/domain.errors';
import { PagedResponse } from '../../common/interfaces/paged-response.interface';
import { AuditService } from '../../infra/audit/audit.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { canEditDraft, canViewApplication } from './access-policy';
import { applicationFeeRwf } from './application-fees';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ListApplicationsQueryDto } from './dto/transition.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { ApplicationAction } from './enums/application-action.enum';
import { ApplicationDecision } from './enums/application-decision.enum';
import { ComplianceCheckStatus } from './enums/compliance-check-status.enum';
import { ApplicationResponse } from './interfaces/application-response.interface';
import { ComplianceChecklistResponse } from './interfaces/compliance-checklist.interface';
import { requiredPaidUpCapitalRwf } from './capital-requirements';
import { buildComplianceChecklist } from './regulatory-compliance';
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

    await this.assertPaidUpCapitalMeetsMinimum(dto.bankCategory, dto.paidUpCapitalRwf);

    return this.prisma.transactional(async (tx) => {
      const application = await tx.application.create({
        data: {
          applicantId: actor.id,
          institutionName: dto.institutionName,
          ...(dto.applicationKind !== undefined ? { applicationKind: dto.applicationKind } : {}),
          bankCategory: dto.bankCategory,
          paidUpCapitalRwf: dto.paidUpCapitalRwf,
          legalForm: dto.legalForm,
          country: dto.country,
          contactPerson: dto.contactPerson,
          contactEmail: dto.contactEmail,
          contactPhone: dto.contactPhone,
          summary: dto.summary,
        },
      });
      await tx.applicationFee.create({
        data: {
          applicationId: application.id,
          amountRwf: BigInt(applicationFeeRwf(application.applicationKind)),
          status: FeeStatus.PENDING,
        },
      });

      await this.auditService.write(tx, {
        applicationId: application.id,
        actorId: actor.id,
        action: ApplicationAction.CreateDraft,
        toState: application.state,
        payload: {
          referenceNumber: application.referenceNumber,
          institutionName: application.institutionName,
          applicationKind: application.applicationKind,
          bankCategory: application.bankCategory,
          paidUpCapitalRwf: application.paidUpCapitalRwf.toString(),
        },
      });

      return this.mapApplication(application);
    });
  }

  async list(
    actor: AuthenticatedUser,
    query: ListApplicationsQueryDto,
  ): Promise<PagedResponse<ApplicationResponse>> {
    const page = query.page ?? 0;
    const size = query.size ?? 20;

    const where: Prisma.ApplicationWhereInput = {
      ...this.roleScopedWhere(actor),
      ...(query.state !== undefined && query.state.length > 0
        ? { state: { in: query.state } }
        : {}),
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

  async compliance(actor: AuthenticatedUser, id: string): Promise<ComplianceChecklistResponse> {
    const application = await this.findApplicationOrThrow(id);
    this.assertCanView(actor, application);

    return this.complianceFor(application);
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

    await this.assertPaidUpCapitalMeetsMinimum(
      dto.bankCategory ?? application.bankCategory,
      dto.paidUpCapitalRwf ?? Number(application.paidUpCapitalRwf),
    );

    return this.prisma.transactional(async (tx) => {
      const updated = await tx.application.update({
        where: { id: application.id },
        data: dto,
      });

      await this.auditService.write(tx, {
        applicationId: application.id,
        actorId: actor.id,
        action: ApplicationAction.UpdateDraft,
        fromState: application.state,
        toState: updated.state,
        payload: {
          changedFields: Object.keys(dto),
          rowVersion: application.rowVersion,
        },
      });

      return this.mapApplication(updated);
    });
  }

  async submit(actor: AuthenticatedUser, id: string): Promise<ApplicationResponse> {
    await this.assertComplianceReady(actor, id);
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
    await this.assertComplianceReady(actor, id);
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
    structured?: {
      decisionType?: DecisionType;
      conditions?: Array<{ text: string; satisfactionDate: string }>;
      allowedActivities?: string;
      refusalReasons?: Array<{ reason: string; articleCitation: string }>;
    },
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
        ...structured,
      },
    );
  }

  async defer(
    actor: AuthenticatedUser,
    id: string,
    justification: string,
  ): Promise<ApplicationResponse> {
    return this.transition(actor, id, ApplicationAction.Defer, {
      approverId: actor.id,
      justification,
    });
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
      decisionType?: DecisionType;
      conditions?: Array<{ text: string; satisfactionDate: string }>;
      allowedActivities?: string;
      refusalReasons?: Array<{ reason: string; articleCitation: string }>;
    },
  ): Promise<ApplicationResponse> {
    return this.prisma.transactional(async (tx) => {
      const target = await this.findApplicationOrThrow(id);
      await tx.$queryRaw`SELECT id FROM applications WHERE id = ${target.id}::uuid FOR UPDATE`;
      const application = await tx.application.findUnique({ where: { id: target.id } });

      if (application === null) {
        throw new ResourceNotFoundError('Application not found.');
      }

      this.assertCanView(actor, application);

      const context = {
        applicationId: target.id,
        applicantId: application.applicantId,
        reviewerId: application.reviewerId,
        reviewerHistoryIds: await this.reviewerHistoryIds(tx, application),
        hasRequiredDocuments:
          (await tx.applicationDocument.count({ where: { applicationId: target.id } })) > 0,
        hasDocumentAfterLastRequest:
          (await tx.applicationDocument.count({
            where: { applicationId: target.id, createdAt: { gt: application.updatedAt } },
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
        where: { id: target.id, rowVersion: application.rowVersion },
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
        applicationId: target.id,
        actorId: actor.id,
        action,
        fromState: application.state,
        toState: result.nextState,
        payload: { rowVersion: application.rowVersion },
        ...(data.justification !== undefined ? { justification: data.justification } : {}),
      });

      await this.createDecisionRecord(tx, application, result.nextState, action, actor.id, data);
      await this.advanceSlaClock(tx, application, result.nextState);
      const refreshed = await tx.application.findUniqueOrThrow({ where: { id: target.id } });
      await this.createTransitionNotifications(tx, application, refreshed, action, actor.id);

      return this.mapApplication(refreshed);
    });
  }

  private async createTransitionNotifications(
    tx: Prisma.TransactionClient,
    previous: Application,
    current: Application,
    action: ApplicationAction,
    actorId: string,
  ): Promise<void> {
    const payload = {
      referenceNumber: current.referenceNumber,
      institutionName: current.institutionName,
      action,
      fromState: previous.state,
      toState: current.state,
      actorId,
    };

    if (action === ApplicationAction.RequestInfo) {
      await tx.notification.create({
        data: {
          userId: current.applicantId,
          applicationId: current.id,
          type: NotificationType.REQUEST_INFO,
          payload,
        },
      });
      return;
    }

    if (action === ApplicationAction.Approve || action === ApplicationAction.Reject) {
      await tx.notification.create({
        data: {
          userId: current.applicantId,
          applicationId: current.id,
          type: NotificationType.FINAL_DECISION,
          payload,
        },
      });
      return;
    }

    if (
      action === ApplicationAction.RecommendApproval ||
      action === ApplicationAction.RecommendRejection
    ) {
      const approvers = await tx.user.findMany({
        where: { role: UserRole.APPROVER, isActive: true },
        select: { id: true },
      });

      if (approvers.length === 0) {
        return;
      }

      await tx.notification.createMany({
        data: approvers.map((approver) => ({
          userId: approver.id,
          applicationId: current.id,
          type: NotificationType.RECOMMENDATION_READY,
          payload,
        })),
      });
    }
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

  private async createDecisionRecord(
    tx: Prisma.TransactionClient,
    application: Application,
    nextState: ApplicationState,
    action: ApplicationAction,
    actorId: string,
    data: {
      justification?: string;
      decisionType?: DecisionType;
      conditions?: Array<{ text: string; satisfactionDate: string }>;
      allowedActivities?: string;
      refusalReasons?: Array<{ reason: string; articleCitation: string }>;
    },
  ): Promise<void> {
    const outcome = this.decisionOutcome(action);

    if (outcome === null || data.justification === undefined) {
      return;
    }

    await tx.applicationDecisionRecord.create({
      data: {
        applicationId: application.id,
        actorId,
        outcome,
        decisionType: data.decisionType ?? null,
        fromState: application.state,
        toState: nextState,
        justification: data.justification,
        conditions: data.conditions ? JSON.parse(JSON.stringify(data.conditions)) : undefined,
        allowedActivities: data.allowedActivities ?? null,
        refusalReasons: data.refusalReasons
          ? JSON.parse(JSON.stringify(data.refusalReasons))
          : undefined,
      },
    });
  }

  private decisionOutcome(action: ApplicationAction): ApplicationDecisionOutcome | null {
    if (action === ApplicationAction.Approve || action === ApplicationAction.RecommendApproval) {
      return ApplicationDecisionOutcome.APPROVE;
    }

    if (action === ApplicationAction.Reject || action === ApplicationAction.RecommendRejection) {
      return ApplicationDecisionOutcome.REJECT;
    }

    if (action === ApplicationAction.RequestInfo) {
      return ApplicationDecisionOutcome.REQUEST_INFORMATION;
    }

    if (action === ApplicationAction.Defer) {
      return ApplicationDecisionOutcome.DEFER;
    }

    return null;
  }

  private async advanceSlaClock(
    tx: Prisma.TransactionClient,
    application: Application,
    nextState: ApplicationState,
  ): Promise<void> {
    await tx.applicationSlaClock.updateMany({
      where: { applicationId: application.id, stoppedAt: null },
      data: { stoppedAt: new Date() },
    });

    if (
      nextState === ApplicationState.APPROVED ||
      nextState === ApplicationState.REJECTED ||
      nextState === ApplicationState.WITHDRAWN
    ) {
      return;
    }

    await tx.applicationSlaClock.create({
      data: {
        applicationId: application.id,
        state: nextState,
        dueAt: this.slaDueAt(nextState),
      },
    });
  }

  private slaDueAt(state: ApplicationState): Date {
    const daysByState: Partial<Record<ApplicationState, number>> = {
      [ApplicationState.SUBMITTED]: 7,
      [ApplicationState.UNDER_REVIEW]: 14,
      [ApplicationState.AWAITING_APPLICANT_RESPONSE]: 10,
      [ApplicationState.RECOMMENDED_FOR_APPROVAL]: 5,
      [ApplicationState.RECOMMENDED_FOR_REJECTION]: 5,
    };
    const days = daysByState[state] ?? 7;

    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  private async findApplicationOrThrow(identifier: string): Promise<Application> {
    const application = this.isUuid(identifier)
      ? await this.prisma.application.findUnique({ where: { id: identifier } })
      : await this.prisma.application.findUnique({ where: { referenceNumber: identifier } });

    if (application === null) {
      throw new ResourceNotFoundError('Application not found.');
    }

    return application;
  }

  private async complianceFor(application: Application): Promise<ComplianceChecklistResponse> {
    const documents = await this.prisma.applicationDocument.findMany({
      where: { applicationId: application.id },
      select: { id: true, slot: true, version: true },
      orderBy: [{ slot: 'asc' }, { version: 'desc' }],
    });
    const [threshold, capitalDeclaration, shareholders, seniorManagers, fee] = await Promise.all([
      this.requiredCapitalFor(application.bankCategory),
      this.prisma.capitalDeclaration.findUnique({ where: { applicationId: application.id } }),
      this.prisma.significantShareholder.findMany({
        where: { applicationId: application.id },
        select: { ownershipPercent: true, fitAndProperStatus: true },
      }),
      this.prisma.seniorManager.findMany({
        where: { applicationId: application.id, fitAndProperAttested: true },
        select: { role: true },
      }),
      this.prisma.applicationFee.findUnique({ where: { applicationId: application.id } }),
    ]);
    const seniorManagerRoles = new Set(seniorManagers.map((manager) => manager.role));

    const checklist = buildComplianceChecklist(
      {
        id: application.id,
        referenceNumber: application.referenceNumber,
        applicationKind: application.applicationKind,
        bankCategory: application.bankCategory,
        paidUpCapitalRwf: application.paidUpCapitalRwf,
        requiredPaidUpCapitalRwf: threshold,
        capitalDeclarationAmountRwf: capitalDeclaration?.amountRwf.toString() ?? null,
        shareholderCount: shareholders.length,
        shareholderOwnershipTotal: shareholders.reduce(
          (sum, shareholder) => sum + Number(shareholder.ownershipPercent.toString()),
          0,
        ),
        shareholderFitAndProperFailed: shareholders.some(
          (shareholder) => shareholder.fitAndProperStatus === FitAndProperStatus.FAILED,
        ),
        hasRequiredSeniorManagers:
          seniorManagerRoles.has(SeniorManagerRole.CHIEF_EXECUTIVE) &&
          seniorManagerRoles.has(SeniorManagerRole.CHIEF_FINANCE) &&
          seniorManagerRoles.has(SeniorManagerRole.CHIEF_RISK) &&
          seniorManagerRoles.has(SeniorManagerRole.CHIEF_COMPLIANCE),
        feeProofSubmitted:
          fee?.status === FeeStatus.PROOF_SUBMITTED || fee?.status === FeeStatus.VERIFIED,
        country: application.country,
      },
      documents,
    );

    await this.syncComplianceFindings(application.id, checklist);

    return checklist;
  }

  private async assertComplianceReady(actor: AuthenticatedUser, id: string): Promise<void> {
    const application = await this.findApplicationOrThrow(id);
    this.assertCanView(actor, application);
    const checklist = await this.complianceFor(application);

    if (checklist.summary.blockingMissing > 0) {
      throw new ConflictError(
        'Regulatory checklist has blocking gaps. Complete required evidence before submission.',
        {
          missingRequirements: checklist.sections.flatMap((section) =>
            section.items
              .filter((item) => item.blocking && item.status !== ComplianceCheckStatus.Complete)
              .map((item) => ({
                section: section.title,
                title: item.title,
                requiredSlots: item.requiredSlots,
              })),
          ),
        },
      );
    }
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
      applicationKind: application.applicationKind,
      bankCategory: application.bankCategory,
      paidUpCapitalRwf: application.paidUpCapitalRwf.toString(),
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

  private async syncComplianceFindings(
    applicationId: string,
    checklist: ComplianceChecklistResponse,
  ): Promise<void> {
    const openCodes = new Set(checklist.findings.map((finding) => finding.code));

    await this.prisma.transactional(async (tx) => {
      for (const finding of checklist.findings) {
        await tx.complianceFinding.upsert({
          where: { applicationId_code: { applicationId, code: finding.code } },
          create: {
            applicationId,
            code: finding.code,
            section: finding.section,
            title: finding.title,
            detail: finding.detail,
            severity: finding.severity as ComplianceFindingSeverity,
            status: ComplianceFindingStatus.OPEN,
            regulatoryBasis: finding.regulatoryBasis,
            evidence: finding.evidence as unknown as Prisma.JsonArray,
          },
          update: {
            section: finding.section,
            title: finding.title,
            detail: finding.detail,
            severity: finding.severity as ComplianceFindingSeverity,
            status: ComplianceFindingStatus.OPEN,
            regulatoryBasis: finding.regulatoryBasis,
            evidence: finding.evidence as unknown as Prisma.JsonArray,
            resolvedAt: null,
          },
        });
      }

      await tx.complianceFinding.updateMany({
        where: {
          applicationId,
          code: { notIn: [...openCodes] },
          status: ComplianceFindingStatus.OPEN,
        },
        data: { status: ComplianceFindingStatus.RESOLVED, resolvedAt: new Date() },
      });
    });
  }

  private async assertPaidUpCapitalMeetsMinimum(
    category: BankCategory,
    paidUpCapitalRwf: number,
  ): Promise<void> {
    const requiredCapital = await this.requiredCapitalFor(category);

    if (paidUpCapitalRwf < requiredCapital) {
      throw new BadRequestException(
        `${category} applications require minimum paid-up capital of RWF ${requiredCapital}.`,
      );
    }
  }

  private async requiredCapitalFor(category: BankCategory): Promise<number> {
    const threshold = await this.prisma.bankCategoryThreshold.findUnique({
      where: { category },
      select: { minimumRwf: true },
    });

    return threshold === null
      ? requiredPaidUpCapitalRwf(category)
      : Number(threshold.minimumRwf.toString());
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }
}
