import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateApplicationDto {
  @ApiPropertyOptional({
    example: 'Kigali Community Bank',
  })
  @IsOptional()
  @IsString()
  institutionName?: string;

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
