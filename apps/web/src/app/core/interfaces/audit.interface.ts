import { ApplicationState } from '../enums/application-state.enum';
import { UserRole } from '../enums/user-role.enum';

export interface AuditActorResponse {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface AuditListQuery {
  page?: number;
  size?: number;
}

export interface ApplicationAuditResponse {
  id: string;
  applicationId: string;
  actorId: string | null;
  actor: AuditActorResponse | null;
  action: string;
  fromState: ApplicationState | null;
  toState: ApplicationState | null;
  justification: string | null;
  sourceIp: string | null;
  correlationId: string | null;
  payload: unknown;
  previousHash: string | null;
  entryHash: string;
  occurredAt: string;
  clockOffsetMs: number;
}

export interface AuditChainVerificationResult {
  valid: boolean;
  checkedEntries: number;
  divergenceAtEntryId?: string;
  reason?: string;
}
