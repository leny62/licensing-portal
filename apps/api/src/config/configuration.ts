import { z } from 'zod';

const booleanFromEnv = z.preprocess((value) => {
  if (value === undefined || value === '') {
    return undefined;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
      return true;
    }

    if (['0', 'false', 'no', 'off'].includes(normalized)) {
      return false;
    }
  }

  return value;
}, z.boolean());

const base64Secret = z
  .string()
  .min(1)
  .refine((value) => {
    try {
      return (
        Buffer.from(value, 'base64').toString('base64').replace(/=+$/, '') ===
        value.replace(/=+$/, '')
      );
    } catch {
      return false;
    }
  }, 'must be valid base64');

export const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  DATABASE_URL: z.string().min(1),
  DATABASE_URL_MIGRATION: z.string().min(1).optional(),

  CORS_ORIGINS: z.string().min(1).default('http://localhost:4200'),
  SWAGGER_ENABLED: booleanFromEnv.default(true),
  RATE_LIMIT_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_LIMIT: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_LOGIN_PER_MIN: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_UPLOAD_PER_MIN: z.coerce.number().int().positive().default(20),

  JWT_ISSUER: z.string().min(1).default('licensing-portal'),
  JWT_AUDIENCE: z.string().min(1).default('licensing-portal-api'),
  JWT_KID: z.string().min(1).default('key-1'),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 60 * 24 * 30),
  JWT_PRIVATE_KEY_BASE64: base64Secret,
  JWT_PUBLIC_KEY_BASE64: base64Secret,

  ARGON2_MEMORY_KIB: z.coerce.number().int().positive().default(65536),
  ARGON2_TIME_COST: z.coerce.number().int().positive().default(3),
  ARGON2_PARALLELISM: z.coerce.number().int().positive().default(4),

  MFA_ISSUER: z.string().min(1).default('National Bank of Rwanda Licensing Portal'),
  DOCUMENT_STORAGE_ROOT: z.string().min(1).default('./var/documents'),
  DOCUMENT_MAX_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(5 * 1024 * 1024),
  DOCUMENT_KEK_BASE64: base64Secret,

  SNAPSHOT_DESTINATION: z.string().min(1).default('./var/snapshots'),

  SMTP_HOST: z.string().min(1).default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASSWORD: z.string().optional().default(''),
  MAIL_FROM: z.string().email().default('no-reply@licensing.local'),
});

export type Environment = z.infer<typeof environmentSchema>;

const formatConfigErrors = (error: z.ZodError): string => {
  return error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
};

export const configuration = () => {
  const parsed = environmentSchema.safeParse(process.env);

  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${formatConfigErrors(parsed.error)}`);
  }

  const env = parsed.data;

  return {
    app: {
      env: env.NODE_ENV,
      host: env.HOST,
      port: env.PORT,
      logLevel: env.LOG_LEVEL,
    },
    database: {
      url: env.DATABASE_URL,
      migrationUrl: env.DATABASE_URL_MIGRATION ?? env.DATABASE_URL,
    },
    security: {
      corsOrigins: env.CORS_ORIGINS,
      swaggerEnabled: env.SWAGGER_ENABLED,
      rateLimitTtlSeconds: env.RATE_LIMIT_TTL_SECONDS,
      rateLimitLimit: env.RATE_LIMIT_LIMIT,
      loginRateLimitPerMin: env.RATE_LIMIT_LOGIN_PER_MIN,
      uploadRateLimitPerMin: env.RATE_LIMIT_UPLOAD_PER_MIN,
    },
    jwt: {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      kid: env.JWT_KID,
      accessTtlSeconds: env.JWT_ACCESS_TTL_SECONDS,
      refreshTtlSeconds: env.JWT_REFRESH_TTL_SECONDS,
      privateKey: Buffer.from(env.JWT_PRIVATE_KEY_BASE64, 'base64').toString('utf8'),
      publicKey: Buffer.from(env.JWT_PUBLIC_KEY_BASE64, 'base64').toString('utf8'),
    },
    argon2: {
      memoryCost: env.ARGON2_MEMORY_KIB,
      timeCost: env.ARGON2_TIME_COST,
      parallelism: env.ARGON2_PARALLELISM,
    },
    mfa: {
      issuer: env.MFA_ISSUER,
    },
    documents: {
      storageRoot: env.DOCUMENT_STORAGE_ROOT,
      maxBytes: env.DOCUMENT_MAX_BYTES,
      keyEncryptionKey: Buffer.from(env.DOCUMENT_KEK_BASE64, 'base64'),
    },
    audit: {
      snapshotDestination: env.SNAPSHOT_DESTINATION,
    },
    mail: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      user: env.SMTP_USER,
      password: env.SMTP_PASSWORD,
      from: env.MAIL_FROM,
    },
  };
};

export type AppConfiguration = ReturnType<typeof configuration>;
