import { ApplicationState, Prisma } from '@prisma/client';

export interface ApplicationAuditResponse {
  id: string;
  applicationId: string;
  actorId: string | null;
  action: string;
  fromState: ApplicationState | null;
  toState: ApplicationState | null;
  justification: string | null;
  payload: Prisma.JsonValue;
  previousHash: string | null;
  entryHash: string;
  occurredAt: Date;
}
