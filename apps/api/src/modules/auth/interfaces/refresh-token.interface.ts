import { RefreshToken } from '@prisma/client';

export interface IssuedRefreshToken {
  plaintext: string;
  row: RefreshToken;
}
