import { ForbiddenException } from '@nestjs/common';
import {
  ApplicationKind,
  ApplicationState,
  BankCategory,
  ComplianceFindingSeverity,
  ComplianceFindingStatus,
  DocumentSlot,
  FeeStatus,
  FitAndProperStatus,
  InformationLetterStatus,
  Prisma,
  SeniorManagerRole,
  ShareholderType,
  UserRole,
} from '@prisma/client';

import { ConflictError, ResourceNotFoundError } from '../../src/common/errors/domain.errors';
import { AuditService } from '../../src/infra/audit/audit.service';
import { PrismaService } from '../../src/infra/prisma/prisma.service';
import { RegulatoryService } from '../../src/modules/applications/regulatory.service';

const now = new Date('2026-05-10T10:00:00.000Z');

const adminActor = {
  id: 'actor-admin',
  role: UserRole.ADMIN,
  email: 'admin@licensing.local',
};

const applicantActor = {
  id: 'actor-applicant',
  role: UserRole.APPLICANT,
  email: 'applicant@licensing.local',
};

const reviewerActor = {
  id: 'actor-reviewer',
  role: UserRole.REVIEWER,
  email: 'reviewer@licensing.local',
};

const draftApplication = {
  id: 'app-1',
  referenceNumber: 'APP-00000001',
  applicantId: 'actor-applicant',
  institutionName: 'Test Bank',
  applicationKind: ApplicationKind.NEW_BANK,
  bankCategory: BankCategory.COMMERCIAL_BANK,
  paidUpCapitalRwf: new Prisma.Decimal(20000000000),
  legalForm: 'Limited Company',
  country: 'RW',
  contactPerson: 'Jane Doe',
  contactEmail: 'jane@test.local',
  contactPhone: '+250780000001',
  summary: 'Test application.',
  state: ApplicationState.DRAFT,
  rowVersion: 0,
  reviewerId: null,
  approverId: null,
  submittedAt: null,
  lastResubmitAt: null,
  decidedAt: null,
  justification: null,
  createdAt: now,
  updatedAt: now,
};

const capitalDeclarationRow = {
  id: 'cap-1',
  applicationId: 'app-1',
  amountRwf: BigInt(20000000000),
  sourceSummary: 'Founders equity.',
  attestedAt: now,
  attestedByUserId: 'actor-applicant',
  createdAt: now,
  updatedAt: now,
};

const shareholderRow = {
  id: 'sh-1',
  applicationId: 'app-1',
  shareholderType: ShareholderType.NATURAL_PERSON,
  fullName: 'Alice Founder',
  registrationNumber: null,
  country: 'RW',
  ownershipPercent: new Prisma.Decimal(60),
  sourceOfFunds: 'Savings.',
  beneficialOwner: null,
  fitAndProperStatus: FitAndProperStatus.PENDING,
  fitAndProperReviewedAt: null,
  fitAndProperReviewedById: null,
  fitAndProperJustification: null,
  attestedAt: now,
  attestedByUserId: 'actor-applicant',
  createdAt: now,
  updatedAt: now,
};

const managerRow = {
  id: 'mgr-1',
  applicationId: 'app-1',
  role: SeniorManagerRole.CHIEF_EXECUTIVE,
  fullName: 'Bob CEO',
  email: 'bob@test.local',
  nationality: 'RW',
  yearsExperience: 10,
  fitAndProperAttested: true,
  attestedAt: now,
  attestedByUserId: 'actor-applicant',
  createdAt: now,
  updatedAt: now,
};

const feeRow = {
  id: 'fee-1',
  applicationId: 'app-1',
  amountRwf: BigInt(2000000),
  status: FeeStatus.PENDING,
  proofDocumentId: null,
  submittedAt: null,
  verifiedAt: null,
  createdAt: now,
  updatedAt: now,
};

const letterRow = {
  id: 'letter-1',
  applicationId: 'app-1',
  issuedById: 'actor-reviewer',
  subject: 'Completeness check',
  body: 'Your file is complete.',
  status: InformationLetterStatus.ISSUED,
  responseDueAt: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
  issuedAt: now,
  respondedAt: null,
};

