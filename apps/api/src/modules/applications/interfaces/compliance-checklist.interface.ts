import { BankCategory } from '@prisma/client';

import { ComplianceCheckStatus } from '../enums/compliance-check-status.enum';
import { DocumentSlot } from '../../documents/enums/document-slot.enum';

export interface ComplianceChecklistEvidence {
  slot: DocumentSlot;
  documentIds: string[];
  versions: number[];
}

export interface ComplianceChecklistItem {
  id: string;
  title: string;
  description: string;
  status: ComplianceCheckStatus;
  blocking: boolean;
  regulatoryBasis: string;
  evidence: ComplianceChecklistEvidence[];
}

export interface ComplianceChecklistSection {
  id: string;
  title: string;
  items: ComplianceChecklistItem[];
}

export interface ComplianceChecklistSummary {
  complete: number;
  missing: number;
  reviewRequired: number;
  notApplicable: number;
  blockingMissing: number;
}

export interface ComplianceChecklistResponse {
  applicationId: string;
  referenceNumber: string;
  bankCategory: BankCategory;
  paidUpCapitalRwf: string;
  requiredPaidUpCapitalRwf: number;
  summary: ComplianceChecklistSummary;
  sections: ComplianceChecklistSection[];
}
