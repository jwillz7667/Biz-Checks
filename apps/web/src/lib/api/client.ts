import { env } from '../env';

export interface ApiErrorBody {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: Record<string, unknown>;
    readonly issues?: readonly { path: string; code: string; message: string }[];
  };
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly body: ApiErrorBody | null;

  constructor(status: number, code: string, message: string, body: ApiErrorBody | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

export interface AuthSnapshot {
  readonly accessToken: string | null;
  readonly organizationId: string | null;
}

export type AuthResolver = () => AuthSnapshot;
export type RefreshFn = () => Promise<string | null>;

export interface ApiClientOptions {
  readonly baseUrl?: string;
  readonly getAuth: AuthResolver;
  readonly refresh: RefreshFn;
}

export interface RequestOptions {
  readonly method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  readonly query?: Record<string, string | number | boolean | undefined | null>;
  readonly body?: unknown;
  readonly headers?: Record<string, string>;
  /** When true, do not attach the Authorization header (login/register/refresh). */
  readonly skipAuth?: boolean;
  readonly idempotencyKey?: string;
  readonly signal?: AbortSignal;
  /** When set, response is returned as a Blob instead of JSON. */
  readonly asBlob?: boolean;
}

/**
 * Lightweight fetch wrapper that:
 *  - injects bearer token + active organization header,
 *  - retries once on 401 by calling the supplied refresh function,
 *  - normalizes the API's error envelope into ApiError,
 *  - serializes JSON bodies and parses JSON responses.
 *
 * Designed to live behind the AuthProvider; do not instantiate elsewhere.
 */
export class ApiClient {
  private readonly baseUrl: string;
  private readonly getAuth: AuthResolver;
  private readonly refresh: RefreshFn;
  /** In-flight refresh promise so concurrent 401s share one refresh call. */
  private refreshing: Promise<string | null> | null = null;

  constructor(opts: ApiClientOptions) {
    this.baseUrl = (opts.baseUrl ?? env.apiBaseUrl).replace(/\/+$/, '');
    this.getAuth = opts.getAuth;
    this.refresh = opts.refresh;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.send<T>(path, options, false);
  }

  private async send<T>(
    path: string,
    options: RequestOptions,
    isRetry: boolean,
  ): Promise<T> {
    const url = this.buildUrl(path, options.query);
    const headers = new Headers(options.headers ?? {});
    headers.set('accept', 'application/json');

    if (options.body !== undefined && !(options.body instanceof FormData)) {
      headers.set('content-type', 'application/json');
    }
    if (options.idempotencyKey) {
      headers.set('idempotency-key', options.idempotencyKey);
    }

    const auth = this.getAuth();
    if (!options.skipAuth && auth.accessToken) {
      headers.set('authorization', `Bearer ${auth.accessToken}`);
    }
    if (auth.organizationId) {
      headers.set('x-organization-id', auth.organizationId);
    }

    const init: RequestInit = {
      method: options.method ?? 'GET',
      headers,
      signal: options.signal,
    };
    if (options.body !== undefined) {
      init.body =
        options.body instanceof FormData ? options.body : JSON.stringify(options.body);
    }

    const response = await fetch(url, init);

    if (response.status === 401 && !isRetry && !options.skipAuth) {
      const refreshed = await this.refreshOnce();
      if (refreshed) return this.send<T>(path, options, true);
    }

    if (response.status === 204) return undefined as T;

    if (options.asBlob) {
      if (!response.ok) {
        throw await this.toError(response);
      }
      return (await response.blob()) as T;
    }

    const text = await response.text();
    const json: unknown = text.length === 0 ? null : safeJson(text);

    if (!response.ok) {
      throw this.toErrorFromJson(response.status, json);
    }
    return json as T;
  }

  private async refreshOnce(): Promise<string | null> {
    this.refreshing ??= this.refresh().finally(() => {
      this.refreshing = null;
    });
    return this.refreshing;
  }

  private buildUrl(path: string, query?: RequestOptions['query']): string {
    const url = new URL(path.startsWith('/') ? path : `/${path}`, `${this.baseUrl}/`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null) continue;
        url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }

  private async toError(response: Response): Promise<ApiError> {
    const text = await response.text();
    return this.toErrorFromJson(response.status, safeJson(text));
  }

  private toErrorFromJson(status: number, json: unknown): ApiError {
    if (isApiErrorBody(json)) {
      return new ApiError(status, json.error.code, json.error.message, json);
    }
    return new ApiError(status, 'NETWORK', `Request failed with ${status}`, null);
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function isApiErrorBody(v: unknown): v is ApiErrorBody {
  if (typeof v !== 'object' || v === null) return false;
  const obj = v as Record<string, unknown>;
  if (typeof obj.error !== 'object' || obj.error === null) return false;
  const e = obj.error as Record<string, unknown>;
  return typeof e.code === 'string' && typeof e.message === 'string';
}
