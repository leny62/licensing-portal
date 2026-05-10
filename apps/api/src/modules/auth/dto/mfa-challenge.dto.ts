import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class MfaChallengeDto {
  @ApiProperty({
    example: 'mfa-token-from-login',
  })
  @IsString()
  mfaToken!: string;

  @ApiProperty({
    description: 'Six-digit TOTP code or a recovery code.',
    example: 'LOCAL-RECOVERY-0001',
    minLength: 6,
    maxLength: 32,
  })
  @IsString()
  @Length(6, 32)
  code!: string;

  @ApiPropertyOptional({
    example: 'browser-local-dev',
  })
  @IsOptional()
  @IsString()
  deviceId?: string;
}
