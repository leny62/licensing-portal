import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'applicant@licensing.local',
    format: 'email',
  })
  @IsEmail()
  email!: string;
}
