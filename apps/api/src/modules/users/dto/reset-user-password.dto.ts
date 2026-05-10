import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResetUserPasswordDto {
  @ApiProperty({
    example: 'temporary-password-123',
    minLength: 12,
  })
  @IsString()
  @MinLength(12)
  newPassword!: string;
}
