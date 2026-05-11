import { ApplicationState } from '../enums/application-state.enum';
import { UserRole } from '../enums/user-role.enum';
import { ApplicationResponse } from '../interfaces/application.interface';
import { AuthenticatedUser } from '../interfaces/user.interface';

export const formatDateTime = (value: string | null | undefined): string => {
  if (value === null || value === undefined) {
    return 'Not set';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

export const canEditApplication = (
  user: AuthenticatedUser | null,
  application: ApplicationResponse,
): boolean => {
  return (
    user?.role === UserRole.Applicant &&
    user.id === application.applicantId &&
    (application.state === ApplicationState.Draft ||
      application.state === ApplicationState.AwaitingApplicantResponse)
  );
};

export const canSubmitApplication = (
  user: AuthenticatedUser | null,
  application: ApplicationResponse,
): boolean => {
  return (
    user?.role === UserRole.Applicant &&
    user.id === application.applicantId &&
    application.state === ApplicationState.Draft
  );
};

export const canWithdrawApplication = (
  user: AuthenticatedUser | null,
  application: ApplicationResponse,
): boolean => {
  return (
    user?.role === UserRole.Applicant &&
    user.id === application.applicantId &&
    [
      ApplicationState.Draft,
      ApplicationState.Submitted,
      ApplicationState.UnderReview,
      ApplicationState.AwaitingApplicantResponse,
    ].includes(application.state)
  );
};

export const canResubmitApplication = (
  user: AuthenticatedUser | null,
  application: ApplicationResponse,
): boolean => {
  return (
    user?.role === UserRole.Applicant &&
    user.id === application.applicantId &&
    application.state === ApplicationState.AwaitingApplicantResponse
  );
};

export const canClaimApplication = (
  user: AuthenticatedUser | null,
  application: ApplicationResponse,
): boolean => {
  return user?.role === UserRole.Reviewer && application.state === ApplicationState.Submitted;
};

export const canReviewApplication = (
  user: AuthenticatedUser | null,
  application: ApplicationResponse,
): boolean => {
  return (
    user?.role === UserRole.Reviewer &&
    user.id === application.reviewerId &&
    application.state === ApplicationState.UnderReview
  );
};

export const canDecideApplication = (
  user: AuthenticatedUser | null,
  application: ApplicationResponse,
): boolean => {
  return (
    user?.role === UserRole.Approver &&
    [ApplicationState.RecommendedForApproval, ApplicationState.RecommendedForRejection].includes(
      application.state,
    )
  );
};
