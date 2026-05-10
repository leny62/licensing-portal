import { ApplicationState, Prisma, UserRole } from '@prisma/client';

export interface AuditActorResponse {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
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
  payload: Prisma.JsonValue;
  previousHash: string | null;
  entryHash: string;
  occurredAt: Date;
  clockOffsetMs: number;
}
