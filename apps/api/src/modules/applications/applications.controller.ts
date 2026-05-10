import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import {
  AssignReviewerDto,
  DecisionDto,
  JustificationDto,
  ListApplicationsQueryDto,
  RecommendationDto,
} from './dto/transition.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { PagedResponse } from '../../common/interfaces/paged-response.interface';
import { ApplicationResponse } from './interfaces/application-response.interface';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Roles(UserRole.APPLICANT)
  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateApplicationDto,
  ): Promise<ApplicationResponse> {
    return this.applicationsService.createDraft(user, body);
  }

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListApplicationsQueryDto,
  ): Promise<PagedResponse<ApplicationResponse>> {
    return this.applicationsService.list(user, query);
  }

  @Get(':id')
  async get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<ApplicationResponse> {
    return this.applicationsService.get(user, id);
  }

  @Roles(UserRole.APPLICANT)
  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpdateApplicationDto,
  ): Promise<ApplicationResponse> {
    return this.applicationsService.updateDraft(user, id, body);
  }

  @Roles(UserRole.APPLICANT)
  @Post(':id/submit')
  async submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<ApplicationResponse> {
    return this.applicationsService.submit(user, id);
  }

  @Roles(UserRole.APPLICANT)
  @Post(':id/withdraw')
  async withdraw(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<ApplicationResponse> {
    return this.applicationsService.withdraw(user, id);
  }

  @Roles(UserRole.REVIEWER)
  @Post(':id/claim')
  async claim(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<ApplicationResponse> {
    return this.applicationsService.claim(user, id);
  }

  @Roles(UserRole.ADMIN)
  @Post(':id/assign')
  async assign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: AssignReviewerDto,
  ): Promise<ApplicationResponse> {
    return this.applicationsService.assign(user, id, body.reviewerId);
  }

  @Roles(UserRole.REVIEWER)
  @Post(':id/request-info')
  async requestInfo(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: JustificationDto,
  ): Promise<ApplicationResponse> {
    return this.applicationsService.requestInfo(user, id, body.justification);
  }

  @Roles(UserRole.APPLICANT)
  @Post(':id/resubmit')
  async resubmit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<ApplicationResponse> {
    return this.applicationsService.resubmit(user, id);
  }

  @Roles(UserRole.REVIEWER)
  @Post(':id/recommend')
  async recommend(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: RecommendationDto,
  ): Promise<ApplicationResponse> {
    return this.applicationsService.recommend(user, id, body.recommendation, body.justification);
  }

  @Roles(UserRole.APPROVER)
  @Post(':id/decide')
  async decide(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: DecisionDto,
  ): Promise<ApplicationResponse> {
    return this.applicationsService.decide(user, id, body.decision, body.justification);
  }
}
