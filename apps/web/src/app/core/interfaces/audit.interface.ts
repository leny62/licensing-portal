import { ApplicationState } from '../enums/application-state.enum';

export interface ApplicationAuditResponse {
  id: string;
  applicationId: string;
  actorId: string | null;
  action: string;
  fromState: ApplicationState | null;
  toState: ApplicationState | null;
  justification: string | null;
  payload: unknown;
  previousHash: string | null;
  entryHash: string;
  occurredAt: string;
}

export interface AuditChainVerificationResult {
  valid: boolean;
  checkedEntries: number;
  divergenceAtEntryId?: string;
  reason?: string;
}
