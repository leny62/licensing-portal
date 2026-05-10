import { AuthenticatedUser } from './user.interface';

export interface LoginRequest {
  email: string;
  password: string;
  deviceId?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface LoginSuccessResponse extends TokenPair {
  user: AuthenticatedUser;
}

export interface MfaRequiredResponse {
  mfaRequired: true;
  mfaToken: string;
  user: AuthenticatedUser;
}

export type LoginResponse = LoginSuccessResponse | MfaRequiredResponse;

export interface MfaChallengeRequest {
  mfaToken: string;
  code: string;
  deviceId?: string;
}

export interface RefreshRequest {
  refreshToken: string;
  deviceId?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}
