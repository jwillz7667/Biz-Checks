'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { ApiClient } from '../api/client';
import type { AuthSessionDTO, UserRole } from '../api/types';
import { env } from '../env';

import {
  clearPersistedSession,
  loadPersistedSession,
  persistOrganization,
  persistSession,
} from './auth-storage';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  organizations: Array<{ id: string; name: string; role: UserRole }>;
}

export interface AuthContextValue {
  /** True until the initial refresh attempt completes. */
  isLoading: boolean;
  user: AuthUser | null;
  organizationId: string | null;
  role: UserRole | null;
  api: ApiClient;
  setActiveOrganization: (organizationId: string) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    fullName: string;
    organizationName: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

/**
 * Owns the access token (memory only), the refresh token (localStorage), and
 * the active organization. Hands an ApiClient instance to consumers — the
 * client uses ref-based getters so it always sees the latest token without
 * needing to be re-instantiated per render.
 */
export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const router = useRouter();
  const [isLoading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  const accessTokenRef = useRef<string | null>(null);
  const refreshTokenRef = useRef<string | null>(null);
  const organizationIdRef = useRef<string | null>(null);

  const applySession = useCallback((session: AuthSessionDTO, defaultOrgId: string | null) => {
    accessTokenRef.current = session.accessToken;
    refreshTokenRef.current = session.refreshToken;
    persistSession({
      refreshToken: session.refreshToken,
      organizationId: defaultOrgId,
    });
    const nextUser: AuthUser = {
      id: session.user.id,
      email: session.user.email,
      fullName: session.user.fullName,
      organizations: session.user.organizations,
    };
    setUser(nextUser);
    const orgId = defaultOrgId ?? nextUser.organizations[0]?.id ?? null;
    organizationIdRef.current = orgId;
    setOrganizationId(orgId);
    if (orgId) persistOrganization(orgId);
  }, []);

  const clearSession = useCallback(() => {
    accessTokenRef.current = null;
    refreshTokenRef.current = null;
    organizationIdRef.current = null;
    clearPersistedSession();
    setUser(null);
    setOrganizationId(null);
  }, []);

  /**
   * Build the API client once. Its closures read from refs so token rotation
   * does not require recreating the client (which would invalidate every SWR
   * cache key downstream).
   */
  const api = useMemo<ApiClient>(() => {
    const client: ApiClient = new ApiClient({
      baseUrl: env.apiBaseUrl,
      getAuth: () => ({
        accessToken: accessTokenRef.current,
        organizationId: organizationIdRef.current,
      }),
      refresh: async (): Promise<string | null> => {
        const refreshToken = refreshTokenRef.current;
        if (!refreshToken) return null;
        try {
          const session: AuthSessionDTO = await client.request<AuthSessionDTO>(
            '/api/v1/auth/refresh',
            {
              method: 'POST',
              body: { refreshToken },
              skipAuth: true,
            },
          );
          applySession(session, organizationIdRef.current);
          return session.accessToken;
        } catch {
          clearSession();
          router.replace('/login');
          return null;
        }
      },
    });
    return client;
  }, [applySession, clearSession, router]);

  // Initial bootstrap: try to refresh from a persisted refresh token.
  useEffect(() => {
    const persisted = loadPersistedSession();
    if (!persisted) {
      setLoading(false);
      return;
    }
    refreshTokenRef.current = persisted.refreshToken;
    organizationIdRef.current = persisted.organizationId;
    let cancelled = false;
    void (async () => {
      try {
        const session = await api.request<AuthSessionDTO>('/api/v1/auth/refresh', {
          method: 'POST',
          body: { refreshToken: persisted.refreshToken },
          skipAuth: true,
        });
        if (!cancelled) applySession(session, persisted.organizationId);
      } catch {
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, applySession, clearSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const session = await api.request<AuthSessionDTO>('/api/v1/auth/login', {
        method: 'POST',
        body: { email, password },
        skipAuth: true,
      });
      applySession(session, null);
    },
    [api, applySession],
  );

  const register = useCallback(
    async (input: { email: string; password: string; fullName: string; organizationName: string }) => {
      const session = await api.request<AuthSessionDTO>('/api/v1/auth/register', {
        method: 'POST',
        body: input,
        skipAuth: true,
      });
      applySession(session, null);
    },
    [api, applySession],
  );

  const logout = useCallback(async () => {
    const refreshToken = refreshTokenRef.current;
    if (refreshToken) {
      try {
        await api.request<void>('/api/v1/auth/logout', {
          method: 'POST',
          body: { refreshToken },
          skipAuth: true,
        });
      } catch {
        // best-effort revocation; ignore
      }
    }
    clearSession();
    router.replace('/login');
  }, [api, clearSession, router]);

  const setActiveOrganization = useCallback((orgId: string) => {
    organizationIdRef.current = orgId;
    setOrganizationId(orgId);
    persistOrganization(orgId);
  }, []);

  const role = useMemo<UserRole | null>(() => {
    if (!user || !organizationId) return null;
    return user.organizations.find((o) => o.id === organizationId)?.role ?? null;
  }, [user, organizationId]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      user,
      organizationId,
      role,
      api,
      setActiveOrganization,
      login,
      register,
      logout,
    }),
    [isLoading, user, organizationId, role, api, setActiveOrganization, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
