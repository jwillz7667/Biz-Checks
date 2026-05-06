/**
 * Public env vars read at module load. NEXT_PUBLIC_* are inlined by Next at
 * build time; we throw early if any required value is missing so misconfigured
 * builds fail in CI rather than at runtime in the browser.
 */
function required(name: string, value: string | undefined): string {
  if (!value || value.length === 0) {
    throw new Error(`Missing required env var ${name}`);
  }
  return value;
}

export const env = {
  apiBaseUrl: required(
    'NEXT_PUBLIC_API_URL',
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  ),
} as const;
