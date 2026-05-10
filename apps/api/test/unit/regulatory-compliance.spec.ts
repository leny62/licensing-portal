import { ApplicationKind, BankCategory, Prisma } from '@prisma/client';

import { ComplianceCheckStatus } from '../../src/modules/applications/enums/compliance-check-status.enum';
import { buildComplianceChecklist } from '../../src/modules/applications/regulatory-compliance';
import { DocumentSlot } from '../../src/modules/documents/enums/document-slot.enum';

const baseApp = {
  id: 'application-1',
  referenceNumber: 'APP-1',
  applicationKind: ApplicationKind.NEW_BANK,
  bankCategory: BankCategory.COMMERCIAL_BANK,
  country: 'Rwanda',
};

describe('regulatory compliance checklist', () => {
  it('flags missing Article 11 documents as blocking', () => {
    const checklist = buildComplianceChecklist(
      { ...baseApp, paidUpCapitalRwf: new Prisma.Decimal(20000000000) },
      [{ id: 'doc-1', slot: DocumentSlot.BusinessPlan, version: 1 }],
    );

    expect(checklist.summary.missing).toBeGreaterThan(0);
    expect(checklist.summary.blockingMissing).toBeGreaterThan(0);
    expect(
      checklist.sections
        .find((section) => section.id === 'supporting-documents')!
        .items.find((item) => item.id === 'business-plan')!.status,
    ).toBe(ComplianceCheckStatus.Complete);
  });

  it('requires foreign bank supervisory evidence only for FOREIGN_SUBSIDIARY kind', () => {
    const localChecklist = buildComplianceChecklist(
      { ...baseApp, applicationKind: ApplicationKind.NEW_BANK, paidUpCapitalRwf: '20000000000' },
      [],
    );
    const foreignChecklist = buildComplianceChecklist(
      {
        ...baseApp,
        id: 'application-2',
        referenceNumber: 'APP-2',
        applicationKind: ApplicationKind.FOREIGN_SUBSIDIARY,
        paidUpCapitalRwf: '20000000000',
      },
      [],
    );

    expect(
      localChecklist.sections.find((section) => section.id === 'foreign-bank-supervision')!
        .items[0]?.status,
    ).toBe(ComplianceCheckStatus.NotApplicable);
    expect(
      foreignChecklist.sections.find((section) => section.id === 'foreign-bank-supervision')!
        .items.every((item) => item.status === ComplianceCheckStatus.Missing),
    ).toBe(true);
  });

  it('flags category-specific capital gaps', () => {
    const checklist = buildComplianceChecklist(
      { ...baseApp, bankCategory: BankCategory.DEVELOPMENT_BANK, paidUpCapitalRwf: 49999999999 },
      [],
    );

    expect(checklist.requiredPaidUpCapitalRwf).toBe(50000000000);
    expect(checklist.sections[0]?.items[0]?.status).toBe(ComplianceCheckStatus.Missing);
  });

  it('marks foreign-bank supervision not-applicable for REPRESENTATIVE_OFFICE kind', () => {
    const checklist = buildComplianceChecklist(
      {
        ...baseApp,
        applicationKind: ApplicationKind.REPRESENTATIVE_OFFICE,
        paidUpCapitalRwf: '20000000000',
      },
      [],
    );

    expect(
      checklist.sections.find((s) => s.id === 'foreign-bank-supervision')!.items[0]?.status,
    ).toBe(ComplianceCheckStatus.NotApplicable);
  });
});
