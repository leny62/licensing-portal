import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    example: 'new.user@licensing.local',
    format: 'email',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'temporary-password',
    minLength: 12,
  })
  @IsString()
  @MinLength(12)
  password!: string;

  @ApiProperty({
    example: 'New User',
  })
  @IsString()
  fullName!: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.REVIEWER,
  })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiPropertyOptional({
    example: 'Kigali Community Bank',
  })
  @IsOptional()
  @IsString()
  institutionName?: string;
}
