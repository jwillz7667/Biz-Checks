# Security Policy

Biz Checks handles bank-account data, MICR routing/account numbers, and printable
negotiable instruments. We treat security reports with priority and respond to
verified vulnerabilities promptly.

## Supported versions

Only the `main` branch and the most recent tagged release receive security fixes.
Older tags will not be patched — pin to the latest minor.

| Version           | Supported          |
| ----------------- | ------------------ |
| `main` (HEAD)     | :white_check_mark: |
| latest tag        | :white_check_mark: |
| previous releases | :x:                |

## Reporting a vulnerability

**Do not open a public GitHub issue for security reports.**

Email `jwillz7667@gmail.com` with:

- A clear description of the issue and the affected component
  (`apps/api`, `apps/web`, or a `packages/*` package).
- Reproduction steps or a proof-of-concept.
- Impact assessment (data exposure, integrity, availability) and any
  CVSS v3.1 score you have computed.
- Your name / handle for credit (optional).

You will receive an acknowledgement within **2 business days** and a triage
disposition within **5 business days**. We aim to ship fixes within:

- **Critical / High**: 7 days
- **Medium**: 30 days
- **Low**: next release

## Coordinated disclosure

We follow [coordinated disclosure](https://en.wikipedia.org/wiki/Coordinated_vulnerability_disclosure):
we will not publicly discuss a vulnerability until a fix is available. We ask
the same of reporters. Embargo lifts on the day the fix ships, and we credit
the reporter in the release notes unless they prefer to remain anonymous.

## Out of scope

The following are explicitly **out of scope** for this repository's vulnerability program:

- Reports requiring physical access to a logged-in operator's machine.
- Self-XSS that requires the victim to paste attacker-controlled content into
  their own browser console.
- Missing security headers on routes that intentionally do not return HTML
  (e.g., the JSON-only API endpoints — CSP applies to the web app only).
- Volumetric / denial-of-service that depends on bypassing the documented
  rate-limit budget.
- Issues in third-party services (Railway, Vercel, Postgres, Redis) — please
  report those upstream.

## Security model assumptions

When designing checks or running this software, assume:

- **TLS terminates at the load balancer.** All in-flight traffic between the
  browser, the API, and the database must be TLS 1.2+.
- **The application server is multi-tenant.** Tenant isolation is enforced
  at the query layer (`tenantPlugin` + per-query `organizationId` predicate).
  Any code path that issues a Prisma query without an `organizationId` filter
  is a vulnerability — please report it.
- **Field-level encryption is mandatory** for `BankAccount.accountNumberCipher`
  and `BankAccount.routingNumber`. Plaintext columns for these fields are a
  vulnerability.
- **Refresh tokens are rotated on every use** and stored hashed at rest. A
  refresh-token-replay class issue is a vulnerability.
- **Idempotency keys are scoped per-tenant** and persisted in Redis. Cross-tenant
  key leakage is a vulnerability.
- **PDFs may contain MICR data**. Logging full PDF bodies, base64 payloads, or
  unredacted account/routing numbers in any persistent log sink is a vulnerability.

## Cryptography

- Passwords: Argon2id (`memoryCost: 19,456 KiB`, `timeCost: 2`, `parallelism: 1`)
- Field encryption: AES-256-GCM with per-row IV, key version recorded for rotation
- JWT: HS256 with a 64-byte secret (`JWT_SECRET`)
- Random IDs: `crypto.randomBytes` / `crypto.randomUUID`

If you find a downgrade path, weak parameter set, or non-constant-time
comparison, please report it.
