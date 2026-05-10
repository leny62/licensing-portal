import { generateKeyPairSync } from 'node:crypto';

import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import jwt from 'jsonwebtoken';

import { KeyProvider } from '../../src/infra/keys/interfaces/key-provider.interface';
import { TokenService } from '../../src/modules/auth/tokens/token.service';

const generateKeys = () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });

  return {
    privateKey: privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
    publicKey: publicKey.export({ format: 'pem', type: 'spki' }).toString(),
  };
};

describe('TokenService', () => {
  it('signs RS256 access tokens with kid and verifies them', () => {
    const keys = generateKeys();
    const keyProvider: KeyProvider = {
      getPrivateKey: () => keys.privateKey,
      getPublicKey: () => keys.publicKey,
      getKid: () => 'kid-1',
    };
    const configService = {
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, string | number> = {
          'jwt.audience': 'licensing-portal-api',
          'jwt.issuer': 'licensing-portal',
          'jwt.accessTtlSeconds': 900,
        };

        return values[key];
      }),
    } as unknown as ConfigService;
    const service = new TokenService(configService, keyProvider);

    const token = service.signAccessToken({
      id: 'user-1',
      email: 'user@example.com',
      role: UserRole.APPLICANT,
    });
    const decoded = jwt.decode(token, { complete: true });
    const payload = service.verify(token);

    expect(decoded?.header).toMatchObject({ alg: 'RS256', kid: 'kid-1' });
    expect(payload).toMatchObject({
      sub: 'user-1',
      email: 'user@example.com',
      role: UserRole.APPLICANT,
      type: 'access',
    });
  });

  it('rejects a token signed with an unknown kid', () => {
    const keys = generateKeys();
    const configService = {
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, string | number> = {
          'jwt.audience': 'licensing-portal-api',
          'jwt.issuer': 'licensing-portal',
          'jwt.accessTtlSeconds': 900,
        };

        return values[key];
      }),
    } as unknown as ConfigService;
    const service = new TokenService(configService, {
      getPrivateKey: () => keys.privateKey,
      getPublicKey: () => keys.publicKey,
      getKid: () => 'kid-1',
    });
    const token = service.signAccessToken({
      id: 'user-1',
      email: 'user@example.com',
      role: UserRole.APPLICANT,
    });
    const verifier = new TokenService(configService, {
      getPrivateKey: () => keys.privateKey,
      getPublicKey: () => keys.publicKey,
      getKid: () => 'kid-2',
    });

    expect(() => verifier.verify(token)).toThrow('Unknown token key id.');
  });
});
