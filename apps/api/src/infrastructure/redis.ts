import fp from 'fastify-plugin';
import { Redis } from 'ioredis';

import type { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
  }
}

export const redisPlugin = fp(async (app: FastifyInstance) => {
  const redis = new Redis(app.config.redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  });

  redis.on('error', (err: Error) => {
    app.log.error({ err }, 'redis error');
  });

  app.decorate('redis', redis);
  app.addHook('onClose', async () => {
    redis.disconnect();
  });
});
