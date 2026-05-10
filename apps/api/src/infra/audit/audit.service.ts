import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { entryHash, GENESIS_PREVIOUS_HASH } from './canonicaliser';
import { AuditEntryInput, CanonicalAuditEntry } from './interfaces/audit-entry.interface';

const truncateToMilliseconds = (date: Date): Date => {
  return new Date(Math.trunc(date.getTime()));
};

@Injectable()
export class AuditService {
  async write(tx: Prisma.TransactionClient, entry: AuditEntryInput) {
    const previous = await tx.applicationAudit.findFirst({
      where: {
        applicationId: entry.applicationId,
      },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    });

    const previousHash = previous?.entryHash
      ? Buffer.from(previous.entryHash, 'hex')
      : GENESIS_PREVIOUS_HASH;
    const canonicalEntry = this.toCanonicalEntry(entry);
    const hash = entryHash(
      canonicalEntry as unknown as Record<string, unknown>,
      previousHash,
    ).toString('hex');

    return tx.applicationAudit.create({
      data: {
        id: canonicalEntry.id,
        applicationId: canonicalEntry.applicationId,
        action: canonicalEntry.action,
        payload: canonicalEntry.payload,
        previousHash: previousHash.toString('hex'),
        entryHash: hash,
        occurredAt: canonicalEntry.occurredAt,
        clockOffsetMs: canonicalEntry.clockOffsetMs,
        ...(canonicalEntry.actorId !== undefined ? { actorId: canonicalEntry.actorId } : {}),
        ...(canonicalEntry.fromState !== undefined ? { fromState: canonicalEntry.fromState } : {}),
        ...(canonicalEntry.toState !== undefined ? { toState: canonicalEntry.toState } : {}),
        ...(canonicalEntry.justification !== undefined
          ? { justification: canonicalEntry.justification }
          : {}),
        ...(canonicalEntry.sourceIp !== undefined ? { sourceIp: canonicalEntry.sourceIp } : {}),
        ...(canonicalEntry.correlationId !== undefined
          ? { correlationId: canonicalEntry.correlationId }
          : {}),
      },
    });
  }

  private toCanonicalEntry(entry: AuditEntryInput): CanonicalAuditEntry {
    return {
      id: entry.id ?? randomUUID(),
      applicationId: entry.applicationId,
      ...(entry.actorId !== undefined ? { actorId: entry.actorId } : {}),
      action: entry.action,
      ...(entry.fromState !== undefined ? { fromState: entry.fromState } : {}),
      ...(entry.toState !== undefined ? { toState: entry.toState } : {}),
      ...(entry.justification !== undefined ? { justification: entry.justification } : {}),
      ...(entry.sourceIp !== undefined ? { sourceIp: entry.sourceIp } : {}),
      ...(entry.correlationId !== undefined ? { correlationId: entry.correlationId } : {}),
      payload: (entry.payload === undefined ? {} : entry.payload) as Prisma.InputJsonValue,
      occurredAt: truncateToMilliseconds(entry.occurredAt ?? new Date()),
      clockOffsetMs: entry.clockOffsetMs ?? 0,
    };
  }
}
