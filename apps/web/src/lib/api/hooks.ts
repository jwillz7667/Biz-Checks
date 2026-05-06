'use client';

import useSWR, { type SWRConfiguration, type SWRResponse } from 'swr';
import useSWRMutation, { type SWRMutationResponse } from 'swr/mutation';

import { useAuth } from '../auth/auth-provider';

import { ApiError, type RequestOptions } from './client';

/**
 * Build a stable SWR cache key from path + auth + query. Including the
 * organizationId is critical: tenant-scoped data must invalidate on org switch.
 */
export type ApiKey = readonly [path: string, organizationId: string | null, qs: string];

function makeKey(
  path: string,
  organizationId: string | null,
  query?: Record<string, unknown>,
): ApiKey | null {
  if (!path) return null;
  const qs = query ? JSON.stringify(query) : '';
  return [path, organizationId, qs] as const;
}

export function useApi<T>(
  path: string | null,
  query?: Record<string, string | number | boolean | undefined | null>,
  config?: SWRConfiguration<T, ApiError>,
): SWRResponse<T, ApiError> {
  const { api, organizationId } = useAuth();
  const key = path ? makeKey(path, organizationId, query) : null;
  return useSWR<T, ApiError, ApiKey | null>(
    key,
    async ([p, , qs]) => {
      const parsed = qs ? (JSON.parse(qs) as RequestOptions['query']) : undefined;
      return api.request<T>(p, parsed ? { query: parsed } : {});
    },
    config,
  );
}

export function useApiMutation<TArg, TResult>(
  buildPath: (arg: TArg) => string,
  options: {
    method: NonNullable<RequestOptions['method']>;
    body?: (arg: TArg) => unknown;
    idempotencyKey?: (arg: TArg) => string;
    asBlob?: boolean;
  },
): SWRMutationResponse<TResult, ApiError, string, TArg> {
  const { api } = useAuth();
  return useSWRMutation<TResult, ApiError, string, TArg>(
    'mutation',
    async (_key, { arg }) => {
      const reqOptions: RequestOptions = {
        method: options.method,
        ...(options.body ? { body: options.body(arg) } : {}),
        ...(options.idempotencyKey ? { idempotencyKey: options.idempotencyKey(arg) } : {}),
        ...(options.asBlob ? { asBlob: true } : {}),
      };
      return api.request<TResult>(buildPath(arg), reqOptions);
    },
  );
}
