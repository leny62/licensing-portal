import {
  ApplicationDecisionOutcome,
  ApplicationState,
  ComplianceFindingSeverity,
  ComplianceFindingStatus,
  DecisionType,
  FeeStatus,
  FitAndProperStatus,
  InformationLetterStatus,
  SeniorManagerRole,
  ShareholderType,
} from '@prisma/client';

export interface CapitalDeclarationResponse {
  id: string;
  applicationId: string;
  amountRwf: string;
  sourceSummary: string;
  attestedAt: Date;
  attestedByUserId: string;
  createdAt: Date;
  updatedAt: Date;
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
  fitAndProperReviewedAt: Date | null;
  fitAndProperReviewedById: string | null;
  fitAndProperJustification: string | null;
  attestedAt: Date;
  attestedByUserId: string;
  createdAt: Date;
  updatedAt: Date;
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
  attestedAt: Date;
  attestedByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApplicationFeeResponse {
  id: string;
  applicationId: string;
  amountRwf: string;
  status: FeeStatus;
  proofDocumentId: string | null;
  submittedAt: Date | null;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApplicationDecisionRecordResponse {
  id: string;
  applicationId: string;
  actorId: string;
  outcome: ApplicationDecisionOutcome;
  decisionType: DecisionType | null;
  fromState: ApplicationState;
  toState: ApplicationState;
  justification: string;
  conditions: unknown;
  allowedActivities: string | null;
  refusalReasons: unknown;
  createdAt: Date;
}

export interface InformationLetterResponse {
  id: string;
  applicationId: string;
  issuedById: string;
  subject: string;
  body: string;
  status: InformationLetterStatus;
  responseDueAt: Date;
  issuedAt: Date;
  respondedAt: Date | null;
}

export interface DocumentSlotSpecResponse {
  slot: string;
  title: string;
  description: string;
  ownerRole: string;
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
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApplicationSlaClockResponse {
  id: string;
  applicationId: string;
  state: ApplicationState;
  startedAt: Date;
  dueAt: Date;
  stoppedAt: Date | null;
  breachedAt: Date | null;
}
