import { ApiPropertyOptional } from '@nestjs/swagger';
import { SystemLogLevel } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListSystemLogsQueryDto {
  @ApiPropertyOptional({ enum: SystemLogLevel, example: SystemLogLevel.ERROR })
  @IsOptional()
  @IsEnum(SystemLogLevel)
  level?: SystemLogLevel;

  @ApiPropertyOptional({ example: 'AuditController' })
  @IsOptional()
  @IsString()
  logger?: string;

  @ApiPropertyOptional({ example: 'admin@licensing.local' })
  @IsOptional()
  @IsString()
  userName?: string;

  @ApiPropertyOptional({ example: '/api/v1/applications' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ example: '2026-05-10T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-05-10T23:59:59.999Z' })
  @IsOptional()
  @IsDateString()
  to?: string;

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