const feeProofDocument = {
  id: 'doc-fee-1',
  applicationId: 'app-1',
  slot: DocumentSlot.APPLICATION_FEE_PROOF,
  version: 1,
  originalFilename: 'fee-receipt.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 1024,
  storagePath: '/encrypted/fee.bin',
  wrappedDek: Buffer.from('dek'),
  iv: Buffer.from('iv'),
  authTag: Buffer.from('tag'),
  uploaderId: 'actor-applicant',
  createdAt: now,
};

const createService = () => {
  const prisma = {
    $transaction: jest.fn(),
    application: { findUnique: jest.fn() },
    capitalDeclaration: { upsert: jest.fn(), findUnique: jest.fn() },
    significantShareholder: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    seniorManager: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    complianceFinding: { findMany: jest.fn() },
    applicationFee: { findUnique: jest.fn(), upsert: jest.fn() },
    applicationDocument: { findUnique: jest.fn() },
    informationLetter: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    documentSlotSpec: { findMany: jest.fn() },
    applicationDecisionRecord: { findMany: jest.fn().mockResolvedValue([]) },
    transactional: jest.fn().mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        capitalDeclaration: { upsert: jest.fn().mockResolvedValue(capitalDeclarationRow) },
        significantShareholder: {
          create: jest.fn().mockResolvedValue(shareholderRow),
          update: jest.fn().mockResolvedValue({
            ...shareholderRow,
            fitAndProperStatus: FitAndProperStatus.CLEARED,
            fitAndProperReviewedAt: now,
            fitAndProperReviewedById: reviewerActor.id,
            fitAndProperJustification: 'Reviewed source-of-funds evidence.',
          }),
          delete: jest.fn().mockResolvedValue(shareholderRow),
        },
        seniorManager: {
          create: jest.fn().mockResolvedValue(managerRow),
          update: jest.fn().mockResolvedValue(managerRow),
          delete: jest.fn().mockResolvedValue(managerRow),
        },
        applicationFee: { upsert: jest.fn().mockResolvedValue(feeRow) },
        informationLetter: { create: jest.fn().mockResolvedValue(letterRow) },
      }),
    ),
  };

  const auditService = { write: jest.fn().mockResolvedValue(undefined) };

  return {
    prisma,
    auditService,
    service: new RegulatoryService(
      prisma as unknown as PrismaService,
      auditService as unknown as AuditService,
    ),
  };
};

