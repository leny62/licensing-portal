import { ApiProperty } from '@nestjs/swagger';
import { BankCategory } from '@prisma/client';
import { IsEmail, IsEnum, IsInt, IsString, Max, Min } from 'class-validator';

export class CreateApplicationDto {
  @ApiProperty({
    example: 'Kigali Community Bank',
  })
  @IsString()
  institutionName!: string;

  @ApiProperty({
    enum: BankCategory,
    example: BankCategory.COMMERCIAL_BANK,
  })
  @IsEnum(BankCategory)
  bankCategory!: BankCategory;

  @ApiProperty({
    example: 20000000000,
    minimum: 10000000000,
  })
  @IsInt()
  @Min(10000000000)
  @Max(999999999999999)
  paidUpCapitalRwf!: number;

  @ApiProperty({
    example: 'Limited Company',
  })
  @IsString()
  legalForm!: string;

  @ApiProperty({
    example: 'RW',
  })
  @IsString()
  country!: string;

  @ApiProperty({
    example: 'Aline Applicant',
  })
  @IsString()
  contactPerson!: string;

  @ApiProperty({
    example: 'applicant@licensing.local',
    format: 'email',
  })
  @IsEmail()
  contactEmail!: string;

  @ApiProperty({
    example: '+250788000001',
  })
  @IsString()
  contactPhone!: string;

  @ApiProperty({
    example: 'Application for a new commercial banking licence.',
  })
  @IsString()
  summary!: string;
}
