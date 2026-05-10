import { BankCategory, Prisma } from '@prisma/client';

import { ComplianceCheckStatus } from '../../src/modules/applications/enums/compliance-check-status.enum';
import { buildComplianceChecklist } from '../../src/modules/applications/regulatory-compliance';
import { DocumentSlot } from '../../src/modules/documents/enums/document-slot.enum';

describe('regulatory compliance checklist', () => {
  it('flags missing Article 11 documents as blocking', () => {
    const checklist = buildComplianceChecklist(
      {
        id: 'application-1',
        referenceNumber: 'APP-1',
        bankCategory: BankCategory.COMMERCIAL_BANK,
        paidUpCapitalRwf: new Prisma.Decimal(20000000000),
        country: 'Rwanda',
      },
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

  it('requires foreign bank supervisory evidence only for foreign applicants', () => {
    const localChecklist = buildComplianceChecklist(
      {
        id: 'application-1',
        referenceNumber: 'APP-1',
        bankCategory: BankCategory.COMMERCIAL_BANK,
        paidUpCapitalRwf: '20000000000',
        country: 'RW',
      },
      [],
    );
    const foreignChecklist = buildComplianceChecklist(
      {
        id: 'application-2',
        referenceNumber: 'APP-2',
        bankCategory: BankCategory.COMMERCIAL_BANK,
        paidUpCapitalRwf: '20000000000',
        country: 'Kenya',
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
      {
        id: 'application-1',
        referenceNumber: 'APP-1',
        bankCategory: BankCategory.DEVELOPMENT_BANK,
        paidUpCapitalRwf: 49999999999,
        country: 'Rwanda',
      },
      [],
    );

    expect(checklist.requiredPaidUpCapitalRwf).toBe(50000000000);
    expect(checklist.sections[0]?.items[0]?.status).toBe(ComplianceCheckStatus.Missing);
  });
});
