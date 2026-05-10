import { ApplicationState, UserRole } from '@prisma/client';

import {
  ConflictError,
  IllegalTransitionError,
  SeparationOfDutiesError,
} from '../../common/errors/domain.errors';
import { ApplicationAction } from './enums/application-action.enum';
import { TransitionInput, TransitionResult } from './interfaces/application-actor.interface';

const terminalStates = new Set<ApplicationState>([
  ApplicationState.APPROVED,
  ApplicationState.REJECTED,
  ApplicationState.WITHDRAWN,
]);

const actionsRequiringJustification = new Set<ApplicationAction>([
  ApplicationAction.RequestInfo,
  ApplicationAction.RecommendApproval,
  ApplicationAction.RecommendRejection,
  ApplicationAction.Approve,
  ApplicationAction.Reject,
]);

export const transitionApplication = (input: TransitionInput): TransitionResult => {
  if (terminalStates.has(input.currentState)) {
    throw new IllegalTransitionError(`Cannot transition out of ${input.currentState}.`, {
      from: input.currentState,
      action: input.action,
      applicationId: input.context.applicationId,
    });
  }

  if (
    actionsRequiringJustification.has(input.action) &&
    (input.justification === undefined || input.justification.trim() === '')
  ) {
    throw new ConflictError('Justification is required for this transition.');
  }

  switch (input.action) {
    case ApplicationAction.Submit:
      requireState(input, ApplicationState.DRAFT);
      requireActor(input, UserRole.APPLICANT);
      requireApplicantOwns(input);
      if (!input.context.hasRequiredDocuments) {
        throw new ConflictError('At least one supporting document is required before submission.');
      }
      return { nextState: ApplicationState.SUBMITTED };

    case ApplicationAction.Withdraw:
      requireActor(input, UserRole.APPLICANT);
      requireApplicantOwns(input);
      if (
        input.currentState !== ApplicationState.DRAFT &&
        input.currentState !== ApplicationState.CHANGES_REQUESTED
      ) {
        throw illegal(input);
      }
      return { nextState: ApplicationState.WITHDRAWN };

    case ApplicationAction.Claim:
      requireState(input, ApplicationState.SUBMITTED);
      requireActor(input, UserRole.REVIEWER);
      requireReviewerNotPreviouslyAssigned(input);
      return { nextState: ApplicationState.UNDER_REVIEW };

    case ApplicationAction.Assign:
      requireState(input, ApplicationState.SUBMITTED);
      requireActor(input, UserRole.ADMIN);
      return { nextState: ApplicationState.UNDER_REVIEW };

    case ApplicationAction.RequestInfo:
      requireState(input, ApplicationState.UNDER_REVIEW);
      requireAssignedReviewer(input);
      return { nextState: ApplicationState.CHANGES_REQUESTED };

    case ApplicationAction.Resubmit:
      requireState(input, ApplicationState.CHANGES_REQUESTED);
      requireActor(input, UserRole.APPLICANT);
      requireApplicantOwns(input);
      if (!input.context.hasDocumentAfterLastRequest) {
        throw new ConflictError('At least one document must be added or replaced before resubmit.');
      }
      return { nextState: ApplicationState.UNDER_REVIEW };

    case ApplicationAction.RecommendApproval:
      requireState(input, ApplicationState.UNDER_REVIEW);
      requireAssignedReviewer(input);
      return { nextState: ApplicationState.RECOMMENDED_FOR_APPROVAL };

    case ApplicationAction.RecommendRejection:
      requireState(input, ApplicationState.UNDER_REVIEW);
      requireAssignedReviewer(input);
      return { nextState: ApplicationState.RECOMMENDED_FOR_REJECTION };

    case ApplicationAction.Approve:
      requireApproverDecisionState(input);
      requireActor(input, UserRole.APPROVER);
      requireSeparationOfDuties(input);
      return { nextState: ApplicationState.APPROVED };

    case ApplicationAction.Reject:
      requireApproverDecisionState(input);
      requireActor(input, UserRole.APPROVER);
      requireSeparationOfDuties(input);
      return { nextState: ApplicationState.REJECTED };
  }
};

const requireState = (input: TransitionInput, state: ApplicationState): void => {
  if (input.currentState !== state) {
    throw illegal(input);
  }
};

const requireActor = (input: TransitionInput, role: UserRole): void => {
  if (input.actor.role !== role) {
    throw illegal(input);
  }
};

const requireApplicantOwns = (input: TransitionInput): void => {
  if (input.actor.id !== input.context.applicantId) {
    throw illegal(input);
  }
};

const requireAssignedReviewer = (input: TransitionInput): void => {
  requireActor(input, UserRole.REVIEWER);

  if (input.context.reviewerId !== input.actor.id) {
    throw illegal(input);
  }
};

const requireReviewerNotPreviouslyAssigned = (input: TransitionInput): void => {
  if (input.context.reviewerHistoryIds.includes(input.actor.id)) {
    throw new SeparationOfDutiesError('Reviewer has already handled this application.');
  }
};

const requireApproverDecisionState = (input: TransitionInput): void => {
  if (
    input.currentState !== ApplicationState.RECOMMENDED_FOR_APPROVAL &&
    input.currentState !== ApplicationState.RECOMMENDED_FOR_REJECTION
  ) {
    throw illegal(input);
  }
};

const requireSeparationOfDuties = (input: TransitionInput): void => {
  if (input.context.reviewerHistoryIds.includes(input.actor.id)) {
    throw new SeparationOfDutiesError('Approver cannot decide their own recommendation.');
  }
};

const illegal = (input: TransitionInput): IllegalTransitionError =>
  new IllegalTransitionError(`Cannot ${input.action} from ${input.currentState}.`, {
    from: input.currentState,
    action: input.action,
    applicationId: input.context.applicationId,
  });
