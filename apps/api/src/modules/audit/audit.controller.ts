import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { AuditChainVerificationResult } from '../../infra/audit/interfaces/audit-entry.interface';
import { PagedResponse } from '../../common/interfaces/paged-response.interface';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AuditReaderService } from './audit-reader.service';
import { ListAuditQueryDto } from './dto/list-audit-query.dto';
import { ApplicationAuditResponse } from './interfaces/audit-response.interface';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('applications/:applicationId/audit')
export class AuditController {
  constructor(private readonly auditReaderService: AuditReaderService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('applicationId', new ParseUUIDPipe({ version: '4' })) applicationId: string,
    @Query() query: ListAuditQueryDto,
  ): Promise<PagedResponse<ApplicationAuditResponse>> {
    return this.auditReaderService.list(user, applicationId, query);
  }

  @Get('verify')
  @Roles(UserRole.ADMIN, UserRole.APPROVER)
  async verify(
    @CurrentUser() user: AuthenticatedUser,
    @Param('applicationId', new ParseUUIDPipe({ version: '4' })) applicationId: string,
  ): Promise<AuditChainVerificationResult> {
    return this.auditReaderService.verify(user, applicationId);
  }
}
