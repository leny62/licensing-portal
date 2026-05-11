import {
  Application,
  ApplicationKind,
  ApplicationState,
  BankCategory,
  Prisma,
  UserRole,
} from '@prisma/client';

import { canEditDraft, canViewApplication } from '../../src/modules/applications/access-policy';

const now = new Date('2026-05-10T06:00:00.000Z');

const application = (overrides: Partial<Application> = {}): Application => ({
  id: 'application-1',
  referenceNumber: 'APP-1',
  applicantId: 'applicant-1',
  institutionName: 'Policy Bank',
  applicationKind: ApplicationKind.NEW_BANK,
  bankCategory: BankCategory.COMMERCIAL_BANK,
  paidUpCapitalRwf: new Prisma.Decimal(20000000000),
  legalForm: 'Limited Company',
  country: 'Rwanda',
  contactPerson: 'Policy Contact',
  contactEmail: 'policy@example.com',
  contactPhone: '+250700000002',
  summary: 'Policy fixture',
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
  ...overrides,
});

describe('application access policy', () => {
  it.each([
    [UserRole.ADMIN, 'admin-1', application(), true],
    [UserRole.APPLICANT, 'applicant-1', application(), true],
    [UserRole.APPLICANT, 'applicant-2', application(), false],
    [UserRole.REVIEWER, 'reviewer-1', application({ state: ApplicationState.SUBMITTED }), true],
    [
      UserRole.REVIEWER,
      'reviewer-1',
      application({ state: ApplicationState.UNDER_REVIEW, reviewerId: 'reviewer-1' }),
      true,
    ],
    [
      UserRole.APPROVER,
      'approver-1',
      application({ state: ApplicationState.RECOMMENDED_FOR_APPROVAL }),
      true,
    ],
    [UserRole.APPROVER, 'approver-1', application({ state: ApplicationState.SUBMITTED }), false],
  ])('canViewApplication role matrix %#', (role, actorId, app, expected) => {
    expect(canViewApplication({ id: actorId, role }, app)).toBe(expected);
  });

  it('allows only the applicant to edit their own editable application', () => {
    expect(canEditDraft({ id: 'applicant-1', role: UserRole.APPLICANT }, application())).toBe(true);
    expect(
      canEditDraft(
        { id: 'applicant-1', role: UserRole.APPLICANT },
        application({ state: ApplicationState.AWAITING_APPLICANT_RESPONSE }),
      ),
    ).toBe(true);
    expect(canEditDraft({ id: 'applicant-2', role: UserRole.APPLICANT }, application())).toBe(
      false,
    );
    expect(
      canEditDraft(
        { id: 'applicant-1', role: UserRole.APPLICANT },
        application({ state: ApplicationState.SUBMITTED }),
      ),
    ).toBe(false);
  });
});
