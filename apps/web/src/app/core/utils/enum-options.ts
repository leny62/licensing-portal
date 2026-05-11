import { ApplicationDecision } from '../enums/application-decision.enum';
import { ApplicationState } from '../enums/application-state.enum';
import { UserRole } from '../enums/user-role.enum';
import { SelectOption } from '../interfaces/form.interface';

export const applicationStateOptions: SelectOption[] = [
  { label: 'Draft', value: ApplicationState.Draft },
  { label: 'Submitted', value: ApplicationState.Submitted },
  { label: 'Under review', value: ApplicationState.UnderReview },
  { label: 'Awaiting applicant response', value: ApplicationState.AwaitingApplicantResponse },
  { label: 'Recommended for approval', value: ApplicationState.RecommendedForApproval },
  { label: 'Recommended for rejection', value: ApplicationState.RecommendedForRejection },
  { label: 'Approved', value: ApplicationState.Approved },
  { label: 'Rejected', value: ApplicationState.Rejected },
  { label: 'Withdrawn', value: ApplicationState.Withdrawn },
];

export const userRoleOptions: SelectOption[] = [
  { label: 'Applicant', value: UserRole.Applicant },
  { label: 'Reviewer', value: UserRole.Reviewer },
  { label: 'Approver', value: UserRole.Approver },
  { label: 'Administrator', value: UserRole.Admin },
];

export const decisionOptions: SelectOption[] = [
  { label: 'Approve', value: ApplicationDecision.Approve },
  { label: 'Reject', value: ApplicationDecision.Reject },
];

export const labelForValue = (
  options: SelectOption[],
  value: string | null | undefined,
): string => {
  return options.find((option) => option.value === value)?.label ?? value ?? '';
};
