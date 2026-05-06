import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto';

import fp from 'fastify-plugin';

import type { FastifyInstance } from 'fastify';

/**
 * Field-level encryption using AES-256-GCM with a 96-bit random IV.
 *
 * Encrypted payload format (base64-url encoded):
 *   <version_byte> <iv:12> <ciphertext> <tag:16>
 *
 * The version byte enables seamless key rotation: re-encrypt on the
 * next write while continuing to decrypt prior versions in the
 * meantime. ENCRYPTION_KEY_VERSION must increment whenever the
 * underlying key bytes change.
 */
export interface Encryptor {
  encrypt: (plaintext: string) => string;
  decrypt: (ciphertext: string) => string;
  /** Compare plaintext vs ciphertext in constant time without decrypting twice. */
  matches: (plaintext: string, ciphertext: string) => boolean;
  keyVersion: number;
}

declare module 'fastify' {
  interface FastifyInstance {
    encryptor: Encryptor;
  }
}

export const encryptionPlugin = fp(async (app: FastifyInstance) => {
  const key = Buffer.from(app.config.encryptionKey, 'base64');
  if (key.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must decode to 32 bytes (got ${key.length}). Generate with: openssl rand -base64 32`,
    );
  }
  app.decorate('encryptor', buildEncryptor(key, app.config.encryptionKeyVersion));
});

export function buildEncryptor(key: Buffer, version: number): Encryptor {
  if (key.length !== 32) throw new Error('Encryption key must be exactly 32 bytes');

  return {
    keyVersion: version,
    encrypt(plaintext: string): string {
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
      const tag = cipher.getAuthTag();
      const versionByte = Buffer.from([version & 0xff]);
      return Buffer.concat([versionByte, iv, enc, tag]).toString('base64url');
    },
    decrypt(ciphertext: string): string {
      const buf = Buffer.from(ciphertext, 'base64url');
      if (buf.length < 1 + 12 + 16) {
        throw new Error('Ciphertext too short');
      }
      const iv = buf.subarray(1, 13);
      const tag = buf.subarray(buf.length - 16);
      const data = buf.subarray(13, buf.length - 16);
      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      const dec = Buffer.concat([decipher.update(data), decipher.final()]);
      return dec.toString('utf8');
    },
    matches(plaintext: string, ciphertext: string): boolean {
      try {
        const decrypted = this.decrypt(ciphertext);
        const a = Buffer.from(decrypted);
        const b = Buffer.from(plaintext);
        return a.length === b.length && timingSafeEqual(a, b);
      } catch {
        return false;
      }
    },
  };
}
