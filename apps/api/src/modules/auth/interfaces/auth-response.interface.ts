import { AuthenticatedUser } from './authenticated-user.interface';

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
