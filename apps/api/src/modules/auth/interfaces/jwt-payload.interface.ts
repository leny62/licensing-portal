import { UserRole } from '@prisma/client';

export type AuthTokenType = 'access' | 'mfa';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  type: AuthTokenType;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}
