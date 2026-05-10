import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'applicant@licensing.local',
    format: 'email',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'LocalPass123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({
    example: 'browser-local-dev',
  })
  @IsOptional()
  @IsString()
  deviceId?: string;
}
