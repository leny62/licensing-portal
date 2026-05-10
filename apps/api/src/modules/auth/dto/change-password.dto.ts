import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'current-account-password',
  })
  @IsString()
  currentPassword!: string;

  @ApiProperty({
    example: 'new-account-password',
    minLength: 12,
  })
  @IsString()
  @MinLength(12)
  newPassword!: string;
}
