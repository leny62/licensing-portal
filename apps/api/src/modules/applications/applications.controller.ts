import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { FastifyReply } from 'fastify';

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
import {
  CreateSeniorManagerDto,
  CreateSignificantShareholderDto,
  IssueInformationLetterDto,
  MarkShareholderFitAndProperDto,
  SubmitFeeProofDto,
  UpdateSeniorManagerDto,
  UpdateSignificantShareholderDto,
  UpsertCapitalDeclarationDto,
} from './dto/regulatory.dto';
import { PagedResponse } from '../../common/interfaces/paged-response.interface';
import { ApplicationResponse } from './interfaces/application-response.interface';
import { ComplianceChecklistResponse } from './interfaces/compliance-checklist.interface';
import {
  ApplicationDecisionRecordResponse,
  ApplicationFeeResponse,
  ApplicationSlaClockResponse,
  CapitalDeclarationResponse,
  ComplianceFindingRecordResponse,
  DocumentSlotSpecResponse,
  InformationLetterResponse,
  SeniorManagerResponse,
  SignificantShareholderResponse,
} from './interfaces/regulatory-response.interface';
import { RegulatoryService } from './regulatory.service';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(
    private readonly applicationsService: ApplicationsService,
    private readonly regulatoryService: RegulatoryService,
  ) {}

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

  @Get(':id/compliance')
  async compliance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<ComplianceChecklistResponse> {
    return this.applicationsService.compliance(user, id);
  }

  @Get(':id/capital-declaration')
  async capitalDeclaration(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<CapitalDeclarationResponse | null> {
    return this.regulatoryService.getCapitalDeclaration(user, id);
  }

  @Roles(UserRole.APPLICANT)
  @Post(':id/capital-declaration')
  async upsertCapitalDeclaration(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpsertCapitalDeclarationDto,
  ): Promise<CapitalDeclarationResponse> {
    return this.regulatoryService.upsertCapitalDeclaration(user, id, body);
  }

  @Get(':id/shareholders')
  async shareholders(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<SignificantShareholderResponse[]> {
    return this.regulatoryService.listShareholders(user, id);
  }

  @Roles(UserRole.APPLICANT)
  @Post(':id/shareholders')
  async createShareholder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: CreateSignificantShareholderDto,
  ): Promise<SignificantShareholderResponse> {
    return this.regulatoryService.createShareholder(user, id, body);
  }

  @Roles(UserRole.APPLICANT)
  @Patch(':id/shareholders/:shareholderId')
  async updateShareholder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('shareholderId') shareholderId: string,
    @Body() body: UpdateSignificantShareholderDto,
  ): Promise<SignificantShareholderResponse> {
    return this.regulatoryService.updateShareholder(user, id, shareholderId, body);
  }

  @Roles(UserRole.REVIEWER)
  @Patch(':id/shareholders/:shareholderId/fit-and-proper')
  async markShareholderFitAndProper(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('shareholderId') shareholderId: string,
    @Body() body: MarkShareholderFitAndProperDto,
  ): Promise<SignificantShareholderResponse> {
    return this.regulatoryService.markShareholderFitAndProper(user, id, shareholderId, body);
  }

  @Roles(UserRole.APPLICANT)
  @Delete(':id/shareholders/:shareholderId')
  async deleteShareholder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('shareholderId') shareholderId: string,
  ): Promise<void> {
    return this.regulatoryService.deleteShareholder(user, id, shareholderId);
  }

  @Get(':id/senior-managers')
  async seniorManagers(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<SeniorManagerResponse[]> {
    return this.regulatoryService.listSeniorManagers(user, id);
  }

  @Roles(UserRole.APPLICANT)
  @Post(':id/senior-managers')
  async createSeniorManager(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: CreateSeniorManagerDto,
  ): Promise<SeniorManagerResponse> {
    return this.regulatoryService.createSeniorManager(user, id, body);
  }

  @Roles(UserRole.APPLICANT)
  @Patch(':id/senior-managers/:seniorManagerId')
  async updateSeniorManager(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('seniorManagerId') seniorManagerId: string,
    @Body() body: UpdateSeniorManagerDto,
  ): Promise<SeniorManagerResponse> {
    return this.regulatoryService.updateSeniorManager(user, id, seniorManagerId, body);
  }

  @Roles(UserRole.APPLICANT)
  @Delete(':id/senior-managers/:seniorManagerId')
  async deleteSeniorManager(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('seniorManagerId') seniorManagerId: string,
  ): Promise<void> {
    return this.regulatoryService.deleteSeniorManager(user, id, seniorManagerId);
  }

  @Get(':id/document-slot-specs')
  async documentSlotSpecs(): Promise<DocumentSlotSpecResponse[]> {
    return this.regulatoryService.listDocumentSlotSpecs();
  }

  @Get(':id/permitted-activities')
  async permittedActivities(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<string[]> {
    return this.regulatoryService.permittedActivities(user, id);
  }

  @Get(':id/compliance-findings')
  async complianceFindings(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<ComplianceFindingRecordResponse[]> {
    return this.regulatoryService.listComplianceFindings(user, id);
  }

  @Get(':id/fees')
  async fee(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<ApplicationFeeResponse | null> {
    return this.regulatoryService.getFee(user, id);
  }

  @Roles(UserRole.APPLICANT)
  @Post(':id/fees/proof')
  async submitFeeProof(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: SubmitFeeProofDto,
  ): Promise<ApplicationFeeResponse> {
    return this.regulatoryService.submitFeeProof(user, id, body);
  }

  @Get(':id/decisions')
  async decisions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<ApplicationDecisionRecordResponse[]> {
    return this.regulatoryService.listDecisionRecords(user, id);
  }

  @Get(':id/information-letters')
  async informationLetters(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<InformationLetterResponse[]> {
    return this.regulatoryService.listInformationLetters(user, id);
  }

  @Get(':id/sla-clocks')
  async slaClocks(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<ApplicationSlaClockResponse[]> {
    return this.regulatoryService.listSlaClocks(user, id);
  }

  @Roles(UserRole.REVIEWER, UserRole.ADMIN)
  @Post(':id/information-letters')
  async issueInformationLetter(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: IssueInformationLetterDto,
  ): Promise<InformationLetterResponse> {
    return this.regulatoryService.issueInformationLetter(user, id, body);
  }

  @Get(':id/information-letters/:letterId/pdf')
  async informationLetterPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('letterId') letterId: string,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const pdf = await this.regulatoryService.renderInformationLetterPdf(user, id, letterId);

    void reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `inline; filename="${encodeURIComponent(letterId)}.pdf"`)
      .header('Cache-Control', 'no-store')
      .send(pdf);
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
    const structuredDecision: NonNullable<Parameters<ApplicationsService['decide']>[4]> = {};

    if (body.decisionType !== undefined) structuredDecision.decisionType = body.decisionType;
    if (body.conditions !== undefined) structuredDecision.conditions = body.conditions;
    if (body.allowedActivities !== undefined) {
      structuredDecision.allowedActivities = body.allowedActivities;
    }
    if (body.refusalReasons !== undefined) {
      structuredDecision.refusalReasons = body.refusalReasons;
    }

    return this.applicationsService.decide(
      user,
      id,
      body.decision,
      body.justification,
      structuredDecision,
    );
  }

  @Roles(UserRole.APPROVER)
  @Post(':id/defer')
  async defer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: JustificationDto,
  ): Promise<ApplicationResponse> {
    return this.applicationsService.defer(user, id, body.justification);
  }
}
