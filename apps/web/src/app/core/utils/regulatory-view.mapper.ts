import { ApplicationState } from '../enums/application-state.enum';
import {
  APPLICATION_DECISION_OUTCOME_LABELS,
  COMPLIANCE_FINDING_SEVERITY_LABELS,
  COMPLIANCE_FINDING_STATUS_LABELS,
  FEE_STATUS_LABELS,
  INFORMATION_LETTER_STATUS_LABELS,
} from '../enums/regulatory-status.enum';
import { SENIOR_MANAGER_ROLE_LABELS, SeniorManagerRole } from '../enums/senior-manager-role.enum';
import { SHAREHOLDER_TYPE_LABELS, ShareholderType } from '../enums/shareholder-type.enum';

const regulatoryLabelMaps: Array<Record<string, string>> = [
  APPLICATION_DECISION_OUTCOME_LABELS,
  COMPLIANCE_FINDING_SEVERITY_LABELS,
  COMPLIANCE_FINDING_STATUS_LABELS,
  INFORMATION_LETTER_STATUS_LABELS,
  FEE_STATUS_LABELS,
];

export const formatRwf = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') {
    return 'Not set';
  }

  return new Intl.NumberFormat('en-RW', {
    maximumFractionDigits: 0,
    style: 'currency',
    currency: 'RWF',
  }).format(Number(value));
};

export const formatPercent = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  return `${Number(value).toFixed(2).replace(/\.00$/, '')}%`;
};

export const shareholderTypeLabel = (value: ShareholderType | string): string => {
  return SHAREHOLDER_TYPE_LABELS[value as ShareholderType] ?? value;
};

export const seniorManagerRoleLabel = (value: SeniorManagerRole | string): string => {
  return SENIOR_MANAGER_ROLE_LABELS[value as SeniorManagerRole] ?? value;
};

export const regulatoryStatusLabel = (value: string | null | undefined): string => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  return regulatoryLabelMaps.find((labels) => labels[value] !== undefined)?.[value] ?? value;
};

export const applicationStateLabel = (value: ApplicationState | string | null): string => {
  const labels: Record<ApplicationState, string> = {
    [ApplicationState.Draft]: 'Draft',
    [ApplicationState.Submitted]: 'Submitted',
    [ApplicationState.UnderReview]: 'Under review',
    [ApplicationState.AwaitingApplicantResponse]: 'Awaiting applicant response',
    [ApplicationState.RecommendedForApproval]: 'Recommended for approval',
    [ApplicationState.RecommendedForRejection]: 'Recommended for rejection',
    [ApplicationState.Approved]: 'Approved',
    [ApplicationState.Rejected]: 'Rejected',
    [ApplicationState.Withdrawn]: 'Withdrawn',
  };

  return value === null ? '—' : (labels[value as ApplicationState] ?? value);
};

export const transitionLabel = (
  fromState: ApplicationState | string,
  toState: ApplicationState | string,
): string => {
  return `${applicationStateLabel(fromState)} → ${applicationStateLabel(toState)}`;
};
