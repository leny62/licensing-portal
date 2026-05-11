import { configuration } from '../../src/config/configuration';

const validEnv: NodeJS.ProcessEnv = {
  DATABASE_URL: 'postgresql://licensing:licensing@localhost:5432/licensing_portal?schema=public',
  JWT_PRIVATE_KEY_BASE64: Buffer.from('private-key').toString('base64'),
  JWT_PUBLIC_KEY_BASE64: Buffer.from('public-key').toString('base64'),
  DOCUMENT_KEK_BASE64: Buffer.alloc(32, 1).toString('base64'),
};

describe('configuration', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it('parses a valid environment into nested config', () => {
    process.env = { ...validEnv };

    const config = configuration();

    expect(config.app.port).toBe(3000);
    expect(config.database.url).toBe(validEnv.DATABASE_URL);
    expect(config.jwt.privateKey).toBe('private-key');
    expect(config.jwt.kid).toBe('key-1');
    expect(config.jwt.accessTtlSeconds).toBe(900);
    expect(config.jwt.refreshTtlSeconds).toBe(60 * 60 * 24 * 30);
    expect(config.argon2.memoryCost).toBe(65536);
    expect(config.argon2.timeCost).toBe(3);
    expect(config.argon2.parallelism).toBe(4);
    expect(config.documents.storageRoot).toBe('./var/documents');
    expect(config.documents.maxBytes).toBe(5 * 1024 * 1024);
    expect(config.documents.keyEncryptionKey.byteLength).toBe(32);
    expect(config.audit.snapshotDestination).toBe('./var/snapshots');
    expect(config.security.corsOrigins).toBe('http://localhost:4200');
  });

  it('uses DATABASE_URL as migration URL when DATABASE_URL_MIGRATION is absent', () => {
    process.env = { ...validEnv };

    const config = configuration();

    expect(config.database.migrationUrl).toBe(validEnv.DATABASE_URL);
  });

  it('uses DATABASE_URL_MIGRATION when provided', () => {
    process.env = {
      ...validEnv,
      DATABASE_URL_MIGRATION: 'postgresql://migrate:migrate@localhost:5432/licensing_portal',
    };

    const config = configuration();

    expect(config.database.migrationUrl).toBe(
      'postgresql://migrate:migrate@localhost:5432/licensing_portal',
    );
  });

  it('fails fast when a required secret is missing', () => {
    process.env = { ...validEnv };
    delete process.env.JWT_PRIVATE_KEY_BASE64;

    expect(() => configuration()).toThrow(/Invalid environment configuration/);
  });

  it('fails fast when DATABASE_URL is missing', () => {
    process.env = { ...validEnv };
    delete process.env.DATABASE_URL;

    expect(() => configuration()).toThrow(/Invalid environment configuration/);
  });

  it('fails fast when the document key encryption key is not 32 bytes', () => {
    process.env = { ...validEnv, DOCUMENT_KEK_BASE64: Buffer.alloc(16, 1).toString('base64') };

    expect(() => configuration()).toThrow(/DOCUMENT_KEK_BASE64/);
  });

  it('rejects wildcard CORS in production', () => {
    process.env = {
      ...validEnv,
      NODE_ENV: 'production',
      CORS_ORIGINS: '*',
      METRICS_BEARER_TOKEN: 'm'.repeat(32),
    };

    expect(() => configuration()).toThrow(/CORS_ORIGINS/);
  });

  it('requires a metrics bearer token in production', () => {
    process.env = { ...validEnv, NODE_ENV: 'production' };

    expect(() => configuration()).toThrow(/METRICS_BEARER_TOKEN/);
  });

  it('applies custom argon2 tuning from environment', () => {
    process.env = {
      ...validEnv,
      ARGON2_MEMORY_KIB: '32768',
      ARGON2_TIME_COST: '5',
      ARGON2_PARALLELISM: '2',
    };

    const config = configuration();

    expect(config.argon2.memoryCost).toBe(32768);
    expect(config.argon2.timeCost).toBe(5);
    expect(config.argon2.parallelism).toBe(2);
  });
});
