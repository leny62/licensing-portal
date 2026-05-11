import { ApplicationState } from '../enums/application-state.enum';
import { ApplicationAuditResponse } from '../interfaces/audit.interface';

const ACTION_LABELS: Record<string, string> = {
  assign: 'Reviewer assigned',
  claim: 'Application claimed',
  create_draft: 'Draft created',
  decide_approve: 'Application approved',
  decide_reject: 'Application rejected',
  defer: 'Decision deferred',
  recommend_approval: 'Approval recommended',
  recommend_rejection: 'Rejection recommended',
  request_info: 'Information requested',
  resubmit: 'Application resubmitted',
  seed_draft_created: 'Draft created',
  seed_recommendation_recorded: 'Recommendation recorded',
  seed_review_claimed: 'Review claimed',
  seed_review_submitted: 'Review submitted',
  submit: 'Application submitted',
  update_draft: 'Draft updated',
  upload_document: 'Document uploaded',
  withdraw: 'Application withdrawn',
};

const STATE_LABELS: Record<ApplicationState, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under review',
  AWAITING_APPLICANT_RESPONSE: 'Awaiting applicant response',
  RECOMMENDED_FOR_APPROVAL: 'Recommended for approval',
  RECOMMENDED_FOR_REJECTION: 'Recommended for rejection',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
};

export const formatAuditAction = (action: string): string => {
  return (
    ACTION_LABELS[action] ??
    action
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  );
};

export const formatAuditState = (state: ApplicationState | null): string => {
  return state === null ? 'Not set' : STATE_LABELS[state];
};

export const formatAuditActor = (entry: ApplicationAuditResponse): string => {
  if (entry.actor !== null) {
    return `${entry.actor.fullName} - ${entry.actor.role}`;
  }

  if (entry.actorId !== null) {
    return entry.actorId;
  }

  return 'System';
};

export const formatAuditTransition = (entry: ApplicationAuditResponse): string => {
  if (entry.fromState === null && entry.toState === null) {
    return 'No state transition';
  }

  return `${formatAuditState(entry.fromState)} -> ${formatAuditState(entry.toState)}`;
};

export const shortAuditHash = (hash: string | null): string => {
  return hash === null ? 'None' : `${hash.slice(0, 12)}...${hash.slice(-8)}`;
};

export const auditPayloadSummary = (payload: unknown): string => {
  if (!isRecord(payload)) {
    return 'No payload';
  }

  const rowVersion = valueText(payload['rowVersion']);
  const reviewerId = valueText(payload['reviewerId']);
  const decision = valueText(payload['decision'] ?? payload['recommendation']);
  const referenceNumber = valueText(payload['referenceNumber']);
  const documentSlot = valueText(payload['slot']);
  const documentVersion = valueText(payload['version']);
  const changedFields = Array.isArray(payload['changedFields'])
    ? payload['changedFields'].map(String).join(', ')
    : null;
  const parts = [
    referenceNumber === null ? null : `reference ${referenceNumber}`,
    rowVersion === null ? null : `row version ${rowVersion}`,
    reviewerId === null ? null : `reviewer ${reviewerId}`,
    decision === null ? null : `decision ${decision}`,
    documentSlot === null ? null : `document ${documentSlot}`,
    documentVersion === null ? null : `version ${documentVersion}`,
    changedFields === null || changedFields === '' ? null : `changed ${changedFields}`,
  ].filter((value): value is string => value !== null);

  return parts.length === 0 ? 'Payload recorded' : parts.join(' - ');
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const valueText = (value: unknown): string | null => {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return null;
};
