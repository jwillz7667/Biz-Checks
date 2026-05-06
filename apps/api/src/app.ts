import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import underPressure from '@fastify/under-pressure';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';

import { authRoutes } from './features/auth/routes.js';
import { bankAccountRoutes } from './features/bank-accounts/routes.js';
import { checkBatchRoutes } from './features/check-batches/routes.js';
import { checkRoutes } from './features/checks/routes.js';
import { dataSourceRoutes } from './features/data-sources/routes.js';
import { templateRoutes } from './features/templates/routes.js';
import { encryptionPlugin } from './infrastructure/encryption.js';
import { prismaPlugin } from './infrastructure/prisma.js';
import { redisPlugin } from './infrastructure/redis.js';
import { storagePlugin } from './infrastructure/storage.js';
import { errorHandler } from './shared/error-handler.js';
import { auditPlugin } from './shared/middleware/audit.js';
import { authPlugin } from './shared/middleware/auth.js';
import { tenantPlugin } from './shared/middleware/tenant.js';

import type { AppConfig } from './shared/config.js';

export async function buildApp(config: AppConfig): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      transport:
        config.nodeEnv === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.body.password',
          'req.body.accountNumber',
          'req.body.routingNumber',
        ],
        remove: false,
      },
    },
    trustProxy: config.trustProxy,
    bodyLimit: 16 * 1024 * 1024,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
    disableRequestLogging: false,
    ajv: { customOptions: { removeAdditional: false, useDefaults: false } },
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Decorate config so route plugins can read it.
  app.decorate('config', config);

  // Security & operational plugins
  await app.register(sensible);
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        'default-src': ["'self'"],
        'img-src': ["'self'", 'data:', 'blob:'],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'frame-ancestors': ["'none'"],
        'object-src': ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });

  await app.register(cors, {
    origin: config.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'content-type',
      'authorization',
      'idempotency-key',
      'x-request-id',
      'x-organization-id',
    ],
  });

  await app.register(rateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.timeWindow,
    cache: 10_000,
  });

  await app.register(jwt, {
    secret: config.jwtSecret,
    sign: { expiresIn: config.jwtAccessTtlSeconds },
    verify: { extractToken: (request) => extractBearer(request.headers.authorization) },
  });

  // No `exposeStatusRoute` — under-pressure registers its status route with a
  // JSON Schema response, which collides with our global Zod serializer
  // compiler and 500s. Health endpoints below cover liveness/readiness.
  await app.register(underPressure, {
    maxEventLoopDelay: 1500,
    maxHeapUsedBytes: 1024 * 1024 * 1024,
    healthCheck: async () => true,
  });

  // Infrastructure plugins
  await app.register(prismaPlugin);
  await app.register(redisPlugin);
  await app.register(encryptionPlugin);
  await app.register(storagePlugin);

  // Cross-cutting middleware
  await app.register(authPlugin);
  await app.register(tenantPlugin);
  await app.register(auditPlugin);

  app.setErrorHandler(errorHandler);

  // Health — no response schema, so the global Zod serializer is bypassed
  // and these routes serialize via the default JSON.stringify path.
  app.get('/health', () => ({ status: 'ok', service: 'biz-checks-api' }));
  app.get('/health/live', () => ({ status: 'ok' }));
  app.get('/health/ready', () => ({ status: 'ok' }));

  // Feature routes — feature-first, each owns its prefix and dependencies.
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(bankAccountRoutes, { prefix: '/api/v1/bank-accounts' });
  await app.register(templateRoutes, { prefix: '/api/v1/templates' });
  await app.register(checkRoutes, { prefix: '/api/v1/checks' });
  await app.register(checkBatchRoutes, { prefix: '/api/v1/check-batches' });
  await app.register(dataSourceRoutes, { prefix: '/api/v1/data-sources' });

  return app;
}

function extractBearer(authHeader: string | undefined): string | undefined {
  if (!authHeader) return undefined;
  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return undefined;
  return token;
}

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig;
  }
}
