import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  Application,
  ApplicationSlaClock,
  ApplicationState,
  BankCategory,
  CapitalDeclaration,
  ComplianceFinding,
  DocumentSlot,
  FeeStatus,
  FitAndProperStatus,
  InformationLetter,
  SeniorManager,
  SeniorManagerRole,
  SignificantShareholder,
  UserRole,
} from '@prisma/client';

import { ConflictError, ResourceNotFoundError } from '../../common/errors/domain.errors';
import { AuditService } from '../../infra/audit/audit.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { canViewApplication } from './access-policy';
import { applicationFeeRwf } from './application-fees';
import {
  CreateSeniorManagerDto,
  CreateSignificantShareholderDto,
  IssueInformationLetterDto,
  MarkShareholderFitAndProperDto,
  SubmitFeeProofDto,
  UpdateSeniorManagerDto,
  UpdateSignificantShareholderDto,
  UpsertCapitalDeclarationDto,
} from './dto/regulatory.dto';
import { ApplicationAction } from './enums/application-action.enum';
import {
  ApplicationDecisionRecordResponse,
  ApplicationFeeResponse,
  ApplicationSlaClockResponse,
  CapitalDeclarationResponse,
  ComplianceFindingRecordResponse,
  DocumentSlotSpecResponse,
  InformationLetterResponse,
  SeniorManagerResponse,
  SignificantShareholderResponse,
} from './interfaces/regulatory-response.interface';
import { renderInformationLetterPdfTemplate } from './information-letter-pdf.renderer';

const editableStates = new Set<ApplicationState>([
  ApplicationState.DRAFT,
  ApplicationState.AWAITING_APPLICANT_RESPONSE,
]);

const requiredManagerRoles = new Set<SeniorManagerRole>([
  SeniorManagerRole.CHIEF_EXECUTIVE,
  SeniorManagerRole.CHIEF_FINANCE,
  SeniorManagerRole.CHIEF_RISK,
  SeniorManagerRole.CHIEF_COMPLIANCE,
]);

const permittedActivitiesByCategory: Record<BankCategory, string[]> = {
  [BankCategory.COMMERCIAL_BANK]: [
    'Accept deposits from the public',
    'Grant credit facilities',
    'Provide payment and money transfer services',
    'Issue guarantees and letters of credit',
    'Conduct treasury and foreign exchange operations',
  ],
  [BankCategory.DEVELOPMENT_BANK]: [
    'Provide medium and long-term development finance',
    'Finance infrastructure and productive-sector projects',
    'Provide guarantees for development projects',
    'Mobilise wholesale and institutional funding',
  ],
  [BankCategory.COOPERATIVE_BANK]: [
    'Accept deposits from cooperative members',
    'Grant credit to cooperative members',
    'Provide payment services to cooperative members',
    'Support cooperative savings and lending operations',
  ],
  [BankCategory.MORTGAGE_BANK]: [
    'Provide mortgage lending',
    'Finance housing and real estate development',
    'Mobilise long-term housing finance',
    'Service mortgage-backed lending portfolios',
  ],
};

