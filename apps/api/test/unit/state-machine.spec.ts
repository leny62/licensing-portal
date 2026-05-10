import { ApplicationState, UserRole } from '@prisma/client';

import {
  ConflictError,
  IllegalTransitionError,
  SeparationOfDutiesError,
} from '../../src/common/errors/domain.errors';
import { ApplicationAction } from '../../src/modules/applications/enums/application-action.enum';
import { TransitionInput } from '../../src/modules/applications/interfaces/application-actor.interface';
import { transitionApplication } from '../../src/modules/applications/state-machine';

const baseInput = (overrides: Partial<TransitionInput> = {}): TransitionInput => ({
  currentState: ApplicationState.DRAFT,
  action: ApplicationAction.Submit,
  actor: { id: 'applicant-1', role: UserRole.APPLICANT },
  context: {
    applicationId: 'application-1',
    applicantId: 'applicant-1',
    reviewerId: 'reviewer-1',
    reviewerHistoryIds: ['reviewer-1'],
    hasRequiredDocuments: true,
    hasDocumentAfterLastRequest: true,
  },
  ...overrides,
});

describe('transitionApplication', () => {
  it.each([
    [
      ApplicationAction.Submit,
      ApplicationState.DRAFT,
      UserRole.APPLICANT,
      ApplicationState.SUBMITTED,
    ],
    [
      ApplicationAction.Withdraw,
      ApplicationState.DRAFT,
      UserRole.APPLICANT,
      ApplicationState.WITHDRAWN,
    ],
    [
      ApplicationAction.Withdraw,
      ApplicationState.SUBMITTED,
      UserRole.APPLICANT,
      ApplicationState.WITHDRAWN,
    ],
    [
      ApplicationAction.Withdraw,
      ApplicationState.UNDER_REVIEW,
      UserRole.APPLICANT,
      ApplicationState.WITHDRAWN,
    ],
    [
      ApplicationAction.Claim,
      ApplicationState.SUBMITTED,
      UserRole.REVIEWER,
      ApplicationState.UNDER_REVIEW,
    ],
    [
      ApplicationAction.Assign,
      ApplicationState.SUBMITTED,
      UserRole.ADMIN,
      ApplicationState.UNDER_REVIEW,
    ],
    [
      ApplicationAction.RequestInfo,
      ApplicationState.UNDER_REVIEW,
      UserRole.REVIEWER,
      ApplicationState.CHANGES_REQUESTED,
    ],
    [
      ApplicationAction.Resubmit,
      ApplicationState.CHANGES_REQUESTED,
      UserRole.APPLICANT,
      ApplicationState.UNDER_REVIEW,
    ],
    [
      ApplicationAction.RecommendApproval,
      ApplicationState.UNDER_REVIEW,
      UserRole.REVIEWER,
      ApplicationState.RECOMMENDED_FOR_APPROVAL,
    ],
    [
      ApplicationAction.RecommendRejection,
      ApplicationState.UNDER_REVIEW,
      UserRole.REVIEWER,
      ApplicationState.RECOMMENDED_FOR_REJECTION,
    ],
    [
      ApplicationAction.Approve,
      ApplicationState.RECOMMENDED_FOR_APPROVAL,
      UserRole.APPROVER,
      ApplicationState.APPROVED,
    ],
    [
      ApplicationAction.Reject,
      ApplicationState.RECOMMENDED_FOR_REJECTION,
      UserRole.APPROVER,
      ApplicationState.REJECTED,
    ],
  ] as const)('allows %s from %s by %s', (action, currentState, role, nextState) => {
    const actorId = role === UserRole.APPLICANT ? 'applicant-1' : `${role.toLowerCase()}-1`;
    const result = transitionApplication(
      baseInput({
        action,
        currentState,
        actor: { id: actorId, role },
        justification: 'Because the file supports it.',
        context: {
          applicationId: 'application-1',
          applicantId: 'applicant-1',
          reviewerId: role === UserRole.REVIEWER ? actorId : 'reviewer-1',
          reviewerHistoryIds: action === ApplicationAction.Claim ? [] : ['reviewer-1'],
          hasRequiredDocuments: true,
          hasDocumentAfterLastRequest: true,
        },
      }),
    );

    expect(result.nextState).toBe(nextState);
  });

  it('rejects illegal transitions', () => {
    expect(() =>
      transitionApplication(
        baseInput({
          action: ApplicationAction.Approve,
          currentState: ApplicationState.SUBMITTED,
          actor: { id: 'approver-1', role: UserRole.APPROVER },
          justification: 'Approved.',
        }),
      ),
    ).toThrow(IllegalTransitionError);
  });

  it('rejects terminal state transitions', () => {
    expect(() =>
      transitionApplication(
        baseInput({
          currentState: ApplicationState.APPROVED,
          action: ApplicationAction.Withdraw,
        }),
      ),
    ).toThrow(IllegalTransitionError);
  });

  it('enforces separation of duties for approver decisions', () => {
    expect(() =>
      transitionApplication(
        baseInput({
          currentState: ApplicationState.RECOMMENDED_FOR_APPROVAL,
          action: ApplicationAction.Approve,
          actor: { id: 'reviewer-1', role: UserRole.APPROVER },
          justification: 'Approved.',
        }),
      ),
    ).toThrow(SeparationOfDutiesError);
  });

  it('requires justification for review and decision actions', () => {
    expect(() =>
      transitionApplication(
        baseInput({
          currentState: ApplicationState.UNDER_REVIEW,
          action: ApplicationAction.RecommendApproval,
          actor: { id: 'reviewer-1', role: UserRole.REVIEWER },
        }),
      ),
    ).toThrow(ConflictError);
  });

  it('requires a document before submit', () => {
    expect(() =>
      transitionApplication(
        baseInput({
          context: {
            applicationId: 'application-1',
            applicantId: 'applicant-1',
            reviewerId: null,
            reviewerHistoryIds: [],
            hasRequiredDocuments: false,
            hasDocumentAfterLastRequest: true,
          },
        }),
      ),
    ).toThrow(ConflictError);
  });
});
