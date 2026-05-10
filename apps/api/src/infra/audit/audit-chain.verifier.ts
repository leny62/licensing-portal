import { ApplicationAudit } from '@prisma/client';

import { entryHash, GENESIS_PREVIOUS_HASH } from './canonicaliser';
import { AuditChainVerificationResult } from './interfaces/audit-entry.interface';

const toHashBuffer = (hash: string | null): Buffer => {
  return hash === null ? GENESIS_PREVIOUS_HASH : Buffer.from(hash, 'hex');
};

const canonicalEntryFromRow = (row: ApplicationAudit): Record<string, unknown> => ({
  id: row.id,
  applicationId: row.applicationId,
  actorId: row.actorId ?? undefined,
  action: row.action,
  fromState: row.fromState ?? undefined,
  toState: row.toState ?? undefined,
  justification: row.justification ?? undefined,
  sourceIp: row.sourceIp ?? undefined,
  correlationId: row.correlationId ?? undefined,
  payload: row.payload,
  occurredAt: row.occurredAt,
  clockOffsetMs: row.clockOffsetMs,
});

export const verifyAuditChainRows = (rows: ApplicationAudit[]): AuditChainVerificationResult => {
  let expectedPreviousHash = GENESIS_PREVIOUS_HASH;

  for (const [index, row] of rows.entries()) {
    const storedPreviousHash = toHashBuffer(row.previousHash);

    if (!storedPreviousHash.equals(expectedPreviousHash)) {
      return {
        valid: false,
        checkedEntries: index,
        divergenceAtEntryId: row.id,
        reason: 'PREVIOUS_HASH_MISMATCH',
        divergence: {
          applicationId: row.applicationId,
          entryId: row.id,
          expectedEntryHash: expectedPreviousHash.toString('hex'),
          storedEntryHash: storedPreviousHash.toString('hex'),
          index,
          reason: 'PREVIOUS_HASH_MISMATCH',
        },
      };
    }

    const expectedEntryHash = entryHash(canonicalEntryFromRow(row), expectedPreviousHash);
    const storedEntryHash = Buffer.from(row.entryHash, 'hex');

    if (!storedEntryHash.equals(expectedEntryHash)) {
      return {
        valid: false,
        checkedEntries: index,
        divergenceAtEntryId: row.id,
        reason: 'ENTRY_HASH_MISMATCH',
        divergence: {
          applicationId: row.applicationId,
          entryId: row.id,
          expectedEntryHash: expectedEntryHash.toString('hex'),
          storedEntryHash: row.entryHash,
          index,
          reason: 'ENTRY_HASH_MISMATCH',
        },
      };
    }

    expectedPreviousHash = storedEntryHash;
  }

  return { valid: true, checkedEntries: rows.length };
};
