import { PrismaClient } from '@prisma/client';

import {
  applyMigrations,
  startPostgres,
  StartedTestDatabase,
} from './helpers/postgres-test-database';

const APP_ROLE_PASSWORD = 'licensing_app_change_me';

describe('application_audit append-only enforcement', () => {
  jest.setTimeout(120_000);

  let database: StartedTestDatabase;
  let migrationClient: PrismaClient;
  let appClient: PrismaClient;
  let applicationId: string;
  let actorId: string;

  beforeAll(async () => {
    database = await startPostgres();
    applyMigrations(database.url);

    migrationClient = new PrismaClient({
      datasources: {
        db: {
          url: database.url,
        },
      },
    });

    const appRoleUrl = new URL(database.url);
    appRoleUrl.username = 'licensing_app';
    appRoleUrl.password = APP_ROLE_PASSWORD;

    appClient = new PrismaClient({
      datasources: {
        db: {
          url: appRoleUrl.toString(),
        },
      },
    });

    actorId = '99d7711c-ab24-4ea0-8e4d-39c97003565a';
    applicationId = '01d49f7d-37e3-492c-b6ac-c3f863a6ab53';

    await migrationClient.$executeRaw`
      INSERT INTO users (id, email, password_hash, full_name, role, updated_at)
      VALUES (
        ${actorId}::uuid,
        'applicant.audit@example.com',
        'hash',
        'Audit Applicant',
        'APPLICANT',
        now()
      )
    `;

    await migrationClient.$executeRaw`
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
        summary,
        updated_at
      )
      VALUES (
        ${applicationId}::uuid,
        'APP-AUDIT-000001',
        ${actorId}::uuid,
        'Audit Bank',
        'Limited Company',
        'Rwanda',
        'Audit Contact',
        'audit.contact@example.com',
        '+250700000000',
        'Audit append-only fixture',
        now()
      )
    `;
  });

  afterAll(async () => {
    await appClient?.$disconnect();
    await migrationClient?.$disconnect();
    await database?.stop();
  });

  it('allows INSERT and SELECT for licensing_app', async () => {
    await appClient.$executeRaw`
      INSERT INTO application_audit (
        id,
        application_id,
        actor_id,
        action,
        payload,
        previous_hash,
        entry_hash
      )
      VALUES (
        '11111111-1111-4111-8111-111111111111'::uuid,
        ${applicationId}::uuid,
        ${actorId}::uuid,
        'submit',
        '{"state":"SUBMITTED"}'::jsonb,
        NULL,
        'hash-1'
      )
    `;

    const rows = await appClient.$queryRaw<Array<{ count: number }>>`
      SELECT count(*)::int AS count
      FROM application_audit
      WHERE application_id = ${applicationId}::uuid
    `;

    expect(rows).toEqual([{ count: 1 }]);
  });

  it('rejects UPDATE for licensing_app', async () => {
    await expect(
      appClient.$executeRaw`
        UPDATE application_audit
        SET action = 'tampered'
        WHERE entry_hash = 'hash-1'
      `,
    ).rejects.toThrow();
  });

  it('rejects DELETE for licensing_app', async () => {
    await expect(
      appClient.$executeRaw`
        DELETE FROM application_audit
        WHERE entry_hash = 'hash-1'
      `,
    ).rejects.toThrow();
  });
});
