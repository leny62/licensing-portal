import { createCipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { ApplicationState, NotificationType, PrismaClient, User, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';
import { config as loadEnv } from 'dotenv';

import { AuditService } from '../infra/audit/audit.service';

const AES_KEY_WRAP_ALGORITHM = 'id-aes256-wrap';
const AES_KEY_WRAP_DEFAULT_IV = Buffer.alloc(8, 0xa6);
const DEFAULT_PASSWORD = 'LocalPass123!';
const DEFAULT_MFA_RECOVERY_CODE = 'LOCAL-RECOVERY-0001';
const DEFAULT_RECOVERY_CODES = [DEFAULT_MFA_RECOVERY_CODE, 'LOCAL-RECOVERY-0002'];
const DOCUMENT_STORAGE_ROOT = './var/documents';
const PDF_FIXTURE = Buffer.from(
  [
    '%PDF-1.4',
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] >> endobj',
    'trailer << /Root 1 0 R >>',
    '%%EOF',
    '',
  ].join('\n'),
  'utf8',
);

interface SeedUser {
  email: string;
  fullName: string;
  role: UserRole;
  institutionName?: string;
}

interface StoredSeedDocument {
  storagePath: string;
  wrappedDek: Buffer;
  iv: Buffer;
  authTag: Buffer;
  bytesWritten: number;
}

loadEnv();

const prisma = new PrismaClient();
const auditService = new AuditService();

const seedUsers: SeedUser[] = [
  {
    email: 'applicant@licensing.local',
    fullName: 'Aline Applicant',
    role: UserRole.APPLICANT,
    institutionName: 'Kigali Community Bank',
  },
  {
    email: 'reviewer@licensing.local',
    fullName: 'Robert Reviewer',
    role: UserRole.REVIEWER,
  },
  {
    email: 'approver@licensing.local',
    fullName: 'Amara Approver',
    role: UserRole.APPROVER,
  },
  {
    email: 'admin@licensing.local',
    fullName: 'Ada Administrator',
    role: UserRole.ADMIN,
  },
];

const argonOptions = (): argon2.Options & { raw?: false } => ({
  type: argon2.argon2id,
  memoryCost: Number(process.env.ARGON2_MEMORY_KIB ?? 65536),
  timeCost: Number(process.env.ARGON2_TIME_COST ?? 3),
  parallelism: Number(process.env.ARGON2_PARALLELISM ?? 4),
});

const hashValue = (value: string): Promise<string> => {
  return argon2.hash(value, argonOptions());
};

const wrapDek = (dek: Buffer, kek: Buffer): Buffer => {
  const cipher = createCipheriv(AES_KEY_WRAP_ALGORITHM, kek, AES_KEY_WRAP_DEFAULT_IV);

  return Buffer.concat([cipher.update(dek), cipher.final()]);
};

const documentKek = (): Buffer => {
  const encoded = process.env.DOCUMENT_KEK_BASE64;

  if (encoded === undefined || encoded.trim() === '') {
    throw new Error('DOCUMENT_KEK_BASE64 must be set before running the seed.');
  }

  const kek = Buffer.from(encoded, 'base64');

  if (kek.byteLength !== 32) {
    throw new Error('DOCUMENT_KEK_BASE64 must decode to exactly 32 bytes.');
  }

  return kek;
};

const storeSeedDocument = async (content: Buffer): Promise<StoredSeedDocument> => {
  const storageRoot = path.resolve(process.env.DOCUMENT_STORAGE_ROOT ?? DOCUMENT_STORAGE_ROOT);
  const storagePath = randomUUID();
  const dek = randomBytes(32);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', dek, iv);
  const ciphertext = Buffer.concat([cipher.update(content), cipher.final()]);

  await mkdir(storageRoot, { recursive: true, mode: 0o700 });
  await writeFile(path.join(storageRoot, storagePath), ciphertext, { mode: 0o600 });

  return {
    storagePath,
    wrappedDek: wrapDek(dek, documentKek()),
    iv,
    authTag: cipher.getAuthTag(),
    bytesWritten: content.byteLength,
  };
};

const upsertUsers = async () => {
  const users = new Map<UserRole, User>();

  for (const seedUser of seedUsers) {
    const user = await prisma.user.upsert({
      where: { email: seedUser.email },
      update: {
        passwordHash: await hashValue(process.env.SEED_PASSWORD ?? DEFAULT_PASSWORD),
        fullName: seedUser.fullName,
        role: seedUser.role,
        institutionName: seedUser.institutionName ?? null,
        isActive: true,
        failedLoginCount: 0,
        lockedUntil: null,
      },
      create: {
        email: seedUser.email,
        passwordHash: await hashValue(process.env.SEED_PASSWORD ?? DEFAULT_PASSWORD),
        fullName: seedUser.fullName,
        role: seedUser.role,
        ...(seedUser.institutionName !== undefined
          ? { institutionName: seedUser.institutionName }
          : {}),
      },
    });

    users.set(seedUser.role, user);
  }

  return users;
};

const resetPrivilegedRecoveryCodes = async (users: Map<UserRole, { id: string }>) => {
  for (const role of [UserRole.REVIEWER, UserRole.APPROVER, UserRole.ADMIN]) {
    const user = users.get(role);

    if (user === undefined) {
      continue;
    }

    await prisma.userMfaRecoveryCode.deleteMany({
      where: { userId: user.id },
    });

    for (const code of DEFAULT_RECOVERY_CODES) {
      await prisma.userMfaRecoveryCode.create({
        data: {
          userId: user.id,
          codeHash: await hashValue(process.env.SEED_MFA_RECOVERY_CODE ?? code),
        },
      });
    }
  }
};

const createApplicationAuditIfMissing = async (
  applicationId: string,
  actorId: string,
  action: string,
  toState: ApplicationState,
): Promise<void> => {
  const existing = await prisma.applicationAudit.findFirst({
    where: {
      applicationId,
      action,
    },
  });

  if (existing !== null) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await auditService.write(tx, {
      applicationId,
      actorId,
      action,
      toState,
      payload: {
        seeded: true,
        checksum: createHash('sha256').update(`${applicationId}:${action}`).digest('hex'),
      },
    });
  });
};

