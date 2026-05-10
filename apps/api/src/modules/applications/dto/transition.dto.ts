import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationState } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

import { ApplicationDecision } from '../enums/application-decision.enum';

export class JustificationDto {
  @ApiProperty({
    example: 'Additional supporting evidence is required before review can continue.',
  })
  @IsString()
  justification!: string;
}

export class AssignReviewerDto {
  @ApiProperty({
    example: '2f6a3d44-40f8-4a0d-a0c0-4a3878a70b2a',
    format: 'uuid',
  })
  @IsUUID()
  reviewerId!: string;
}

export class RecommendationDto {
  @ApiProperty({
    enum: ApplicationDecision,
    example: ApplicationDecision.Approve,
  })
  @IsEnum(ApplicationDecision)
  recommendation!: ApplicationDecision;

  @ApiProperty({
    example: 'Applicant meets the documented eligibility requirements.',
  })
  @IsString()
  justification!: string;
}

export class DecisionDto {
  @ApiProperty({
    enum: ApplicationDecision,
    example: ApplicationDecision.Approve,
  })
  @IsEnum(ApplicationDecision)
  decision!: ApplicationDecision;

  @ApiProperty({
    example: 'Final approval granted after review committee assessment.',
  })
  @IsString()
  justification!: string;
}

export class ListApplicationsQueryDto {
  @ApiPropertyOptional({
    enum: ApplicationState,
    example: ApplicationState.UNDER_REVIEW,
  })
  @IsOptional()
  @IsEnum(ApplicationState)
  state?: ApplicationState;

  @ApiPropertyOptional({
    example: '2f6a3d44-40f8-4a0d-a0c0-4a3878a70b2a',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  reviewerId?: string;

  @ApiPropertyOptional({
    example: 'APP-20260510',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ example: 0, description: 'Zero-based page index', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page?: number;

  @ApiPropertyOptional({ example: 20, description: 'Page size (max 50)', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  size?: number;
}
