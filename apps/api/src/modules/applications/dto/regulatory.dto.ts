import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FitAndProperStatus, SeniorManagerRole, ShareholderType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class UpsertCapitalDeclarationDto {
  @ApiProperty({ example: 20000000000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(999999999999999)
  amountRwf!: number;

  @ApiProperty({ example: 'Paid-up capital funded from verified shareholder contributions.' })
  @IsString()
  sourceSummary!: string;
}

export class CreateSignificantShareholderDto {
  @ApiProperty({ enum: ShareholderType, example: ShareholderType.LEGAL_ENTITY })
  @IsEnum(ShareholderType)
  shareholderType!: ShareholderType;

  @ApiProperty({ example: 'Kigali Holdings Ltd' })
  @IsString()
  fullName!: string;

  @ApiPropertyOptional({ example: 'TIN-102030405' })
  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @ApiProperty({ example: 'RW' })
  @IsString()
  country!: string;

  @ApiProperty({ example: 35.5 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100)
  ownershipPercent!: number;

  @ApiProperty({ example: 'Audited retained earnings and committed bank transfer.' })
  @IsString()
  sourceOfFunds!: string;

  @ApiPropertyOptional({ example: 'Aline Beneficial Owner' })
  @IsOptional()
  @IsString()
  beneficialOwner?: string;
}

export class UpdateSignificantShareholderDto {
  @ApiPropertyOptional({ enum: ShareholderType, example: ShareholderType.NATURAL_PERSON })
  @IsOptional()
  @IsEnum(ShareholderType)
  shareholderType?: ShareholderType;

  @ApiPropertyOptional({ example: 'Aline Shareholder' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: 'NID-1199000000000000' })
  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @ApiPropertyOptional({ example: 'RW' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 12.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100)
  ownershipPercent?: number;

  @ApiPropertyOptional({ example: 'Salary savings and declared investment income.' })
  @IsOptional()
  @IsString()
  sourceOfFunds?: string;

  @ApiPropertyOptional({ example: 'Aline Shareholder' })
  @IsOptional()
  @IsString()
  beneficialOwner?: string;
}

export class MarkShareholderFitAndProperDto {
  @ApiProperty({ enum: FitAndProperStatus, example: FitAndProperStatus.CLEARED })
  @IsEnum(FitAndProperStatus)
  status!: FitAndProperStatus;

  @ApiProperty({ example: 'Source-of-funds evidence and declarations reviewed.' })
  @IsString()
  justification!: string;
}

export class CreateSeniorManagerDto {
  @ApiProperty({ enum: SeniorManagerRole, example: SeniorManagerRole.CHIEF_EXECUTIVE })
  @IsEnum(SeniorManagerRole)
  role!: SeniorManagerRole;

  @ApiProperty({ example: 'Aline Chief Executive' })
  @IsString()
  fullName!: string;

  @ApiProperty({ example: 'aline.ceo@bank.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'RW' })
  @IsString()
  nationality!: string;

  @ApiProperty({ example: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(80)
  yearsExperience!: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  fitAndProperAttested!: boolean;
}

export class UpdateSeniorManagerDto {
  @ApiPropertyOptional({ enum: SeniorManagerRole, example: SeniorManagerRole.CHIEF_RISK })
  @IsOptional()
  @IsEnum(SeniorManagerRole)
  role?: SeniorManagerRole;

  @ApiPropertyOptional({ example: 'Aline Risk Officer' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: 'risk@bank.local' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'RW' })
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiPropertyOptional({ example: 9 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(80)
  yearsExperience?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  fitAndProperAttested?: boolean;
}

export class SubmitFeeProofDto {
  @ApiProperty({ example: '8b441812-f22c-4755-9988-868bd131f905', format: 'uuid' })
  @IsUUID()
  documentId!: string;
}

export class IssueInformationLetterDto {
  @ApiProperty({ example: 'Additional ownership evidence required' })
  @IsString()
  subject!: string;

  @ApiProperty({
    example: 'Please provide updated source-of-funds evidence for all significant shareholders.',
  })
  @IsString()
  body!: string;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  responseDays!: number;
}
