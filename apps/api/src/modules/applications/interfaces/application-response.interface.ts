import { ApplicationState, BankCategory } from '@prisma/client';

export interface ApplicationResponse {
  id: string;
  referenceNumber: string;
  applicantId: string;
  institutionName: string;
  bankCategory: BankCategory;
  paidUpCapitalRwf: string;
  legalForm: string;
  country: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  summary: string;
  state: ApplicationState;
  rowVersion: number;
  reviewerId: string | null;
  approverId: string | null;
  submittedAt: Date | null;
  lastResubmitAt: Date | null;
  decidedAt: Date | null;
  justification: string | null;
  createdAt: Date;
  updatedAt: Date;
}
