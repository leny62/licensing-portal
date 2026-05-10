import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { SeparationOfDutiesGuard } from './guards/separation-of-duties.guard';
import { MfaService } from './mfa.service';
import { PasswordHasher } from './password-hasher';
import { RefreshTokensService } from './refresh-tokens.service';
import { TokenService } from './tokens/token.service';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordHasher,
    TokenService,
    RefreshTokensService,
    MfaService,
    JwtAuthGuard,
    RolesGuard,
    SeparationOfDutiesGuard,
  ],
  exports: [
    AuthService,
    PasswordHasher,
    TokenService,
    RefreshTokensService,
    MfaService,
    JwtAuthGuard,
    RolesGuard,
    SeparationOfDutiesGuard,
  ],
})
export class AuthModule {}
