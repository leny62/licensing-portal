import { ApplicationState, PrismaClient } from '@prisma/client';

import { AuditService } from '../../src/infra/audit/audit.service';
import { verifyAuditChainRows } from '../../src/infra/audit/audit-chain.verifier';
import {
  applyMigrations,
  startPostgres,
  StartedTestDatabase,
} from './helpers/postgres-test-database';

describe('audit hash chain', () => {
  jest.setTimeout(120_000);

  let database: StartedTestDatabase;
  let prisma: PrismaClient;
  let applicationId: string;
  let actorId: string;

  beforeAll(async () => {
    database = await startPostgres();
    applyMigrations(database.url);

    prisma = new PrismaClient({
      datasources: {
        db: {
          url: database.url,
        },
      },
    });

    actorId = '054c30af-fd5f-4719-8d07-3ab4e7ec46c4';
    applicationId = 'b8483fb1-b2f0-4ac7-bf98-87c28ea0732a';

    await prisma.$executeRaw`
      INSERT INTO users (id, email, password_hash, full_name, role)
      VALUES (
        ${actorId}::uuid,
        'audit.chain@example.com',
        'hash',
        'Audit Chain Applicant',
        'APPLICANT'
      )
    `;

    await prisma.$executeRaw`
      INSERT INTO applications (
        id,
        reference_number,
        applicant_id,
        institution_name,
        legal_form,
        country,
        contact_person,
        contact_email,
        contact_phone,
        summary
      )
      VALUES (
        ${applicationId}::uuid,
        'APP-AUDIT-CHAIN-000001',
        ${actorId}::uuid,
        'Audit Chain Bank',
        'Limited Company',
        'Rwanda',
        'Audit Chain Contact',
        'audit.chain.contact@example.com',
        '+250700000001',
        'Audit chain fixture'
      )
    `;
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await database?.stop();
  });

  it('writes a valid chain and detects a mutated entry', async () => {
    const auditService = new AuditService();
    const occurredAtBase = Date.UTC(2026, 4, 10, 6, 0, 0, 0);

    await prisma.$transaction(async (tx) => {
      for (let index = 0; index < 10; index += 1) {
        await auditService.write(tx, {
          applicationId,
          actorId,
          action: `chain_event_${index}`,
          fromState: ApplicationState.DRAFT,
          toState: ApplicationState.SUBMITTED,
          payload: { index },
          occurredAt: new Date(occurredAtBase + index),
        });
      }
    });

    const rows = await prisma.applicationAudit.findMany({
      where: { applicationId },
      orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
    });

    expect(rows).toHaveLength(10);
    expect(verifyAuditChainRows(rows)).toEqual({ valid: true, checkedEntries: 10 });

    const target = rows[4];
    if (target === undefined) {
      throw new Error('Expected the fifth audit row to exist.');
    }

    await prisma.$executeRawUnsafe(
      'ALTER TABLE application_audit DISABLE TRIGGER application_audit_no_mutation',
    );
    try {
      await prisma.applicationAudit.update({
        where: { id: target.id },
        data: { payload: { tampered: true } },
      });
    } finally {
      await prisma.$executeRawUnsafe(
        'ALTER TABLE application_audit ENABLE TRIGGER application_audit_no_mutation',
      );
    }

    const mutatedRows = await prisma.applicationAudit.findMany({
      where: { applicationId },
      orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
    });
    const verification = verifyAuditChainRows(mutatedRows);

    expect(verification.valid).toBe(false);
    expect(verification.divergence).toMatchObject({
      entryId: target.id,
      index: 4,
      reason: 'ENTRY_HASH_MISMATCH',
    });
  });
});
