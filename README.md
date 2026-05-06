# BizChecks

An enterprise platform for designing, generating, and printing business checks that comply with **ANSI X9.100-160** (MICR), **ANSI X9.100-161** (paper stock), and current bank-clearing best practices.

- WYSIWYG check designer (Konva canvas, snap-to-grid, layers, properties)
- Bank-account vault with AES-256-GCM field-level encryption of routing/account numbers
- One-off checks and high-volume CSV-driven batches
- Server-side PDF rendering with embedded E-13B MICR glyphs
- Multi-tenant, role-based, fully audited
- Idempotent batch creation; rotated JWT refresh tokens

## Stack

- **Backend:** Node.js 20+, Fastify 5, Prisma 6, PostgreSQL 15+, Redis, Argon2id, `@fastify/jwt`, `pdf-lib` + `@pdf-lib/fontkit`, `fastify-type-provider-zod`
- **Frontend:** Next.js 15 (App Router), React 19, Konva 9 + `react-konva`, Zustand 5, SWR 2, Tailwind CSS 4 (beta)
- **Tooling:** pnpm 9 workspaces, Turborepo 2, Vitest 2, ESLint 9 (flat config), Prettier 3, Husky + lint-staged

## Quick start

Prerequisites: Node ≥ 20.10, pnpm ≥ 9, PostgreSQL ≥ 15, Redis ≥ 7.

```bash
git clone <repo>
cd biz-checks
pnpm install

cp .env.example .env
# Generate the two required secrets:
#   openssl rand -base64 64   # → JWT_SECRET
#   openssl rand -base64 32   # → ENCRYPTION_KEY
# Point DATABASE_URL and REDIS_URL at your local instances.

pnpm db:migrate
pnpm db:seed                 # creates a demo organization + admin user
pnpm dev                     # api on :4000, web on :3000
```

For production-readable check PDFs, install the GPL-licensed E-13B MICR font:

```bash
# Drop GnuMICR.ttf into ./fonts/ (see fonts/README.md)
```

Without it the renderer falls back to Courier and watermarks every page `MICR-FALLBACK` — fine for layout testing, not for negotiable use.

## Repository layout

```
apps/
  api/           Fastify + Prisma backend (HTTP API on :4000)
  web/           Next.js 15 designer + admin UI (on :3000)
packages/
  domain/        Pure types and value objects shared by api + web
  micr/          ANSI X9.100-160 E-13B encoding + ABA mod-10 validation
  formula/       VB-script-like expression engine for template fields
  check-engine/  Layout, geometry, stock blueprints, render context
  ui/            Shared component primitives
  tsconfig/      Base tsconfig presets
  eslint-config/ Shared flat-config ESLint
docs/
  adr/           Architecture decision records
  reference-guide.pdf
fonts/
  GnuMICR.ttf    (you provide — see fonts/README.md)
```

## Common commands

From the repo root:

| Command | What it does |
|---|---|
| `pnpm dev` | Run api + web in parallel via Turbo |
| `pnpm build` | Build every workspace |
| `pnpm test` | Run all Vitest suites |
| `pnpm typecheck` | `tsc --noEmit` across the workspace |
| `pnpm lint` | ESLint (flat config) across the workspace |
| `pnpm format` | Prettier write |
| `pnpm db:migrate` | Apply Prisma migrations |
| `pnpm db:seed` | Seed the demo org + admin |
| `pnpm db:studio` | Launch Prisma Studio |

Per-package work uses `pnpm --filter <name>`:

```bash
pnpm --filter @biz-checks/api dev
pnpm --filter @biz-checks/web typecheck
pnpm --filter @biz-checks/formula test -- -t "concatenation"
```

## Environment variables

All configured at the repo root (`.env`); `.env.example` documents every key.

