import { ApplicationState, Prisma } from '@prisma/client';

export interface AuditEntryInput {
  id?: string;
  applicationId: string;
  actorId?: string;
  action: string;
  fromState?: ApplicationState;
  toState?: ApplicationState;
  justification?: string;
  sourceIp?: string;
  correlationId?: string;
  payload?: Prisma.InputJsonValue;
  occurredAt?: Date;
  clockOffsetMs?: number;
}

export interface CanonicalAuditEntry {
  id: string;
  applicationId: string;
  actorId?: string;
  action: string;
  fromState?: ApplicationState;
  toState?: ApplicationState;
  justification?: string;
  sourceIp?: string;
  correlationId?: string;
  payload: Prisma.InputJsonValue;
  occurredAt: Date;
  clockOffsetMs: number;
}

export interface AuditChainDivergence {
  applicationId: string;
  entryId: string;
  expectedEntryHash: string;
  storedEntryHash: string;
  index: number;
  reason: 'PREVIOUS_HASH_MISMATCH' | 'ENTRY_HASH_MISMATCH';
}

export interface AuditChainVerificationResult {
  valid: boolean;
  divergence?: AuditChainDivergence;
}
