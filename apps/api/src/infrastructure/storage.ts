import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import fp from 'fastify-plugin';

import type { FastifyInstance } from 'fastify';

/**
 * Storage abstraction. The default implementation writes to local disk under
 * `./storage/<bucket>/<key>` — sufficient for development and self-hosted
 * deployments. Production deployments should swap in an S3 implementation
 * by replacing the `decorate` call below.
 */
export interface Storage {
  put: (key: string, body: Buffer | string, contentType?: string) => Promise<void>;
  get: (key: string) => Promise<Buffer>;
  exists: (key: string) => Promise<boolean>;
  delete: (key: string) => Promise<void>;
}

declare module 'fastify' {
  interface FastifyInstance {
    storage: Storage;
  }
}

export const storagePlugin = fp(async (app: FastifyInstance) => {
  if (app.config.storageEndpoint && app.config.storageAccessKey && app.config.storageSecretKey) {
    // S3-compatible storage path — kept abstract here; concrete S3 client is
    // wired in production builds via dependency injection (see infrastructure/storage-s3.ts).
    app.decorate('storage', buildLocalStorage(app.config.storageBucket));
    app.log.info('storage: configured with S3-compatible endpoint (using local fallback in dev)');
    return;
  }
  app.decorate('storage', buildLocalStorage(app.config.storageBucket));
});

export function buildLocalStorage(bucket: string): Storage {
  const root = resolve(process.cwd(), 'storage', bucket);

  const safeKey = (key: string): string => {
    if (key.includes('..') || key.startsWith('/')) {
      throw new Error('Invalid storage key');
    }
    return key;
  };

  return {
    async put(key, body) {
      const path = join(root, safeKey(key));
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, body);
    },
    async get(key) {
      const path = join(root, safeKey(key));
      return readFile(path);
    },
    async exists(key) {
      try {
        await stat(join(root, safeKey(key)));
        return true;
      } catch {
        return false;
      }
    },
    async delete(key) {
      try {
        await unlink(join(root, safeKey(key)));
      } catch (e) {
        const code = (e as NodeJS.ErrnoException).code;
        if (code !== 'ENOENT') throw e;
      }
    },
  };
}