| Key | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string (idempotency, rate limiting) |
| `JWT_SECRET` | 64 random bytes (b64) for access-token signing |
| `JWT_ACCESS_TTL_SECONDS` | Access-token lifetime (default 900) |
| `JWT_REFRESH_TTL_SECONDS` | Refresh-token lifetime (default 30 d) |
| `ENCRYPTION_KEY` | 32 random bytes (b64) for AES-256-GCM field encryption |
| `ENCRYPTION_KEY_VERSION` | Integer; bump on key rotation |
| `STORAGE_*` | S3-compatible bucket for signature images and rendered PDFs |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `NEXT_PUBLIC_API_URL` | Web → api base URL (browser-visible) |

## Architecture overview

### Multi-tenancy

Every authenticated request must carry `Authorization: Bearer <jwt>` plus `x-organization-id`. The `tenantPlugin` (`apps/api/src/shared/middleware/tenant.ts`) resolves and attaches the membership; services pass `tenantId` as the first argument of every Prisma query. Tenant isolation is enforced at the data layer, not by handlers.

### Auth

- Argon2id password hashing
- JWT access tokens (default 15 min)
- Opaque refresh tokens stored hashed in Postgres, rotated on every use
- `AuthProvider` (web) keeps the access token in memory and the refresh token in `localStorage`; on 401, the API client transparently refreshes and retries

### Field-level encryption

`BankAccount.routingNumberEnc` and `accountNumberEnc` are AES-256-GCM ciphertext. Each row stores its key version so future key rotation is non-breaking. Secrets never leave the API service — the web layer only ever sees the masked last-4.

### Idempotency

`POST /api/v1/check-batches` accepts an `Idempotency-Key` header. The key is stored in Redis (per-tenant, 24h TTL) along with the response; replays return the original response verbatim.

### Audit log

The `auditPlugin` records every mutating request (action, actor, target, diff snippet) into `AuditLog`.

### Check designer

The designer (`apps/web/src/app/(app)/templates/[id]/page.tsx`) is a 3-pane editor — layers, canvas, properties — backed by a Zustand store with snapshot-based dirty tracking. Document units are PostScript points (1 in = 72 pt), the same units the API uses for rendering. Snap-to-grid, zoom, and a 5/8" MICR clear-band guide are built in.

### Formula language

A small VB-script-like expression engine (`packages/formula`) backs every template field. Examples:

```
L#("Payee")                          → label-field reference
T#("CompanyName")                    → template-field reference
"Pay to: " & L#("Payee")             → concatenation
Date.Today                           → today's date
L#("Amount") * 1.10                  → arithmetic
```

### MICR

`packages/micr` implements ANSI X9.100-160 E-13B character encoding (TRANSIT ⑆, ON-US ⑈, AMOUNT ⑇, DASH ⑉) and ABA mod-10 (3-7-1) routing-number checksum validation. The PDF renderer embeds the GnuMICR TTF via `@pdf-lib/fontkit` so the bottom line is machine-readable by bank scanners.

### PDF rendering

`apps/api/src/features/print/pdf-renderer.ts` consumes a `TemplateDocument` and per-row label-field values, evaluates field expressions, and draws the page with `pdf-lib`. Output is a single multi-page PDF (one row per page); a sha-256 checksum is stored on `CheckBatch` next to the binary in object storage.

## Testing

```bash
pnpm test                                          # everything
pnpm --filter @biz-checks/formula test             # one package
pnpm --filter @biz-checks/api test:integration     # integration tier (requires DB)
```

Unit tests live next to the code (`*.test.ts`); integration tests targeting a real Postgres + Redis live under `apps/api/test/integration/`.

## Compliance notes

This software helps you produce checks that conform to public standards (ANSI X9.100-160 MICR, ANSI X9.100-161 paper specifications). It does not replace professional advice on banking, fraud-prevention, or jurisdiction-specific check law. Before issuing checks for negotiation, confirm with your bank that:

- The MICR line scans correctly on their reader (most banks accept a test deck).
- Your check stock meets their security-feature requirements (microprint, watermark, chemical reactivity).
- Your account/routing numbers are validated end-to-end.

## License

UNLICENSED — internal project.
