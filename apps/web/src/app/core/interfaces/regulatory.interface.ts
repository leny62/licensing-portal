import { ApplicationState } from '../enums/application-state.enum';
import { DocumentSlot } from '../enums/document-slot.enum';
import {
  ApplicationDecisionOutcome,
  ComplianceFindingSeverity,
  ComplianceFindingStatus,
  FeeStatus,
  FitAndProperStatus,
  InformationLetterStatus,
} from '../enums/regulatory-status.enum';
import { SeniorManagerRole } from '../enums/senior-manager-role.enum';
import { ShareholderType } from '../enums/shareholder-type.enum';
import { UserRole } from '../enums/user-role.enum';

export interface CapitalDeclarationResponse {
  id: string;
  applicationId: string;
  amountRwf: string;
  sourceSummary: string;
  attestedAt: string;
  attestedByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertCapitalDeclarationRequest {
  amountRwf: number;
  sourceSummary: string;
}

export interface SignificantShareholderResponse {
  id: string;
  applicationId: string;
  shareholderType: ShareholderType;
  fullName: string;
  registrationNumber: string | null;
  country: string;
  ownershipPercent: string;
  sourceOfFunds: string;
  beneficialOwner: string | null;
  fitAndProperStatus: FitAndProperStatus;
  fitAndProperReviewedAt: string | null;
  fitAndProperReviewedById: string | null;
  fitAndProperJustification: string | null;
  attestedAt: string;
  attestedByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveSignificantShareholderRequest {
  shareholderType: ShareholderType;
  fullName: string;
  registrationNumber?: string;
  country: string;
  ownershipPercent: number;
  sourceOfFunds: string;
  beneficialOwner?: string;
}

export interface MarkShareholderFitAndProperRequest {
  status: FitAndProperStatus;
  justification: string;
}

export interface SeniorManagerResponse {
  id: string;
  applicationId: string;
  role: SeniorManagerRole;
  fullName: string;
  email: string;
  nationality: string;
  yearsExperience: number;
  fitAndProperAttested: boolean;
  attestedAt: string;
  attestedByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveSeniorManagerRequest {
  role: SeniorManagerRole;
  fullName: string;
  email: string;
  nationality: string;
  yearsExperience: number;
  fitAndProperAttested: boolean;
}

export interface ApplicationFeeResponse {
  id: string;
  applicationId: string;
  amountRwf: string;
  status: FeeStatus;
  proofDocumentId: string | null;
  submittedAt: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitFeeProofRequest {
  documentId: string;
}

export interface ApplicationDecisionRecordResponse {
  id: string;
  applicationId: string;
  actorId: string;
  outcome: ApplicationDecisionOutcome;
  decisionType: string | null;
  fromState: ApplicationState;
  toState: ApplicationState;
  justification: string;
  conditions: unknown;
  allowedActivities: string | null;
  refusalReasons: unknown;
  createdAt: string;
}

export interface InformationLetterResponse {
  id: string;
  applicationId: string;
  issuedById: string;
  subject: string;
  body: string;
  status: InformationLetterStatus;
  responseDueAt: string;
  issuedAt: string;
  respondedAt: string | null;
}

export interface IssueInformationLetterRequest {
  subject: string;
  body: string;
  responseDays: number;
}

export interface DocumentSlotSpecResponse {
  slot: DocumentSlot;
  title: string;
  description: string;
  ownerRole: UserRole;
  required: boolean;
  allowedMimeTypes: string[];
  maxBytes: number;
  regulatoryBasis: string;
}

export interface ComplianceFindingRecordResponse {
  id: string;
  applicationId: string;
  code: string;
  section: string;
  title: string;
  detail: string;
  severity: ComplianceFindingSeverity;
  status: ComplianceFindingStatus;
  regulatoryBasis: string | null;
  evidence: unknown;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationSlaClockResponse {
  id: string;
  applicationId: string;
  state: ApplicationState;
  startedAt: string;
  dueAt: string;
  stoppedAt: string | null;
  breachedAt: string | null;
}
