import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

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
