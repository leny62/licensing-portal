export enum ComplianceFindingSeverity {
  Info = 'INFO',
  Warning = 'WARNING',
  Blocking = 'BLOCKING',
}

export enum ComplianceFindingStatus {
  Open = 'OPEN',
  Resolved = 'RESOLVED',
  Waived = 'WAIVED',
}

export enum ApplicationDecisionOutcome {
  Approve = 'APPROVE',
  Reject = 'REJECT',
  RequestInformation = 'REQUEST_INFORMATION',
  Defer = 'DEFER',
}

export enum InformationLetterStatus {
  Issued = 'ISSUED',
  Responded = 'RESPONDED',
  Overdue = 'OVERDUE',
}

export enum FeeStatus {
  Pending = 'PENDING',
  ProofSubmitted = 'PROOF_SUBMITTED',
  Verified = 'VERIFIED',
  Rejected = 'REJECTED',
}

export enum FitAndProperStatus {
  Pending = 'PENDING',
  Cleared = 'CLEARED',
  Failed = 'FAILED',
}

export const COMPLIANCE_FINDING_SEVERITY_LABELS: Record<ComplianceFindingSeverity, string> = {
  [ComplianceFindingSeverity.Info]: 'Info',
  [ComplianceFindingSeverity.Warning]: 'Warning',
  [ComplianceFindingSeverity.Blocking]: 'Blocking',
};

export const COMPLIANCE_FINDING_STATUS_LABELS: Record<ComplianceFindingStatus, string> = {
  [ComplianceFindingStatus.Open]: 'Open',
  [ComplianceFindingStatus.Resolved]: 'Resolved',
  [ComplianceFindingStatus.Waived]: 'Waived',
};

export const APPLICATION_DECISION_OUTCOME_LABELS: Record<ApplicationDecisionOutcome, string> = {
  [ApplicationDecisionOutcome.Approve]: 'Approved',
  [ApplicationDecisionOutcome.Reject]: 'Rejected',
  [ApplicationDecisionOutcome.RequestInformation]: 'Requested information',
  [ApplicationDecisionOutcome.Defer]: 'Deferred',
};

export const INFORMATION_LETTER_STATUS_LABELS: Record<InformationLetterStatus, string> = {
  [InformationLetterStatus.Issued]: 'Issued',
  [InformationLetterStatus.Responded]: 'Responded',
  [InformationLetterStatus.Overdue]: 'Overdue',
};

export const FEE_STATUS_LABELS: Record<FeeStatus, string> = {
  [FeeStatus.Pending]: 'Pending',
  [FeeStatus.ProofSubmitted]: 'Proof submitted',
  [FeeStatus.Verified]: 'Verified',
  [FeeStatus.Rejected]: 'Rejected',
};

export const FIT_AND_PROPER_STATUS_LABELS: Record<FitAndProperStatus, string> = {
  [FitAndProperStatus.Pending]: 'Pending',
  [FitAndProperStatus.Cleared]: 'Cleared',
  [FitAndProperStatus.Failed]: 'Failed',
};
