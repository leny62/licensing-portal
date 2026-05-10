import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshDto {
  @ApiProperty({
    example: 'refresh-token-from-login',
  })
  @IsString()
  refreshToken!: string;

  @ApiPropertyOptional({
    example: 'browser-local-dev',
  })
  @IsOptional()
  @IsString()
  deviceId?: string;
}
