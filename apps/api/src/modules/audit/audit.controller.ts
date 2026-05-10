import { Controller, Get, Param, UseGuards } from '@nestjs/common';

import { AuditChainVerificationResult } from '../../infra/audit/interfaces/audit-entry.interface';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AuditReaderService } from './audit-reader.service';
import { ApplicationAuditResponse } from './interfaces/audit-response.interface';

@UseGuards(JwtAuthGuard)
@Controller('applications/:applicationId/audit')
export class AuditController {
  constructor(private readonly auditReaderService: AuditReaderService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('applicationId') applicationId: string,
  ): Promise<ApplicationAuditResponse[]> {
    return this.auditReaderService.list(user, applicationId);
  }

  @Get('verify')
  async verify(
    @CurrentUser() user: AuthenticatedUser,
    @Param('applicationId') applicationId: string,
  ): Promise<AuditChainVerificationResult> {
    return this.auditReaderService.verify(user, applicationId);
  }
}
