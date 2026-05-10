import { IsEmail, IsString } from 'class-validator';

export class CreateApplicationDto {
  @IsString()
  institutionName!: string;

  @IsString()
  legalForm!: string;

  @IsString()
  country!: string;

  @IsString()
  contactPerson!: string;

  @IsEmail()
  contactEmail!: string;

  @IsString()
  contactPhone!: string;

  @IsString()
  summary!: string;
}
