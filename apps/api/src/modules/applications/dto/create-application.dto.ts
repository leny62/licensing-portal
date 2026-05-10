import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class CreateApplicationDto {
  @ApiProperty({
    example: 'Kigali Community Bank',
  })
  @IsString()
  institutionName!: string;

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
