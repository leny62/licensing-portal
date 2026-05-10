import { IsOptional, IsString, Length } from 'class-validator';

export class MfaChallengeDto {
  @IsString()
  mfaToken!: string;

  @IsString()
  @Length(6, 12)
  code!: string;

  @IsOptional()
  @IsString()
  deviceId?: string;
}
