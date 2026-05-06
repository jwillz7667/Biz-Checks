/**
 * Browser-side persistence for the auth session. We keep the access token in
 * memory only (mounted by the AuthProvider), and the refresh token + active
 * organization id in localStorage so the session survives a hard reload.
 *
 * Storing refresh tokens in localStorage is a pragmatic tradeoff for an
 * SPA-style designer; XSS risk is mitigated by strict CSP, no third-party
 * scripts, and short access-token TTLs. For a deployment that needs higher
 * assurance, swap this module for an httpOnly-cookie-backed flow.
 */

const REFRESH_KEY = 'bc.refresh';
const ORG_KEY = 'bc.org';

export interface PersistedSession {
  refreshToken: string;
  organizationId: string | null;
}

export function loadPersistedSession(): PersistedSession | null {
  if (typeof window === 'undefined') return null;
  const refreshToken = window.localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return null;
  return {
    refreshToken,
    organizationId: window.localStorage.getItem(ORG_KEY),
  };
}

export function persistSession(s: PersistedSession): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(REFRESH_KEY, s.refreshToken);
  if (s.organizationId) {
    window.localStorage.setItem(ORG_KEY, s.organizationId);
  } else {
    window.localStorage.removeItem(ORG_KEY);
  }
}

export function persistOrganization(orgId: string | null): void {
  if (typeof window === 'undefined') return;
  if (orgId) {
    window.localStorage.setItem(ORG_KEY, orgId);
  } else {
    window.localStorage.removeItem(ORG_KEY);
  }
}

export function clearPersistedSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(REFRESH_KEY);
  window.localStorage.removeItem(ORG_KEY);
}
