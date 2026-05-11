import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { MultipartFile } from '@fastify/multipart';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { DocumentsService } from './documents.service';
import { DocumentSlot } from './enums/document-slot.enum';
import { ApplicationDocumentResponse } from './interfaces/document-response.interface';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Roles(UserRole.APPLICANT, UserRole.REVIEWER, UserRole.APPROVER, UserRole.ADMIN)
  @Post('applications/:id/documents')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a document to an application slot' })
  async upload(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Req() req: FastifyRequest,
  ): Promise<ApplicationDocumentResponse> {
    let slot: string | undefined;
    let filePart: MultipartFile | undefined;

    for await (const part of req.parts()) {
      if (part.type === 'field' && part.fieldname === 'slot') {
        slot = part.value as string;
      } else if (part.type === 'file' && part.fieldname === 'file') {
        filePart = part;
        break;
      } else if (part.type === 'file') {
        await part.file.resume();
      }
    }

    if (!Object.values(DocumentSlot).includes(slot as DocumentSlot)) {
      if (filePart !== undefined) {
        await filePart.file.resume();
      }
      throw new BadRequestException('Missing or invalid slot value.');
    }

    if (filePart === undefined) {
      throw new BadRequestException('No file part received.');
    }

    return this.documentsService.upload(actor, {
      applicationId: id,
      slot: slot as string,
      originalFilename: filePart.filename ?? 'document',
      stream: filePart.file,
    });
  }

  @Get('applications/:id/documents')
  @ApiOperation({ summary: 'List document versions for an application' })
  async list(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<ApplicationDocumentResponse[]> {
    return this.documentsService.list(actor, id);
  }

  @Get('documents/:documentId/download')
  @ApiOperation({ summary: 'Download a specific document version' })
  async download(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('documentId') documentId: string,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const result = await this.documentsService.download(actor, documentId);

    void reply
      .header('Content-Type', result.mimeType)
      .header(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(result.originalFilename)}"`,
      )
      .header('Content-Length', String(result.sizeBytes))
      .header('Cache-Control', 'no-store')
      .header('X-Content-Type-Options', 'nosniff')
      .send(result.stream);
  }
}
