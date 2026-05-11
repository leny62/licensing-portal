import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationState, DecisionType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

import { ApplicationDecision } from '../enums/application-decision.enum';

export class ConditionDto {
  @IsString()
  text!: string;

  @IsString()
  satisfactionDate!: string;
}

export class RefusalReasonDto {
  @IsString()
  reason!: string;

  @IsString()
  articleCitation!: string;
}

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
  @ApiProperty({ enum: ApplicationDecision, example: ApplicationDecision.Approve })
  @IsEnum(ApplicationDecision)
  decision!: ApplicationDecision;

  @ApiProperty({ example: 'Final approval granted after review committee assessment.' })
  @IsString()
  justification!: string;

  @ApiPropertyOptional({ enum: DecisionType, example: DecisionType.GRANT })
  @IsOptional()
  @IsEnum(DecisionType)
  decisionType?: DecisionType;

  @ApiPropertyOptional({ type: [ConditionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionDto)
  conditions?: ConditionDto[];

  @ApiPropertyOptional({ example: 'Accept deposits; Grant credit facilities' })
  @IsOptional()
  @IsString()
  allowedActivities?: string;

  @ApiPropertyOptional({ type: [RefusalReasonDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RefusalReasonDto)
  refusalReasons?: RefusalReasonDto[];
}

export class ListApplicationsQueryDto {
  @ApiPropertyOptional({
    enum: ApplicationState,
    isArray: true,
    example: [
      ApplicationState.RECOMMENDED_FOR_APPROVAL,
      ApplicationState.RECOMMENDED_FOR_REJECTION,
    ],
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : Array.isArray(value) ? value : [value],
  )
  @IsArray()
  @IsEnum(ApplicationState, { each: true })
  state?: ApplicationState[];

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
