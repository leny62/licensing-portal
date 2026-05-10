import { Inject, Injectable, ForbiddenException } from '@nestjs/common';
import { ApplicationDocument, ApplicationState } from '@prisma/client';

import { ConflictError, ResourceNotFoundError } from '../../common/errors/domain.errors';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { DOCUMENT_STORAGE } from '../../infra/storage/storage.tokens';
import { DocumentStorage } from '../../infra/storage/interfaces/document-storage.interface';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  ApplicationDocumentResponse,
  UploadDocumentInput,
} from './interfaces/document-response.interface';
import { prepareDocumentUploadStream } from './upload-stream';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(DOCUMENT_STORAGE) private readonly documentStorage: DocumentStorage,
  ) {}

  async upload(
    actor: AuthenticatedUser,
    input: UploadDocumentInput,
  ): Promise<ApplicationDocumentResponse> {
    const application = await this.prisma.application.findUnique({
      where: { id: input.applicationId },
    });

    if (application === null) {
      throw new ResourceNotFoundError('Application not found.');
    }

    if (
      actor.id !== application.applicantId ||
      (application.state !== ApplicationState.DRAFT &&
        application.state !== ApplicationState.CHANGES_REQUESTED)
    ) {
      throw new ForbiddenException('Only the applicant can upload documents in editable states.');
    }

    const prepared = await prepareDocumentUploadStream(input.stream, 5 * 1024 * 1024);
    const stored = await this.documentStorage.put(prepared.stream);

    try {
      const row = await this.prisma.transactional(async (tx) => {
        const latest = await tx.applicationDocument.findFirst({
          where: { applicationId: input.applicationId, slot: input.slot },
          orderBy: { version: 'desc' },
        });
        const version = (latest?.version ?? 0) + 1;

        return tx.applicationDocument.create({
          data: {
            applicationId: input.applicationId,
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

  async list(applicationId: string): Promise<ApplicationDocumentResponse[]> {
    const documents = await this.prisma.applicationDocument.findMany({
      where: { applicationId },
      orderBy: [{ slot: 'asc' }, { version: 'desc' }],
    });

    return documents.map((document) => this.mapDocument(document));
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

  private isUniqueConstraint(error: unknown): boolean {
    return (error as { code?: string }).code === 'P2002';
  }
}
