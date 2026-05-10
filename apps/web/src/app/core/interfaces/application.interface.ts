import { ApplicationDecision } from '../enums/application-decision.enum';
import { ApplicationState } from '../enums/application-state.enum';

export interface ApplicationResponse {
  id: string;
  referenceNumber: string;
  applicantId: string;
  institutionName: string;
  legalForm: string;
  country: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  summary: string;
  state: ApplicationState;
  rowVersion: number;
  reviewerId: string | null;
  approverId: string | null;
  submittedAt: string | null;
  lastResubmitAt: string | null;
  decidedAt: string | null;
  justification: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApplicationRequest {
  institutionName: string;
  legalForm: string;
  country: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  summary: string;
}

export type UpdateApplicationRequest = Partial<CreateApplicationRequest>;

export interface ListApplicationsQuery {
  state?: ApplicationState | ApplicationState[];
  reviewerId?: string;
  q?: string;
  page?: number;
  size?: number;
}

export interface AssignReviewerRequest {
  reviewerId: string;
}

export interface JustificationRequest {
  justification: string;
}

export interface RecommendationRequest extends JustificationRequest {
  recommendation: ApplicationDecision;
}

export interface DecisionRequest extends JustificationRequest {
  decision: ApplicationDecision;
}
