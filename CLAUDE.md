# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the repo root unless noted. Workspace is `pnpm` + Turborepo.

```bash
pnpm install                 # bootstrap workspace
pnpm dev                     # run api + web in parallel (turbo)
pnpm build                   # build every workspace
pnpm typecheck               # tsc --noEmit across all packages
pnpm lint                    # eslint across all packages
pnpm test                    # vitest run across all packages
pnpm format                  # prettier write
pnpm clean                   # rm dist/.next/.turbo + root node_modules
```

Single-package focus uses `pnpm --filter`:

```bash
pnpm --filter @biz-checks/api dev          # api only (tsx watch)
pnpm --filter @biz-checks/web dev          # web only (next dev :3000)
pnpm --filter @biz-checks/api typecheck    # one package
pnpm --filter @biz-checks/formula test     # one package's tests
pnpm --filter @biz-checks/formula test -- src/formula.test.ts -t "addition"  # single test
```

Database (Postgres via Prisma, lives in `apps/api/prisma`):

```bash
pnpm db:migrate              # prisma migrate dev (creates + applies)
pnpm db:seed                 # tsx prisma/seed.ts
pnpm db:studio               # prisma studio
pnpm --filter @biz-checks/api db:migrate:deploy   # production migrate
```

Env: copy `.env.example` to `.env` at the repo root. `JWT_SECRET` (64 bytes b64) and `ENCRYPTION_KEY` (32 bytes b64) must be generated with `openssl rand -base64 …`. The MICR font (`fonts/GnuMICR.ttf`, GPL) is required for production-readable check PDFs — see `fonts/README.md`. Without it, the renderer falls back to Courier and stamps `MICR-FALLBACK` on the output.

## Architecture

### Monorepo shape

```
apps/
  api/           Fastify 5 + Prisma 6 + Postgres + Redis
  web/           Next.js 15 App Router + React 19 + Konva designer
packages/
  domain/        Pure value types + invariants (no framework deps)
  micr/          E-13B character encoding + ABA mod-10 routing validation
  formula/       VB-script-like expression engine (lexer → parser → evaluator)
  check-engine/  Layout, geometry, alignment, serial sequencing, stock blueprints
  ui/            Shared component primitives
  tsconfig/      Base + nextjs tsconfig presets (extended by every workspace)
  eslint-config/ Shared ESLint flat config
```

Dependency direction is strictly inward: `apps/* → packages/*`, and within api `routes → service → repo (prisma) → infrastructure`. The `domain` package imports nothing from frameworks. Layer boundaries are enforced via `eslint-plugin-boundaries` (see `packages/eslint-config`).

### apps/api — feature-first Fastify

```
src/
  features/<domain>/{routes,schemas,service}.ts    # co-located vertical slice
  shared/{config, error-handler, middleware/{auth,tenant,audit}}
  infrastructure/{prisma, redis, encryption, storage}.ts
  app.ts                                            # plugin + route registration
  server.ts                                         # process entrypoint
```

Features registered under `/api/v1/{auth,bank-accounts,templates,checks,check-batches,data-sources}`. Routes are typed end-to-end via `fastify-type-provider-zod` — schemas are the source of truth for both runtime validation and TS types.

**Multi-tenancy.** Every authenticated request must carry `x-organization-id`. The `tenantPlugin` resolves the membership and attaches `request.tenant` (orgId + role); services pass `tenantId` as the first argument of every Prisma query. Tenant isolation is enforced at the query layer, not in handlers.

**Auth.** Argon2id password hashing, JWT access tokens (15 min) + opaque refresh tokens stored in `RefreshToken` (rotated on every refresh, hashed at rest). The login/refresh/register/logout flow lives in `features/auth/`.

**Field-level encryption.** Account numbers and routing numbers on `BankAccount` are AES-256-GCM encrypted at the application layer via `infrastructure/encryption.ts`. Key version is recorded per-row so future key rotation is non-breaking. Never read these fields raw — use the service layer.

**Audit log.** The `auditPlugin` records every mutating request (action + actor + target + diff snippet) into `AuditLog`. Read-only handlers do not log.

**Idempotency.** Batch creation accepts an `Idempotency-Key` header. Keys are stored per-tenant in Redis with a 24h TTL; a duplicate replays the original response.

### apps/web — Next.js App Router + Konva designer

```
src/
  app/
    (app)/                         # authenticated shell (layout.tsx wraps in AuthProvider)
      dashboard, bank-accounts, templates, templates/[id],
      checks, batches, batches/[id], data-sources
    login, register                # public
  components/{designer, ui}        # designer canvas/panels, shared primitives
  lib/
    api/{client, hooks, types}.ts  # ApiClient + useApi (SWR) + useApiMutation
    auth/{auth-provider, auth-storage}.tsx
    designer/store.ts              # Zustand store for the canvas
    templates/blueprints.ts        # browser-side blueprint duplicates (avoids bundling check-engine)
    format.ts                      # money/date helpers (BigInt-safe)
```

