import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { MfaChallengeDto } from './dto/mfa-challenge.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginResponse, LoginSuccessResponse } from './interfaces/auth-response.interface';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { MfaEnrollment } from './interfaces/mfa.interface';
import { MfaService } from './mfa.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly mfaService: MfaService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto): Promise<LoginResponse> {
    return this.authService.login(body.email, body.password, body.deviceId);
  }

  @Public()
  @Post('mfa/challenge')
  @HttpCode(HttpStatus.OK)
  async mfaChallenge(@Body() body: MfaChallengeDto): Promise<LoginSuccessResponse> {
    return this.authService.completeMfaLogin(body.mfaToken, body.code, body.deviceId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/enrol')
  @HttpCode(HttpStatus.CREATED)
  async mfaEnrol(@CurrentUser() user: AuthenticatedUser): Promise<MfaEnrollment> {
    return this.mfaService.enrol(user.id);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: RefreshDto) {
    return this.authService.refresh(body.refreshToken, body.deviceId);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() body: LogoutDto): Promise<void> {
    await this.authService.logout(body.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ChangePasswordDto,
  ): Promise<void> {
    await this.authService.changePassword(user.id, body.currentPassword, body.newPassword);
  }
}
