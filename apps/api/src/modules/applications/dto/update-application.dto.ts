import { ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationKind, BankCategory } from '@prisma/client';
import { IsEmail, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateApplicationDto {
  @ApiPropertyOptional({
    example: 'Kigali Community Bank',
  })
  @IsOptional()
  @IsString()
  institutionName?: string;

  @ApiPropertyOptional({
    enum: ApplicationKind,
    example: ApplicationKind.NEW_BANK,
  })
  @IsOptional()
  @IsEnum(ApplicationKind)
  applicationKind?: ApplicationKind;

  @ApiPropertyOptional({
    enum: BankCategory,
    example: BankCategory.COMMERCIAL_BANK,
  })
  @IsOptional()
  @IsEnum(BankCategory)
  bankCategory?: BankCategory;

  @ApiPropertyOptional({
    example: 20000000000,
    minimum: 10000000000,
  })
  @IsOptional()
  @IsInt()
  @Min(10000000000)
  @Max(999999999999999)
  paidUpCapitalRwf?: number;

  @ApiPropertyOptional({
    example: 'Limited Company',
  })
  @IsOptional()
  @IsString()
  legalForm?: string;

  @ApiPropertyOptional({
    example: 'RW',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    example: 'Aline Applicant',
  })
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @ApiPropertyOptional({
    example: 'applicant@licensing.local',
    format: 'email',
  })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({
    example: '+250788000001',
  })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({
    example: 'Updated application summary.',
  })
  @IsOptional()
  @IsString()
  summary?: string;
}