**Auth client.** `AuthProvider` owns the access token in memory and the refresh token in localStorage. The `ApiClient` reads tokens via ref-getters so token rotation never recreates the client (which would invalidate every SWR cache key). On 401, the client triggers `refresh()` and retries the original request once.

**SWR cache keys** include `organizationId` so switching orgs in the UI safely re-fetches.

**The designer.** `app/(app)/templates/[id]/page.tsx` is a 3-pane editor: `LayersPanel | DesignerCanvas + Toolbar | PropertiesPanel`. State lives in `lib/designer/store.ts` (Zustand): document, selection, zoom, snap, guides, and a JSON snapshot used to derive `isDirty`.

The canvas (`components/designer/canvas.tsx`) is loaded via `dynamic(..., { ssr: false })` because Konva needs `window`. Document units are PostScript points (1 in = 72 pt) — the same units the API uses. The Stage is scaled to fit-the-viewport × user zoom. The MICR clear-band (5/8" from the bottom) is rendered as a dashed guide. Drag-end snaps to the grid through `useDesignerStore.getState().snap`.

**Why blueprints are duplicated** in `lib/templates/blueprints.ts` instead of imported from `@biz-checks/check-engine`: the engine pulls in `pdf-lib` and Node-only deps. The web duplicate keeps the browser bundle small while the API uses the canonical engine for rendering.

### packages/domain — types and invariants

Pure TS. Exports IDs (branded strings), units (Pt, Inch conversions), Currency (Money minor-unit math), CheckTemplate / CanvasObject discriminated unions, BankAccount, Check, DataSource, Result, error enums. Anything that needs to be the same shape on both sides of the wire lives here.

### packages/micr — E-13B + ABA

`encoder.ts` produces a string with the four E-13B control glyphs (TRANSIT ⑆, ON-US ⑈, AMOUNT ⑇, DASH ⑉) for the bottom line. `routing.ts` implements ABA mod-10 (3-7-1-3-7-1-3-7-1) checksum validation. Both the API renderer and template designer use this package.

### packages/formula — VB-script-like expression language

A small interpreter used inside template `ValueExpression` cells. Pipeline: `lexer.ts` → `parser.ts` → `evaluator.ts`. Recognized constructs include `L#("Name")` (label-field reference), `T#("Name")` (template-field reference), `Date.Today`, basic arithmetic and concatenation. Adding a new function = add token, parser rule, evaluator branch, test in `formula.test.ts`.

### packages/check-engine — layout & rendering primitives

Shared layout math (`layout.ts`, `geometry.ts`, `alignment.ts`), the canonical stock blueprints under `templates/`, serial-number sequencing (`serial.ts`), document snapshots, and the `RenderContext` used by the API's PDF renderer. Coordinates are points; origin is top-left to match the canvas.

### PDF rendering pipeline

`apps/api/src/features/print/pdf-renderer.ts` consumes a `TemplateDocument` + per-row label-field values, evaluates expressions via `@biz-checks/formula`, and draws to `pdf-lib`. The MICR line is drawn with the GnuMICR font registered through `@pdf-lib/fontkit`. Output is a single multi-page PDF (one row per page); checksum is sha-256 over the bytes, stored on the `CheckBatch` row alongside the binary in object storage.

## Conventions specific to this repo

- **Money is integer minor units.** Never carry currency as a float. Use `formatMinor` / `parseDollarsToMinor` in `apps/web/src/lib/format.ts`. The web side uses `BigInt` accumulators when summing batch totals — this is why `tsconfig` targets ES2022.
- **One feature directory owns its routes + schemas + service.** Don't add cross-feature imports between `features/*` — go through `domain` or factor a shared helper into `shared/`.
- **Schemas drive types.** Don't hand-write request/response types in `apps/api`; export them from the feature's `schemas.ts` via `z.infer`. The web app mirrors them in `apps/web/src/lib/api/types.ts` — keep both in sync.
- **No deep imports across workspace boundaries.** Import from `@biz-checks/<pkg>` (the package's `index.ts`), never from `@biz-checks/<pkg>/dist/...`.
- **Konva is browser-only.** Any component that touches `react-konva` must be loaded via `next/dynamic` with `ssr: false`.
- **`apps/web/src/lib/templates/blueprints.ts` mirrors `packages/check-engine/src/templates/`.** If you change one, change the other; the test suite does not catch drift.