@Injectable()
export class RegulatoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async upsertCapitalDeclaration(
    actor: AuthenticatedUser,
    applicationIdentifier: string,
    dto: UpsertCapitalDeclarationDto,
  ): Promise<CapitalDeclarationResponse> {
    const application = await this.findEditableApplication(actor, applicationIdentifier);

    return this.prisma.transactional(async (tx) => {
      const row = await tx.capitalDeclaration.upsert({
        where: { applicationId: application.id },
        create: {
          applicationId: application.id,
          amountRwf: BigInt(dto.amountRwf),
          sourceSummary: dto.sourceSummary,
          attestedAt: new Date(),
          attestedByUserId: actor.id,
        },
        update: {
          amountRwf: BigInt(dto.amountRwf),
          sourceSummary: dto.sourceSummary,
          attestedAt: new Date(),
          attestedByUserId: actor.id,
        },
      });

      await this.auditService.write(tx, {
        applicationId: application.id,
        actorId: actor.id,
        action: ApplicationAction.UpsertCapitalDeclaration,
        fromState: application.state,
        toState: application.state,
        payload: { amountRwf: dto.amountRwf },
      });

      return this.mapCapitalDeclaration(row);
    });
  }

  async getCapitalDeclaration(
    actor: AuthenticatedUser,
    applicationIdentifier: string,
  ): Promise<CapitalDeclarationResponse | null> {
    const application = await this.findViewableApplication(actor, applicationIdentifier);
    const row = await this.prisma.capitalDeclaration.findUnique({
      where: { applicationId: application.id },
    });

    return row === null ? null : this.mapCapitalDeclaration(row);
  }

  async listShareholders(
    actor: AuthenticatedUser,
    applicationIdentifier: string,
  ): Promise<SignificantShareholderResponse[]> {
    const application = await this.findViewableApplication(actor, applicationIdentifier);
    const rows = await this.prisma.significantShareholder.findMany({
      where: { applicationId: application.id },
      orderBy: [{ ownershipPercent: 'desc' }, { fullName: 'asc' }],
    });

    return rows.map((row) => this.mapShareholder(row));
  }

  async createShareholder(
    actor: AuthenticatedUser,
    applicationIdentifier: string,
    dto: CreateSignificantShareholderDto,
  ): Promise<SignificantShareholderResponse> {
    const application = await this.findEditableApplication(actor, applicationIdentifier);
    await this.assertOwnershipTotal(application.id, dto.ownershipPercent);

    return this.prisma.transactional(async (tx) => {
      const row = await tx.significantShareholder.create({
        data: {
          applicationId: application.id,
          shareholderType: dto.shareholderType,
          fullName: dto.fullName,
          registrationNumber: dto.registrationNumber ?? null,
          country: dto.country,
          ownershipPercent: dto.ownershipPercent,
          sourceOfFunds: dto.sourceOfFunds,
          beneficialOwner: dto.beneficialOwner ?? null,
          attestedAt: new Date(),
          attestedByUserId: actor.id,
        },
      });

      await this.auditService.write(tx, {
        applicationId: application.id,
        actorId: actor.id,
        action: ApplicationAction.CreateShareholder,
        fromState: application.state,
        toState: application.state,
        payload: { shareholderId: row.id, ownershipPercent: dto.ownershipPercent },
      });

      return this.mapShareholder(row);
    });
  }

  async updateShareholder(
    actor: AuthenticatedUser,
    applicationIdentifier: string,
    shareholderId: string,
    dto: UpdateSignificantShareholderDto,
  ): Promise<SignificantShareholderResponse> {
    const application = await this.findEditableApplication(actor, applicationIdentifier);
    const existing = await this.findShareholderOrThrow(application.id, shareholderId);

    if (dto.ownershipPercent !== undefined) {
      await this.assertOwnershipTotal(application.id, dto.ownershipPercent, existing.id);
    }

    return this.prisma.transactional(async (tx) => {
      const row = await tx.significantShareholder.update({
        where: { id: shareholderId },
        data: {
          ...dto,
          attestedAt: new Date(),
          attestedByUserId: actor.id,
        },
      });

      await this.auditService.write(tx, {
        applicationId: application.id,
        actorId: actor.id,
        action: ApplicationAction.UpdateShareholder,
        fromState: application.state,
        toState: application.state,
        payload: { shareholderId, changedFields: Object.keys(dto) },
      });

      return this.mapShareholder(row);
    });
  }

  async deleteShareholder(
    actor: AuthenticatedUser,
    applicationIdentifier: string,
    shareholderId: string,
  ): Promise<void> {
    const application = await this.findEditableApplication(actor, applicationIdentifier);
    await this.findShareholderOrThrow(application.id, shareholderId);

    await this.prisma.transactional(async (tx) => {
      await tx.significantShareholder.delete({ where: { id: shareholderId } });
      await this.auditService.write(tx, {
        applicationId: application.id,
        actorId: actor.id,
        action: ApplicationAction.DeleteShareholder,
        fromState: application.state,
        toState: application.state,
        payload: { shareholderId },
      });
    });
  }

  async markShareholderFitAndProper(
    actor: AuthenticatedUser,
    applicationIdentifier: string,
    shareholderId: string,
    dto: MarkShareholderFitAndProperDto,
  ): Promise<SignificantShareholderResponse> {
    const application = await this.findViewableApplication(actor, applicationIdentifier);

    if (
      actor.role !== UserRole.REVIEWER ||
      application.reviewerId !== actor.id ||
      application.state !== ApplicationState.UNDER_REVIEW
    ) {
      throw new ForbiddenException('Shareholder review is not available for this account.');
    }

    if (dto.status === FitAndProperStatus.PENDING) {
      throw new ConflictError('Fit-and-proper review must be cleared or failed.');
    }

    await this.findShareholderOrThrow(application.id, shareholderId);

    return this.prisma.transactional(async (tx) => {
      const row = await tx.significantShareholder.update({
        where: { id: shareholderId },
        data: {
          fitAndProperStatus: dto.status,
          fitAndProperReviewedAt: new Date(),
          fitAndProperReviewedById: actor.id,
          fitAndProperJustification: dto.justification,
        },
      });

      await this.auditService.write(tx, {
        applicationId: application.id,
        actorId: actor.id,
        action: ApplicationAction.MarkShareholderFitAndProper,
        fromState: application.state,
        toState: application.state,
        payload: { shareholderId, status: dto.status },
      });

      return this.mapShareholder(row);
    });
  }

  async listSeniorManagers(
    actor: AuthenticatedUser,
    applicationIdentifier: string,
  ): Promise<SeniorManagerResponse[]> {
    const application = await this.findViewableApplication(actor, applicationIdentifier);
    const rows = await this.prisma.seniorManager.findMany({
      where: { applicationId: application.id },
      orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
    });

    return rows.map((row) => this.mapSeniorManager(row));
  }

  async createSeniorManager(
    actor: AuthenticatedUser,
    applicationIdentifier: string,
    dto: CreateSeniorManagerDto,
  ): Promise<SeniorManagerResponse> {
    const application = await this.findEditableApplication(actor, applicationIdentifier);

    return this.prisma.transactional(async (tx) => {
      const row = await tx.seniorManager.create({
        data: {
          applicationId: application.id,
          role: dto.role,
          fullName: dto.fullName,
          email: dto.email,
          nationality: dto.nationality,
          yearsExperience: dto.yearsExperience,
          fitAndProperAttested: dto.fitAndProperAttested,
          attestedAt: new Date(),
          attestedByUserId: actor.id,
        },
      });

      await this.auditService.write(tx, {
        applicationId: application.id,
        actorId: actor.id,
        action: ApplicationAction.CreateSeniorManager,
        fromState: application.state,
        toState: application.state,
        payload: { seniorManagerId: row.id, role: row.role },
      });

      return this.mapSeniorManager(row);
    });
  }

  async updateSeniorManager(
    actor: AuthenticatedUser,
    applicationIdentifier: string,
    seniorManagerId: string,
    dto: UpdateSeniorManagerDto,
  ): Promise<SeniorManagerResponse> {
    const application = await this.findEditableApplication(actor, applicationIdentifier);
    await this.findSeniorManagerOrThrow(application.id, seniorManagerId);

    return this.prisma.transactional(async (tx) => {
      const row = await tx.seniorManager.update({
        where: { id: seniorManagerId },
        data: {
          ...dto,
          attestedAt: new Date(),
          attestedByUserId: actor.id,
        },
      });

      await this.auditService.write(tx, {
        applicationId: application.id,
        actorId: actor.id,
        action: ApplicationAction.UpdateSeniorManager,
        fromState: application.state,
        toState: application.state,
        payload: { seniorManagerId, changedFields: Object.keys(dto) },
      });

      return this.mapSeniorManager(row);
    });
  }

  async deleteSeniorManager(
    actor: AuthenticatedUser,
    applicationIdentifier: string,
    seniorManagerId: string,
  ): Promise<void> {
    const application = await this.findEditableApplication(actor, applicationIdentifier);
    await this.findSeniorManagerOrThrow(application.id, seniorManagerId);

    await this.prisma.transactional(async (tx) => {
      await tx.seniorManager.delete({ where: { id: seniorManagerId } });
      await this.auditService.write(tx, {
        applicationId: application.id,
        actorId: actor.id,
        action: ApplicationAction.DeleteSeniorManager,
        fromState: application.state,
        toState: application.state,
        payload: { seniorManagerId },
      });
    });
  }

  async listDocumentSlotSpecs(): Promise<DocumentSlotSpecResponse[]> {
    const rows = await this.prisma.documentSlotSpec.findMany({ orderBy: { slot: 'asc' } });

    return rows.map((row) => ({
      slot: row.slot,
      title: row.title,
      description: row.description,
      ownerRole: row.ownerRole,
      required: row.required,
      allowedMimeTypes: row.allowedMimeTypes,
      maxBytes: row.maxBytes,
      regulatoryBasis: row.regulatoryBasis,
    }));
  }

  async permittedActivities(
    actor: AuthenticatedUser,
    applicationIdentifier: string,
  ): Promise<string[]> {
    const application = await this.findViewableApplication(actor, applicationIdentifier);

    return permittedActivitiesByCategory[application.bankCategory];
  }

  async listComplianceFindings(
    actor: AuthenticatedUser,
    applicationIdentifier: string,
  ): Promise<ComplianceFindingRecordResponse[]> {
    const application = await this.findViewableApplication(actor, applicationIdentifier);
    const rows = await this.prisma.complianceFinding.findMany({
      where: { applicationId: application.id },
      orderBy: [{ status: 'asc' }, { severity: 'desc' }, { createdAt: 'asc' }],
    });

    return rows.map((row) => this.mapComplianceFinding(row));
  }

  async getFee(
    actor: AuthenticatedUser,
    applicationIdentifier: string,
  ): Promise<ApplicationFeeResponse | null> {
    const application = await this.findViewableApplication(actor, applicationIdentifier);
    const row = await this.prisma.applicationFee.findUnique({
      where: { applicationId: application.id },
    });

    return row === null ? null : this.mapFee(row);
  }

  async submitFeeProof(
    actor: AuthenticatedUser,
    applicationIdentifier: string,
    dto: SubmitFeeProofDto,
  ): Promise<ApplicationFeeResponse> {
    const application = await this.findEditableApplication(actor, applicationIdentifier);
    const document = await this.prisma.applicationDocument.findUnique({
      where: { id: dto.documentId },
    });

    if (
      document === null ||
      document.applicationId !== application.id ||
      document.slot !== DocumentSlot.APPLICATION_FEE_PROOF
    ) {
      throw new ConflictError('Fee proof must reference an application fee proof document.');
    }

    return this.prisma.transactional(async (tx) => {
      const row = await tx.applicationFee.upsert({
        where: { applicationId: application.id },
        create: {
          applicationId: application.id,
          amountRwf: BigInt(applicationFeeRwf(application.applicationKind)),
          status: FeeStatus.PROOF_SUBMITTED,
          proofDocumentId: document.id,
          submittedAt: new Date(),
        },
        update: {
          amountRwf: BigInt(applicationFeeRwf(application.applicationKind)),
          status: FeeStatus.PROOF_SUBMITTED,
          proofDocumentId: document.id,
          submittedAt: new Date(),
        },
      });

      await this.auditService.write(tx, {
        applicationId: application.id,
        actorId: actor.id,
        action: ApplicationAction.SubmitFeeProof,
        fromState: application.state,
        toState: application.state,
        payload: { feeId: row.id, documentId: document.id },
      });

      return this.mapFee(row);
    });
  }

  async listDecisionRecords(
    actor: AuthenticatedUser,
    applicationIdentifier: string,
  ): Promise<ApplicationDecisionRecordResponse[]> {
    const application = await this.findViewableApplication(actor, applicationIdentifier);
    const rows = await this.prisma.applicationDecisionRecord.findMany({
      where: { applicationId: application.id },
      orderBy: { createdAt: 'asc' },
    });

    return rows.map((row) => ({
      id: row.id,
      applicationId: row.applicationId,
      actorId: row.actorId,
      outcome: row.outcome,
      decisionType: row.decisionType,
      fromState: row.fromState,
      toState: row.toState,
      justification: row.justification,
      conditions: row.conditions,
      allowedActivities: row.allowedActivities,
      refusalReasons: row.refusalReasons,
      createdAt: row.createdAt,
    }));
  }

  async issueInformationLetter(
    actor: AuthenticatedUser,
    applicationIdentifier: string,
    dto: IssueInformationLetterDto,
  ): Promise<InformationLetterResponse> {
    const application = await this.findViewableApplication(actor, applicationIdentifier);

    if (actor.role !== UserRole.REVIEWER && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Only reviewers or administrators can issue information letters.',
      );
    }

    return this.prisma.transactional(async (tx) => {
      const row = await tx.informationLetter.create({
        data: {
          applicationId: application.id,
          issuedById: actor.id,
          subject: dto.subject,
          body: dto.body,
          responseDueAt: new Date(Date.now() + dto.responseDays * 24 * 60 * 60 * 1000),
        },
      });

      await this.auditService.write(tx, {
        applicationId: application.id,
        actorId: actor.id,
        action: ApplicationAction.IssueInformationLetter,
        fromState: application.state,
        toState: application.state,
        payload: { letterId: row.id, responseDueAt: row.responseDueAt.toISOString() },
      });

      return this.mapInformationLetter(row);
    });
  }

  async listInformationLetters(
    actor: AuthenticatedUser,
    applicationIdentifier: string,
  ): Promise<InformationLetterResponse[]> {
    const application = await this.findViewableApplication(actor, applicationIdentifier);
    const rows = await this.prisma.informationLetter.findMany({
      where: { applicationId: application.id },
      orderBy: { issuedAt: 'desc' },
    });

    return rows.map((row) => this.mapInformationLetter(row));
  }

  async listSlaClocks(
    actor: AuthenticatedUser,
    applicationIdentifier: string,
  ): Promise<ApplicationSlaClockResponse[]> {
    const application = await this.findViewableApplication(actor, applicationIdentifier);
    const rows = await this.prisma.applicationSlaClock.findMany({
      where: { applicationId: application.id },
      orderBy: { startedAt: 'desc' },
    });

    return rows.map((row) => this.mapSlaClock(row));
  }

  async renderInformationLetterPdf(
    actor: AuthenticatedUser,
    applicationIdentifier: string,
    letterId: string,
  ): Promise<Buffer> {
    const application = await this.findViewableApplication(actor, applicationIdentifier);
    const letter = await this.prisma.informationLetter.findFirst({
      where: { id: letterId, applicationId: application.id },
    });

    if (letter === null) {
      throw new ResourceNotFoundError('Information letter not found.');
    }

    return renderInformationLetterPdfTemplate({
      referenceNumber: application.referenceNumber,
      institutionName: application.institutionName,
      subject: letter.subject,
      body: letter.body,
      issuedAt: letter.issuedAt,
      responseDueAt: letter.responseDueAt,
    });
  }

  async applicationHasRequiredManagers(applicationId: string): Promise<boolean> {
    const rows = await this.prisma.seniorManager.findMany({
      where: { applicationId, fitAndProperAttested: true },
      select: { role: true },
    });
    const presentRoles = new Set(rows.map((row) => row.role));

    return [...requiredManagerRoles].every((role) => presentRoles.has(role));
  }

  async findViewableApplication(
    actor: AuthenticatedUser,
    identifier: string,
  ): Promise<Application> {
    const application = await this.findApplication(identifier);

    if (application === null) {
      throw new ResourceNotFoundError('Application not found.');
    }

    if (!canViewApplication(actor, application)) {
      throw new ForbiddenException('Access denied.');
    }

    return application;
  }

  private async findEditableApplication(
    actor: AuthenticatedUser,
    identifier: string,
  ): Promise<Application> {
    const application = await this.findViewableApplication(actor, identifier);

    if (
      actor.role !== UserRole.APPLICANT ||
      actor.id !== application.applicantId ||
      !editableStates.has(application.state)
    ) {
      throw new ForbiddenException('Application is not editable by this account.');
    }

    return application;
  }

  private async findApplication(identifier: string): Promise<Application | null> {
    if (this.isUuid(identifier)) {
      return this.prisma.application.findUnique({ where: { id: identifier } });
    }

    return this.prisma.application.findUnique({ where: { referenceNumber: identifier } });
  }

  private async findShareholderOrThrow(
    applicationId: string,
    shareholderId: string,
  ): Promise<SignificantShareholder> {
    const row = await this.prisma.significantShareholder.findFirst({
      where: { id: shareholderId, applicationId },
    });

    if (row === null) {
      throw new ResourceNotFoundError('Shareholder not found.');
    }

    return row;
  }

  private async findSeniorManagerOrThrow(
    applicationId: string,
    seniorManagerId: string,
  ): Promise<SeniorManager> {
    const row = await this.prisma.seniorManager.findFirst({
      where: { id: seniorManagerId, applicationId },
    });

    if (row === null) {
      throw new ResourceNotFoundError('Senior manager not found.');
    }

    return row;
  }

  private async assertOwnershipTotal(
    applicationId: string,
    nextOwnershipPercent: number,
    excludedShareholderId?: string,
  ): Promise<void> {
    const rows = await this.prisma.significantShareholder.findMany({
      where: {
        applicationId,
        ...(excludedShareholderId !== undefined ? { id: { not: excludedShareholderId } } : {}),
      },
      select: { ownershipPercent: true },
    });
    const total = rows.reduce(
      (sum, row) => sum + Number(row.ownershipPercent.toString()),
      nextOwnershipPercent,
    );

    if (total > 100) {
      throw new ConflictError('Shareholder ownership cannot exceed 100 percent.');
    }
  }

  private mapCapitalDeclaration(row: CapitalDeclaration): CapitalDeclarationResponse {
    return {
      id: row.id,
      applicationId: row.applicationId,
      amountRwf: row.amountRwf.toString(),
      sourceSummary: row.sourceSummary,
      attestedAt: row.attestedAt,
      attestedByUserId: row.attestedByUserId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapShareholder(row: SignificantShareholder): SignificantShareholderResponse {
    return {
      id: row.id,
      applicationId: row.applicationId,
      shareholderType: row.shareholderType,
      fullName: row.fullName,
      registrationNumber: row.registrationNumber,
      country: row.country,
      ownershipPercent: row.ownershipPercent.toString(),
      sourceOfFunds: row.sourceOfFunds,
      beneficialOwner: row.beneficialOwner,
      fitAndProperStatus: row.fitAndProperStatus,
      fitAndProperReviewedAt: row.fitAndProperReviewedAt,
      fitAndProperReviewedById: row.fitAndProperReviewedById,
      fitAndProperJustification: row.fitAndProperJustification,
      attestedAt: row.attestedAt,
      attestedByUserId: row.attestedByUserId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapSeniorManager(row: SeniorManager): SeniorManagerResponse {
    return {
      id: row.id,
      applicationId: row.applicationId,
      role: row.role,
      fullName: row.fullName,
      email: row.email,
      nationality: row.nationality,
      yearsExperience: row.yearsExperience,
      fitAndProperAttested: row.fitAndProperAttested,
      attestedAt: row.attestedAt,
      attestedByUserId: row.attestedByUserId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapFee(row: {
    id: string;
    applicationId: string;
    amountRwf: bigint;
    status: FeeStatus;
    proofDocumentId: string | null;
    submittedAt: Date | null;
    verifiedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): ApplicationFeeResponse {
    return {
      id: row.id,
      applicationId: row.applicationId,
      amountRwf: row.amountRwf.toString(),
      status: row.status,
      proofDocumentId: row.proofDocumentId,
      submittedAt: row.submittedAt,
      verifiedAt: row.verifiedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapComplianceFinding(row: ComplianceFinding): ComplianceFindingRecordResponse {
    return {
      id: row.id,
      applicationId: row.applicationId,
      code: row.code,
      section: row.section,
      title: row.title,
      detail: row.detail,
      severity: row.severity,
      status: row.status,
      regulatoryBasis: row.regulatoryBasis,
      evidence: row.evidence,
      resolvedAt: row.resolvedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapInformationLetter(row: InformationLetter): InformationLetterResponse {
    return {
      id: row.id,
      applicationId: row.applicationId,
      issuedById: row.issuedById,
      subject: row.subject,
      body: row.body,
      status: row.status,
      responseDueAt: row.responseDueAt,
      issuedAt: row.issuedAt,
      respondedAt: row.respondedAt,
    };
  }

  private mapSlaClock(row: ApplicationSlaClock): ApplicationSlaClockResponse {
    return {
      id: row.id,
      applicationId: row.applicationId,
      state: row.state,
      startedAt: row.startedAt,
      dueAt: row.dueAt,
      stoppedAt: row.stoppedAt,
      breachedAt: row.breachedAt,
    };
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }
}
