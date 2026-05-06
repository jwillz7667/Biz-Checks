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

const cuidLike = z.string().regex(/^[a-z0-9]{20,32}$/i, 'Invalid id');

export const OrganizationIdSchema = cuidLike.transform((v) => v as OrganizationId);
export const UserIdSchema = cuidLike.transform((v) => v as UserId);
export const BankAccountIdSchema = cuidLike.transform((v) => v as BankAccountId);
export const CheckTemplateIdSchema = cuidLike.transform((v) => v as CheckTemplateId);
export const CheckBatchIdSchema = cuidLike.transform((v) => v as CheckBatchId);
export const CheckIdSchema = cuidLike.transform((v) => v as CheckId);
export const CanvasObjectIdSchema = cuidLike.transform((v) => v as CanvasObjectId);
export const DataSourceIdSchema = cuidLike.transform((v) => v as DataSourceId);
export const SignatureImageIdSchema = cuidLike.transform((v) => v as SignatureImageId);
