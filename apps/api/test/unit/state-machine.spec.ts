import { ApplicationState, UserRole } from '@prisma/client';

import {
  ConflictError,
  IllegalTransitionError,
  SeparationOfDutiesError,
} from '../../src/common/errors/domain.errors';
import { TransitionInput } from '../../src/modules/applications/interfaces/application-actor.interface';
import { transitionApplication } from '../../src/modules/applications/state-machine';

const baseInput = (overrides: Partial<TransitionInput> = {}): TransitionInput => ({
  currentState: ApplicationState.DRAFT,
  action: 'submit',
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
    ['submit', ApplicationState.DRAFT, UserRole.APPLICANT, ApplicationState.SUBMITTED],
    ['withdraw', ApplicationState.DRAFT, UserRole.APPLICANT, ApplicationState.WITHDRAWN],
    ['claim', ApplicationState.SUBMITTED, UserRole.REVIEWER, ApplicationState.UNDER_REVIEW],
    ['assign', ApplicationState.SUBMITTED, UserRole.ADMIN, ApplicationState.UNDER_REVIEW],
    [
      'request_info',
      ApplicationState.UNDER_REVIEW,
      UserRole.REVIEWER,
      ApplicationState.CHANGES_REQUESTED,
    ],
    [
      'resubmit',
      ApplicationState.CHANGES_REQUESTED,
      UserRole.APPLICANT,
      ApplicationState.UNDER_REVIEW,
    ],
    [
      'recommend_approval',
      ApplicationState.UNDER_REVIEW,
      UserRole.REVIEWER,
      ApplicationState.RECOMMENDED_FOR_APPROVAL,
    ],
    [
      'recommend_rejection',
      ApplicationState.UNDER_REVIEW,
      UserRole.REVIEWER,
      ApplicationState.RECOMMENDED_FOR_REJECTION,
    ],
    [
      'approve',
      ApplicationState.RECOMMENDED_FOR_APPROVAL,
      UserRole.APPROVER,
      ApplicationState.APPROVED,
    ],
    [
      'reject',
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
          reviewerHistoryIds: action === 'claim' ? [] : ['reviewer-1'],
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
          action: 'approve',
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
          action: 'withdraw',
        }),
      ),
    ).toThrow(IllegalTransitionError);
  });

  it('enforces separation of duties for approver decisions', () => {
    expect(() =>
      transitionApplication(
        baseInput({
          currentState: ApplicationState.RECOMMENDED_FOR_APPROVAL,
          action: 'approve',
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
          action: 'recommend_approval',
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
