import { z } from 'zod';

/**
 * Phantom-string brand. We use a regular string key (`__brand`) instead of
 * a `unique symbol` because TypeScript cannot emit declarations that
 * reference an unexported `unique symbol` from a module — see TS4023.
 * The key is non-enumerable at runtime; the value never exists on a
 * real string, so brand collisions are impossible at runtime.
 */
type Brand<T, B extends string> = T & { readonly __brand: B };

export type OrganizationId = Brand<string, 'OrganizationId'>;
export type UserId = Brand<string, 'UserId'>;
export type BankAccountId = Brand<string, 'BankAccountId'>;
export type CheckTemplateId = Brand<string, 'CheckTemplateId'>;
export type CheckBatchId = Brand<string, 'CheckBatchId'>;
export type CheckId = Brand<string, 'CheckId'>;
export type CanvasObjectId = Brand<string, 'CanvasObjectId'>;
export type DataSourceId = Brand<string, 'DataSourceId'>;
export type SignatureImageId = Brand<string, 'SignatureImageId'>;

/** Single source of truth for the cuid-like id shape we accept on the wire. */
export const ID_REGEX = /^[a-z0-9]{20,32}$/i;
const cuidLike = z.string().regex(ID_REGEX, 'Invalid id');

export const OrganizationIdSchema = cuidLike.transform((v) => v as OrganizationId);
export const UserIdSchema = cuidLike.transform((v) => v as UserId);
export const BankAccountIdSchema = cuidLike.transform((v) => v as BankAccountId);
export const CheckTemplateIdSchema = cuidLike.transform((v) => v as CheckTemplateId);
export const CheckBatchIdSchema = cuidLike.transform((v) => v as CheckBatchId);
export const CheckIdSchema = cuidLike.transform((v) => v as CheckId);
export const CanvasObjectIdSchema = cuidLike.transform((v) => v as CanvasObjectId);
export const DataSourceIdSchema = cuidLike.transform((v) => v as DataSourceId);
export const SignatureImageIdSchema = cuidLike.transform((v) => v as SignatureImageId);

/**
 * Generate a 24-char alphanumeric id that satisfies `ID_REGEX`. Browser- and
 * Node-safe. Use for any client-generated identifier that must round-trip
 * through the API contract (canvas objects, signature placeholders, etc.).
 */
// `globalThis.crypto` isn't declared by the package's lib (`ES2022`-only), so
// we narrow it with a one-shot cast inside this helper rather than pulling in
// DOM/Node typings package-wide.
function getCryptoRandomUUID(): (() => string) | null {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  return typeof g.crypto?.randomUUID === 'function' ? g.crypto.randomUUID.bind(g.crypto) : null;
}

export function randomCuidLikeId(): string {
  const uuid = getCryptoRandomUUID();
  const raw = uuid
    ? uuid().replace(/-/g, '')
    : (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).replace(
        /[^a-z0-9]/gi,
        '',
      );
  return raw.slice(0, 24).padEnd(20, '0');
}

/** Brand-tagged variant for use inside @biz-checks packages. */
export function randomCanvasObjectId(): CanvasObjectId {
  // Phantom brand types need a double-cast through `unknown` — `string` is not
  // structurally assignable to `string & { __brand }`.
  return randomCuidLikeId() as unknown as CanvasObjectId;
}
