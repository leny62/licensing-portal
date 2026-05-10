import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ListUsersQueryDto {
  @ApiPropertyOptional({
    enum: UserRole,
    example: UserRole.REVIEWER,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    example: 'reviewer',
  })
  @IsOptional()
  @IsString()
  q?: string;
}
