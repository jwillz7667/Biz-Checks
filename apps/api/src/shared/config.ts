import { z } from 'zod';

const ConfigSchema = z.object({
  nodeEnv: z.enum(['development', 'test', 'production']).default('development'),
  port: z.coerce.number().int().positive().default(4000),
  host: z.string().default('0.0.0.0'),
  logLevel: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  trustProxy: z.coerce.boolean().default(true),

  databaseUrl: z.string().url(),

  redisUrl: z.string().url(),

  jwtSecret: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  jwtAccessTtlSeconds: z.coerce.number().int().positive().default(900),
  jwtRefreshTtlSeconds: z.coerce.number().int().positive().default(2_592_000),

  encryptionKey: z
    .string()
    .min(44, 'ENCRYPTION_KEY must be 32 bytes encoded as base64 (44 chars)'),
  encryptionKeyVersion: z.coerce.number().int().positive().default(1),

  storageBucket: z.string().default('biz-checks-signatures'),
  storageRegion: z.string().default('us-east-1'),
  storageEndpoint: z.string().optional(),
  storageAccessKey: z.string().optional(),
  storageSecretKey: z.string().optional(),

  corsOrigins: z
    .string()
    .default('http://localhost:3000')
    .transform((s) =>
      s
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ),

  rateLimit: z
    .object({
      max: z.coerce.number().int().positive().default(120),
      timeWindow: z.string().default('1 minute'),
    })
    .default({ max: 120, timeWindow: '1 minute' }),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = ConfigSchema.safeParse({
    nodeEnv: env.NODE_ENV,
    // PaaS providers (Railway, Render, Fly, Heroku) inject PORT; allow API_PORT
    // as an explicit override for local multi-service setups.
    port: env.API_PORT ?? env.PORT,
    host: env.API_HOST,
    logLevel: env.LOG_LEVEL,
    trustProxy: env.TRUST_PROXY ?? 'true',

    databaseUrl: env.DATABASE_URL,

    redisUrl: env.REDIS_URL,

    jwtSecret: env.JWT_SECRET,
    jwtAccessTtlSeconds: env.JWT_ACCESS_TTL_SECONDS,
    jwtRefreshTtlSeconds: env.JWT_REFRESH_TTL_SECONDS,

    encryptionKey: env.ENCRYPTION_KEY,
    encryptionKeyVersion: env.ENCRYPTION_KEY_VERSION,

    storageBucket: env.STORAGE_BUCKET,
    storageRegion: env.STORAGE_REGION,
    storageEndpoint: env.STORAGE_ENDPOINT,
    storageAccessKey: env.STORAGE_ACCESS_KEY,
    storageSecretKey: env.STORAGE_SECRET_KEY,

    corsOrigins: env.CORS_ORIGINS,
  });

  if (!parsed.success) {
    const messages = parsed.error.issues
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid configuration:\n${messages}`);
  }
  return parsed.data;
}
