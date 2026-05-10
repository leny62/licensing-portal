import { ApplicationState, UserRole } from '@prisma/client';

export interface ApplicationActor {
  id: string;
  role: UserRole;
}

export interface ApplicationTransitionContext {
  applicationId: string;
  applicantId: string;
  reviewerId?: string | null;
  reviewerHistoryIds: string[];
  hasRequiredDocuments: boolean;
  hasDocumentAfterLastRequest: boolean;
}

export type ApplicationAction =
  | 'submit'
  | 'withdraw'
  | 'claim'
  | 'assign'
  | 'request_info'
  | 'resubmit'
  | 'recommend_approval'
  | 'recommend_rejection'
  | 'approve'
  | 'reject';

export interface TransitionInput {
  currentState: ApplicationState;
  action: ApplicationAction;
  actor: ApplicationActor;
  context: ApplicationTransitionContext;
  justification?: string;
}

export interface TransitionResult {
  nextState: ApplicationState;
}