describe('RegulatoryService', () => {
  describe('getCapitalDeclaration', () => {
    it('returns null when no declaration exists', async () => {
      const { prisma, service } = createService();
      prisma.application.findUnique.mockResolvedValue(draftApplication);
      prisma.capitalDeclaration.findUnique.mockResolvedValue(null);

      await expect(service.getCapitalDeclaration(adminActor, 'app-1')).resolves.toBeNull();
    });

    it('returns the declaration when it exists', async () => {
      const { prisma, service } = createService();
      prisma.application.findUnique.mockResolvedValue(draftApplication);
      prisma.capitalDeclaration.findUnique.mockResolvedValue(capitalDeclarationRow);

      const result = await service.getCapitalDeclaration(adminActor, 'app-1');
      expect(result?.amountRwf).toBe('20000000000');
    });
  });

  describe('upsertCapitalDeclaration', () => {
    it('is rejected for non-applicant actors on their own draft', async () => {
      const { prisma, service } = createService();
      prisma.application.findUnique.mockResolvedValue(draftApplication);

      await expect(
        service.upsertCapitalDeclaration(adminActor, 'app-1', {
          amountRwf: 20000000000,
          sourceSummary: 'Savings.',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('creates a declaration for the owning applicant', async () => {
      const { service, prisma } = createService();
      prisma.application.findUnique.mockResolvedValue(draftApplication);

      const result = await service.upsertCapitalDeclaration(applicantActor, 'app-1', {
        amountRwf: 20000000000,
        sourceSummary: 'Founders equity.',
      });

      expect(result.amountRwf).toBe('20000000000');
    });
  });

  describe('createShareholder', () => {
    it('rejects when ownership total would exceed 100 percent', async () => {
      const { prisma, service } = createService();
      prisma.application.findUnique.mockResolvedValue(draftApplication);
      prisma.significantShareholder.findMany.mockResolvedValue([
        { ownershipPercent: new Prisma.Decimal(60) },
        { ownershipPercent: new Prisma.Decimal(30) },
      ]);

      await expect(
        service.createShareholder(applicantActor, 'app-1', {
          shareholderType: ShareholderType.NATURAL_PERSON,
          fullName: 'Carol',
          country: 'RW',
          ownershipPercent: 15,
          sourceOfFunds: 'Savings.',
        }),
      ).rejects.toThrow(ConflictError);
    });

    it('creates a shareholder when total stays within 100 percent', async () => {
      const { prisma, service } = createService();
      prisma.application.findUnique.mockResolvedValue(draftApplication);
      prisma.significantShareholder.findMany.mockResolvedValue([
        { ownershipPercent: new Prisma.Decimal(40) },
      ]);

      const result = await service.createShareholder(applicantActor, 'app-1', {
        shareholderType: ShareholderType.NATURAL_PERSON,
        fullName: 'Alice Founder',
        country: 'RW',
        ownershipPercent: 60,
        sourceOfFunds: 'Savings.',
      });

      expect(result.fullName).toBe('Alice Founder');
    });
  });

  describe('deleteShareholder', () => {
    it('throws when shareholder does not belong to the application', async () => {
      const { prisma, service } = createService();
      prisma.application.findUnique.mockResolvedValue(draftApplication);
      prisma.significantShareholder.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteShareholder(applicantActor, 'app-1', 'sh-unknown'),
      ).rejects.toThrow(ResourceNotFoundError);
    });
  });

  describe('markShareholderFitAndProper', () => {
    it('rejects actors who are not the assigned reviewer', async () => {
      const { prisma, service } = createService();
      prisma.application.findUnique.mockResolvedValue({
        ...draftApplication,
        state: ApplicationState.UNDER_REVIEW,
        reviewerId: reviewerActor.id,
      });

      await expect(
        service.markShareholderFitAndProper(applicantActor, 'app-1', 'sh-1', {
          status: FitAndProperStatus.CLEARED,
          justification: 'Reviewed source-of-funds evidence.',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects pending status as a review decision', async () => {
      const { prisma, service } = createService();
      prisma.application.findUnique.mockResolvedValue({
        ...draftApplication,
        state: ApplicationState.UNDER_REVIEW,
        reviewerId: reviewerActor.id,
      });

      await expect(
        service.markShareholderFitAndProper(reviewerActor, 'app-1', 'sh-1', {
          status: FitAndProperStatus.PENDING,
          justification: 'Reviewed source-of-funds evidence.',
        }),
      ).rejects.toThrow(ConflictError);
    });

    it('records a reviewer fit-and-proper decision', async () => {
      const { prisma, service } = createService();
      prisma.application.findUnique.mockResolvedValue({
        ...draftApplication,
        state: ApplicationState.UNDER_REVIEW,
        reviewerId: reviewerActor.id,
      });
      prisma.significantShareholder.findFirst.mockResolvedValue(shareholderRow);

      const result = await service.markShareholderFitAndProper(reviewerActor, 'app-1', 'sh-1', {
        status: FitAndProperStatus.CLEARED,
        justification: 'Reviewed source-of-funds evidence.',
      });

      expect(result.fitAndProperStatus).toBe(FitAndProperStatus.CLEARED);
    });
  });

  describe('applicationHasRequiredManagers', () => {
    it('returns false when any required role is missing', async () => {
      const { prisma, service } = createService();
      prisma.seniorManager.findMany.mockResolvedValue([
        { role: SeniorManagerRole.CHIEF_EXECUTIVE },
        { role: SeniorManagerRole.CHIEF_FINANCE },
      ]);

      await expect(service.applicationHasRequiredManagers('app-1')).resolves.toBe(false);
    });

    it('returns true when all four required roles are attested', async () => {
      const { prisma, service } = createService();
      prisma.seniorManager.findMany.mockResolvedValue([
        { role: SeniorManagerRole.CHIEF_EXECUTIVE },
        { role: SeniorManagerRole.CHIEF_FINANCE },
        { role: SeniorManagerRole.CHIEF_RISK },
        { role: SeniorManagerRole.CHIEF_COMPLIANCE },
      ]);

      await expect(service.applicationHasRequiredManagers('app-1')).resolves.toBe(true);
    });
  });

  describe('issueInformationLetter', () => {
    it('rejects when the actor is an applicant', async () => {
      const { prisma, service } = createService();
      prisma.application.findUnique.mockResolvedValue(draftApplication);

      await expect(
        service.issueInformationLetter(applicantActor, 'app-1', {
          subject: 'Test',
          body: 'Body text.',
          responseDays: 10,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('creates a letter when the actor is a reviewer assigned to the application', async () => {
      const { prisma, service } = createService();
      prisma.application.findUnique.mockResolvedValue({
        ...draftApplication,
        state: ApplicationState.UNDER_REVIEW,
        reviewerId: reviewerActor.id,
      });

      const result = await service.issueInformationLetter(reviewerActor, 'app-1', {
        subject: 'Completeness check',
        body: 'Your file is complete.',
        responseDays: 10,
      });

      expect(result.subject).toBe('Completeness check');
      expect(result.status).toBe(InformationLetterStatus.ISSUED);
    });
  });

  describe('submitFeeProof', () => {
    it('rejects when the document is not an application fee proof slot', async () => {
      const { prisma, service } = createService();
      prisma.application.findUnique.mockResolvedValue(draftApplication);
      prisma.applicationDocument.findUnique.mockResolvedValue({
        ...feeProofDocument,
        slot: DocumentSlot.BUSINESS_PLAN,
      });

      await expect(
        service.submitFeeProof(applicantActor, 'app-1', { documentId: 'doc-fee-1' }),
      ).rejects.toThrow(ConflictError);
    });

    it('rejects when the document belongs to another application', async () => {
      const { prisma, service } = createService();
      prisma.application.findUnique.mockResolvedValue(draftApplication);
      prisma.applicationDocument.findUnique.mockResolvedValue({
        ...feeProofDocument,
        applicationId: 'app-other',
      });

      await expect(
        service.submitFeeProof(applicantActor, 'app-1', { documentId: 'doc-fee-1' }),
      ).rejects.toThrow(ConflictError);
    });

    it('submits the proof when the document is valid', async () => {
      const { prisma, service } = createService();
      prisma.application.findUnique.mockResolvedValue(draftApplication);
      prisma.applicationDocument.findUnique.mockResolvedValue(feeProofDocument);

      const result = await service.submitFeeProof(applicantActor, 'app-1', {
        documentId: 'doc-fee-1',
      });

      expect(result.status).toBe(FeeStatus.PENDING);
    });
  });

  describe('renderInformationLetterPdf', () => {
    it('throws when the letter does not belong to the application', async () => {
      const { prisma, service } = createService();
      prisma.application.findUnique.mockResolvedValue(draftApplication);
      prisma.informationLetter.findFirst.mockResolvedValue(null);

      await expect(
        service.renderInformationLetterPdf(adminActor, 'app-1', 'letter-missing'),
      ).rejects.toThrow(ResourceNotFoundError);
    });

    it('returns a Buffer starting with the PDF header', async () => {
      const { prisma, service } = createService();
      prisma.application.findUnique.mockResolvedValue(draftApplication);
      prisma.informationLetter.findFirst.mockResolvedValue(letterRow);

      const pdf = await service.renderInformationLetterPdf(adminActor, 'app-1', 'letter-1');

      expect(Buffer.isBuffer(pdf)).toBe(true);
      expect(pdf.toString('utf8', 0, 8)).toBe('%PDF-1.4');
    });
  });

  describe('findViewableApplication', () => {
    it('throws when the application does not exist', async () => {
      const { prisma, service } = createService();
      prisma.application.findUnique.mockResolvedValue(null);

      await expect(service.findViewableApplication(adminActor, 'app-missing')).rejects.toThrow(
        ResourceNotFoundError,
      );
    });

    it('throws 403 when the actor cannot view the application', async () => {
      const { prisma, service } = createService();
      const otherApplicant = { ...applicantActor, id: 'other-applicant' };
      prisma.application.findUnique.mockResolvedValue(draftApplication);

      await expect(service.findViewableApplication(otherApplicant, 'app-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('listShareholders', () => {
    it('returns shareholders ordered by ownership descending', async () => {
      const { prisma, service } = createService();
      prisma.application.findUnique.mockResolvedValue(draftApplication);
      prisma.significantShareholder.findMany.mockResolvedValue([shareholderRow]);

      const result = await service.listShareholders(adminActor, 'app-1');

      expect(result).toHaveLength(1);
      expect(result[0]?.fullName).toBe('Alice Founder');
    });
  });

  describe('updateShareholder', () => {
    it('throws when the shareholder is not found', async () => {
      const { prisma, service } = createService();
      prisma.application.findUnique.mockResolvedValue(draftApplication);
      prisma.significantShareholder.findFirst.mockResolvedValue(null);

      await expect(
        service.updateShareholder(applicantActor, 'app-1', 'sh-missing', { fullName: 'Updated' }),
      ).rejects.toThrow(ResourceNotFoundError);
    });

    it('rejects when the updated ownership would exceed 100 percent', async () => {
      const { prisma, service } = createService();
      prisma.application.findUnique.mockResolvedValue(draftApplication);
      prisma.significantShareholder.findFirst.mockResolvedValue(shareholderRow);
      prisma.significantShareholder.findMany.mockResolvedValue([
        { ownershipPercent: new Prisma.Decimal(80) },
      ]);

      await expect(
        service.updateShareholder(applicantActor, 'app-1', 'sh-1', { ownershipPercent: 30 }),
      ).rejects.toThrow(ConflictError);
    });

    it('updates the shareholder successfully', async () => {
      const { prisma, service } = createService();
      prisma.application.findUnique.mockResolvedValue(draftApplication);
      prisma.significantShareholder.findFirst.mockResolvedValue(shareholderRow);
      prisma.significantShareholder.findMany.mockResolvedValue([]);

      const result = await service.updateShareholder(applicantActor, 'app-1', 'sh-1', {
        fullName: 'Updated Name',
      });

      expect(result.fullName).toBe('Alice Founder');
    });
  });

  describe('deleteShareholder (happy path)', () => {
    it('deletes the shareholder successfully', async () => {
      const { prisma, service } = createService();
      prisma.application.findUnique.mockResolvedValue(draftApplication);
      prisma.significantShareholder.findFirst.mockResolvedValue(shareholderRow);

      await expect(
        service.deleteShareholder(applicantActor, 'app-1', 'sh-1'),
      ).resolves.toBeUndefined();
    });
  });

  describe('listSeniorManagers', () => {
    it('returns senior managers ordered by role and name', async () => {
      const { prisma, service } = createService();
      prisma.application.findUnique.mockResolvedValue(draftApplication);
      prisma.seniorManager.findMany.mockResolvedValue([managerRow]);

      const result = await service.listSeniorManagers(adminActor, 'app-1');

      expect(result).toHaveLength(1);
      expect(result[0]?.role).toBe(SeniorManagerRole.CHIEF_EXECUTIVE);
    });
  });

  describe('createSeniorManager', () => {
    it('creates a senior manager for the owning applicant', async () => {
      const { prisma, service } = createService();
      prisma.application.findUnique.mockResolvedValue(draftApplication);

      const result = await service.createSeniorManager(applicantActor, 'app-1', {
        role: SeniorManagerRole.CHIEF_EXECUTIVE,
        fullName: 'Bob CEO',
        email: 'bob@test.local',
        nationality: 'RW',
        yearsExperience: 10,
        fitAndProperAttested: true,
      });

      expect(result.role).toBe(SeniorManagerRole.CHIEF_EXECUTIVE);
    });
  });

  describe('updateSeniorManager', () => {
    it('throws when the senior manager is not found', async () => {
      const { prisma, service } = createService();
      prisma.application.findUnique.mockResolvedValue(draftApplication);
      prisma.seniorManager.findFirst.mockResolvedValue(null);

      await expect(
        service.updateSeniorManager(applicantActor, 'app-1', 'mgr-missing', { fullName: 'X' }),
      ).rejects.toThrow(ResourceNotFoundError);
    });

    it('updates the manager successfully', async () => {
      const { prisma, service } = createService();
      prisma.application.findUnique.mockResolvedValue(draftApplication);
      prisma.seniorManager.findFirst.mockResolvedValue(managerRow);

      const result = await service.updateSeniorManager(applicantActor, 'app-1', 'mgr-1', {
        yearsExperience: 12,
      });

      expect(result.role).toBe(SeniorManagerRole.CHIEF_EXECUTIVE);
    });
  });

  describe('deleteSeniorManager', () => {
    it('throws when the senior manager is not found', async () => {
      const { prisma, service } = createService();
      prisma.application.findUnique.mockResolvedValue(draftApplication);
      prisma.seniorManager.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteSeniorManager(applicantActor, 'app-1', 'mgr-missing'),
      ).rejects.toThrow(ResourceNotFoundError);
    });

    it('deletes the manager successfully', async () => {
      const { prisma, service } = createService();
      prisma.application.findUnique.mockResolvedValue(draftApplication);
      prisma.seniorManager.findFirst.mockResolvedValue(managerRow);

      await expect(
        service.deleteSeniorManager(applicantActor, 'app-1', 'mgr-1'),
      ).resolves.toBeUndefined();
    });
  });

  describe('listDocumentSlotSpecs', () => {
    it('returns all slot specs ordered by slot', async () => {
      const { prisma, service } = createService();
      prisma.documentSlotSpec.findMany.mockResolvedValue([
        {
          slot: DocumentSlot.BUSINESS_PLAN,
          title: 'Business plan',
          description: 'Full business plan.',
          ownerRole: UserRole.APPLICANT,
          required: true,
          allowedMimeTypes: ['application/pdf'],
          maxBytes: 5242880,
          regulatoryBasis: 'Article 11(5)',
        },
      ]);

      const result = await service.listDocumentSlotSpecs();

      expect(result).toHaveLength(1);
      expect(result[0]?.slot).toBe(DocumentSlot.BUSINESS_PLAN);
    });
  });

  describe('permittedActivities', () => {
    it('returns activities for the application bank category', async () => {
      const { prisma, service } = createService();
      prisma.application.findUnique.mockResolvedValue(draftApplication);

      const result = await service.permittedActivities(adminActor, 'app-1');

      expect(result).toContain('Accept deposits from the public');
    });
  });

  describe('getFee', () => {
    it('returns null when no fee record exists', async () => {
      const { prisma, service } = createService();
      prisma.application.findUnique.mockResolvedValue(draftApplication);
      prisma.applicationFee.findUnique.mockResolvedValue(null);

      await expect(service.getFee(adminActor, 'app-1')).resolves.toBeNull();
    });

    it('returns the fee record when it exists', async () => {
      const { prisma, service } = createService();
      prisma.application.findUnique.mockResolvedValue(draftApplication);
      prisma.applicationFee.findUnique.mockResolvedValue(feeRow);

      const result = await service.getFee(adminActor, 'app-1');
      expect(result?.status).toBe(FeeStatus.PENDING);
    });
  });

  describe('listInformationLetters', () => {
    it('returns letters ordered by issuedAt descending', async () => {
      const { prisma, service } = createService();
      prisma.application.findUnique.mockResolvedValue(draftApplication);
      prisma.informationLetter.findMany.mockResolvedValue([letterRow]);

      const result = await service.listInformationLetters(adminActor, 'app-1');

      expect(result).toHaveLength(1);
      expect(result[0]?.subject).toBe('Completeness check');
    });
  });

  describe('listDecisionRecords', () => {
    it('returns an empty list when no decisions exist', async () => {
      const { prisma, service } = createService();
      prisma.application.findUnique.mockResolvedValue(draftApplication);
      prisma.applicationDecisionRecord.findMany.mockResolvedValue([]);

      const result = await service.listDecisionRecords(adminActor, 'app-1');
      expect(result).toHaveLength(0);
    });
  });

  describe('listComplianceFindings', () => {
    it('returns mapped findings ordered by status and severity', async () => {
      const { prisma, service } = createService();
      prisma.application.findUnique.mockResolvedValue(draftApplication);
      prisma.complianceFinding.findMany.mockResolvedValue([
        {
          id: 'finding-1',
          applicationId: 'app-1',
          code: 'CAPITAL_BELOW_THRESHOLD',
          section: 'capital',
          title: 'Capital below threshold',
          detail: 'Declared capital is below the minimum.',
          severity: ComplianceFindingSeverity.BLOCKING,
          status: ComplianceFindingStatus.OPEN,
          regulatoryBasis: 'Article 4',
          evidence: {},
          resolvedAt: null,
          createdAt: now,
          updatedAt: now,
        },
      ]);

      const result = await service.listComplianceFindings(adminActor, 'app-1');

      expect(result).toHaveLength(1);
      expect(result[0]?.code).toBe('CAPITAL_BELOW_THRESHOLD');
      expect(result[0]?.severity).toBe(ComplianceFindingSeverity.BLOCKING);
    });
  });
});
