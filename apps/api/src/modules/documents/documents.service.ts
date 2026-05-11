import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
  Application,
  ApplicationDocument,
  ApplicationState,
  DocumentSlot as PrismaDocumentSlot,
  UserRole,
} from '@prisma/client';

import { ConflictError, ResourceNotFoundError } from '../../common/errors/domain.errors';
import { AuditService } from '../../infra/audit/audit.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { DOCUMENT_STORAGE } from '../../infra/storage/storage.tokens';
import { DocumentStorage } from '../../infra/storage/interfaces/document-storage.interface';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  ApplicationDocumentResponse,
  DownloadResult,
  UploadDocumentInput,
} from './interfaces/document-response.interface';
import { prepareDocumentUploadStream } from './upload-stream';
import { ApplicationAction } from '../applications/enums/application-action.enum';
import { canViewApplication } from '../applications/access-policy';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Inject(DOCUMENT_STORAGE) private readonly documentStorage: DocumentStorage,
  ) {}

  async upload(
    actor: AuthenticatedUser,
    input: UploadDocumentInput,
  ): Promise<ApplicationDocumentResponse> {
    const application = await this.prisma.application.findUnique({
      where: this.applicationWhere(input.applicationId),
    });

    if (application === null) {
      throw new ResourceNotFoundError('Application not found.');
    }

    const spec = await this.prisma.documentSlotSpec.findUnique({
      where: { slot: input.slot as PrismaDocumentSlot },
    });
    const maxBytes = spec?.maxBytes ?? 5 * 1024 * 1024;
    const ownerRole = spec?.ownerRole ?? UserRole.APPLICANT;

    if (ownerRole !== actor.role) {
      throw new ForbiddenException('This document slot is not owned by this account role.');
    }

    this.assertCanUploadSlot(actor, application, ownerRole);

    const prepared = await prepareDocumentUploadStream(input.stream, maxBytes);

    if (spec !== null && !spec.allowedMimeTypes.includes(prepared.mimeType)) {
      throw new ConflictError('Document MIME type is not allowed for this slot.');
    }

    const stored = await this.documentStorage.put(prepared.stream);

    try {
      const row = await this.prisma.transactional(async (tx) => {
        const latest = await tx.applicationDocument.findFirst({
          where: { applicationId: application.id, slot: input.slot },
          orderBy: { version: 'desc' },
        });
        const version = (latest?.version ?? 0) + 1;

        const document = await tx.applicationDocument.create({
          data: {
            applicationId: application.id,
            slot: input.slot,
            version,
            originalFilename: input.originalFilename,
            mimeType: prepared.mimeType,
            sizeBytes: stored.bytesWritten,
            storagePath: stored.storagePath,
            wrappedDek: stored.wrappedDek,
            iv: stored.iv,
            authTag: stored.authTag,
            uploaderId: actor.id,
          },
        });

        await this.auditService.write(tx, {
          applicationId: application.id,
          actorId: actor.id,
          action: ApplicationAction.UploadDocument,
          fromState: application.state,
          toState: application.state,
          payload: {
            documentId: document.id,
            slot: document.slot,
            version: document.version,
            mimeType: document.mimeType,
            sizeBytes: document.sizeBytes,
          },
        });

        return document;
      });

      return this.mapDocument(row);
    } catch (error) {
      await this.documentStorage.delete(stored.storagePath);

      if (this.isUniqueConstraint(error)) {
        throw new ConflictError('Concurrent upload conflict. Please retry.');
      }

      throw error;
    }
  }

  async list(
    actor: AuthenticatedUser,
    applicationId: string,
  ): Promise<ApplicationDocumentResponse[]> {
    const application = await this.verifyApplicationAccess(actor, applicationId);

    const documents = await this.prisma.applicationDocument.findMany({
      where: { applicationId: application.id },
      orderBy: [{ slot: 'asc' }, { version: 'desc' }],
    });

    return documents.map((document) => this.mapDocument(document));
  }

  async download(actor: AuthenticatedUser, documentId: string): Promise<DownloadResult> {
    const document = await this.prisma.applicationDocument.findUnique({
      where: { id: documentId },
    });

    if (document === null) {
      throw new ResourceNotFoundError('Document not found.');
    }

    await this.verifyApplicationAccess(actor, document.applicationId);

    const stream = this.documentStorage.get(document.storagePath, {
      wrappedDek: document.wrappedDek,
      iv: document.iv,
      authTag: document.authTag,
    });

    return {
      stream,
      mimeType: document.mimeType,
      originalFilename: document.originalFilename,
      sizeBytes: document.sizeBytes,
    };
  }

  private async verifyApplicationAccess(
    actor: AuthenticatedUser,
    applicationId: string,
  ): Promise<{ id: string; applicantId: string }> {
    const application = await this.prisma.application.findUnique({
      where: this.applicationWhere(applicationId),
      select: { id: true, applicantId: true },
    });

    if (application === null) {
      throw new ResourceNotFoundError('Application not found.');
    }

    if (actor.role !== UserRole.APPLICANT) {
      return application;
    }

    if (application.applicantId !== actor.id) {
      throw new ForbiddenException();
    }

    return application;
  }

  private mapDocument(document: ApplicationDocument): ApplicationDocumentResponse {
    return {
      id: document.id,
      applicationId: document.applicationId,
      slot: document.slot,
      version: document.version,
      originalFilename: document.originalFilename,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      createdAt: document.createdAt,
    };
  }

  private assertCanUploadSlot(
    actor: AuthenticatedUser,
    application: Application,
    ownerRole: UserRole,
  ): void {
    if (!canViewApplication(actor, application)) {
      throw new ForbiddenException('Access denied.');
    }

    if (ownerRole === UserRole.APPLICANT) {
      if (
        actor.id !== application.applicantId ||
        (application.state !== ApplicationState.DRAFT &&
          application.state !== ApplicationState.AWAITING_APPLICANT_RESPONSE)
      ) {
        throw new ForbiddenException('Only the applicant can upload documents in editable states.');
      }
      return;
    }

    if (ownerRole === UserRole.REVIEWER && application.state !== ApplicationState.UNDER_REVIEW) {
      throw new ForbiddenException('Reviewer document slots are only editable during review.');
    }

    if (
      ownerRole === UserRole.APPROVER &&
      application.state !== ApplicationState.RECOMMENDED_FOR_APPROVAL &&
      application.state !== ApplicationState.RECOMMENDED_FOR_REJECTION
    ) {
      throw new ForbiddenException('Approver document slots are only editable during decision.');
    }
  }

  private isUniqueConstraint(error: unknown): boolean {
    return (error as { code?: string }).code === 'P2002';
  }

  private applicationWhere(identifier: string): { id: string } | { referenceNumber: string } {
    return this.isUuid(identifier) ? { id: identifier } : { referenceNumber: identifier };
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }
}