const createDocumentIfMissing = async (
  applicationId: string,
  uploaderId: string,
  slot: string,
  version: number,
): Promise<void> => {
  const existing = await prisma.applicationDocument.findFirst({
    where: {
      applicationId,
      slot,
      version,
    },
  });

  if (existing !== null) {
    return;
  }

  const stored = await storeSeedDocument(PDF_FIXTURE);

  await prisma.applicationDocument.create({
    data: {
      applicationId,
      slot,
      version,
      originalFilename: `${slot.toLowerCase().replaceAll('_', '-')}-v${version}.pdf`,
      mimeType: 'application/pdf',
      sizeBytes: stored.bytesWritten,
      storagePath: stored.storagePath,
      wrappedDek: stored.wrappedDek,
      iv: stored.iv,
      authTag: stored.authTag,
      uploaderId,
    },
  });
};

const upsertApplications = async (users: Map<UserRole, { id: string; email: string }>) => {
  const applicant = users.get(UserRole.APPLICANT);
  const reviewer = users.get(UserRole.REVIEWER);

  if (applicant === undefined || reviewer === undefined) {
    throw new Error('Seed users were not created.');
  }

  const draft = await prisma.application.upsert({
    where: { referenceNumber: 'APP-SEED-DRAFT' },
    update: {},
    create: {
      referenceNumber: 'APP-SEED-DRAFT',
      applicantId: applicant.id,
      institutionName: 'Kigali Community Bank',
      legalForm: 'Limited Company',
      country: 'RW',
      contactPerson: 'Aline Applicant',
      contactEmail: applicant.email,
      contactPhone: '+250788000001',
      summary: 'Draft application for local UI smoke testing.',
      state: ApplicationState.DRAFT,
    },
  });

  const underReview = await prisma.application.upsert({
    where: { referenceNumber: 'APP-SEED-REVIEW' },
    update: {},
    create: {
      referenceNumber: 'APP-SEED-REVIEW',
      applicantId: applicant.id,
      reviewerId: reviewer.id,
      institutionName: 'Rwanda Digital Trust Bank',
      legalForm: 'Public Company',
      country: 'RW',
      contactPerson: 'Aline Applicant',
      contactEmail: applicant.email,
      contactPhone: '+250788000002',
      summary: 'Submitted application assigned to a reviewer for workflow testing.',
      state: ApplicationState.UNDER_REVIEW,
      rowVersion: 2,
      submittedAt: new Date(),
    },
  });

  await createDocumentIfMissing(draft.id, applicant.id, 'BUSINESS_PLAN', 1);
  await createDocumentIfMissing(underReview.id, applicant.id, 'BUSINESS_PLAN', 1);
  await createDocumentIfMissing(underReview.id, applicant.id, 'BUSINESS_PLAN', 2);
  await createApplicationAuditIfMissing(draft.id, applicant.id, 'seed_draft_created', draft.state);
  await createApplicationAuditIfMissing(
    underReview.id,
    applicant.id,
    'seed_application_submitted',
    ApplicationState.SUBMITTED,
  );
  await createApplicationAuditIfMissing(
    underReview.id,
    reviewer.id,
    'seed_application_claimed',
    underReview.state,
  );

  const existingNotification = await prisma.notification.findFirst({
    where: {
      userId: reviewer.id,
      applicationId: underReview.id,
      type: NotificationType.RECOMMENDATION_READY,
    },
  });

  if (existingNotification === null) {
    await prisma.notification.create({
      data: {
        userId: reviewer.id,
        applicationId: underReview.id,
        type: NotificationType.RECOMMENDATION_READY,
        payload: { referenceNumber: underReview.referenceNumber, seeded: true },
      },
    });
  }
};

const seed = async (): Promise<void> => {
  const users = await upsertUsers();

  await resetPrivilegedRecoveryCodes(users);
  await upsertApplications(users);

  process.stdout.write(
    [
      'Seed complete.',
      '',
      `Password for all seeded users: ${process.env.SEED_PASSWORD ?? DEFAULT_PASSWORD}`,
      'Users:',
      ...seedUsers.map((user) => `- ${user.role}: ${user.email}`),
      '',
      `MFA recovery code for reviewer/approver/admin: ${
        process.env.SEED_MFA_RECOVERY_CODE ?? DEFAULT_MFA_RECOVERY_CODE
      }`,
      'Run the seed again to reset consumed recovery codes.',
      '',
    ].join('\n'),
  );
};

seed()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);

    process.stderr.write(`Seed failed: ${message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
