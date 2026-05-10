import { ConfigService } from '@nestjs/config';

import { PasswordHasher } from '../../src/modules/auth/password-hasher';

const configService = {
  getOrThrow: jest.fn((key: string) => {
    const values: Record<string, number> = {
      'argon2.memoryCost': 8192,
      'argon2.timeCost': 2,
      'argon2.parallelism': 1,
    };

    return values[key];
  }),
} as unknown as ConfigService;

describe('PasswordHasher', () => {
  it('hashes and verifies passwords with Argon2id', async () => {
    const hasher = new PasswordHasher(configService);
    const hash = await hasher.hash('correct horse battery staple');

    expect(hash).toContain('$argon2id$');
    await expect(hasher.verify(hash, 'correct horse battery staple')).resolves.toBe(true);
    await expect(hasher.verify(hash, 'wrong password')).resolves.toBe(false);
  });

  it('detects hashes that need parameter upgrades', async () => {
    const weakConfig = {
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, number> = {
          'argon2.memoryCost': 4096,
          'argon2.timeCost': 2,
          'argon2.parallelism': 1,
        };

        return values[key];
      }),
    } as unknown as ConfigService;
    const weakHash = await new PasswordHasher(weakConfig).hash('upgrade me');
    const strongerHasher = new PasswordHasher(configService);

    expect(strongerHasher.needsRehash(weakHash)).toBe(true);
  });
});
