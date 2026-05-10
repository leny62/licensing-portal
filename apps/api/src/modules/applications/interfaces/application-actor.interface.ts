import { ApplicationState, UserRole } from '@prisma/client';

import { ApplicationAction } from '../enums/application-action.enum';

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
