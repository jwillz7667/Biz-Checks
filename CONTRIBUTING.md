# Contributing to Biz Checks

Thanks for taking the time to contribute. This document explains how the repo
is organized, how to set up a working environment, and the conventions we
expect every PR to follow.

## Code of conduct

This project adheres to the [Contributor Covenant](./CODE_OF_CONDUCT.md). By
participating you agree to uphold this code.

## Getting started

### Prerequisites

- Node.js **20.10+** (we ship `.nvmrc`)
- pnpm **9.0+** (`corepack enable && corepack prepare pnpm@9 --activate`)
- PostgreSQL **15+**
- Redis **6+**
- The GnuMICR font at `fonts/GnuMICR.ttf` (see [`fonts/README.md`](./fonts/README.md))

### Bootstrap

```bash
pnpm install
cp .env.example .env       # then fill in JWT_SECRET, ENCRYPTION_KEY, DATABASE_URL, REDIS_URL
pnpm db:migrate            # creates schema
pnpm db:seed               # demo organization + security templates
pnpm dev                   # api on :4000, web on :3000
```

Default seeded login: `owner@demo.test` / `demo-password-12345`.

### Generating secrets

```bash
openssl rand -base64 64    # JWT_SECRET (any value ≥ 32 bytes)
openssl rand -base64 32    # ENCRYPTION_KEY (must decode to exactly 32 bytes)
```

## Repo shape

This is a [pnpm workspaces](https://pnpm.io/workspaces) +
[Turborepo](https://turbo.build/) monorepo:

```
apps/
  api/           Fastify 5 + Prisma 6 + Postgres + Redis
  web/           Next.js 15 App Router + React 19 + Konva designer
packages/
  domain/        Pure value types + invariants (no framework deps)
  micr/          E-13B encoding + ABA mod-10 routing checksum
  formula/       VB-script-like expression engine
  check-engine/  Layout, geometry, alignment, security templates
  ui/            Shared component primitives
  tsconfig/      Base + nextjs tsconfig presets
  eslint-config/ Shared ESLint flat config
```

**Dependency direction is strictly inward.** `apps/* → packages/*`, and within
the api, `routes → service → repo (prisma) → infrastructure`. The `domain`
package imports nothing from frameworks. Layer boundaries are enforced via
`eslint-plugin-boundaries`.

See [`CLAUDE.md`](./CLAUDE.md) for a deeper architectural tour.

## Branches & commits

- Default branch: `main` — always deployable.
- Feature branches: `feat/<short-slug>`, fix branches: `fix/<ticket>-<slug>`.
- We use [Conventional Commits](https://www.conventionalcommits.org/):
  `feat:`, `fix:`, `refactor:`, `perf:`, `test:`, `docs:`, `chore:`,
  `build:`, `ci:`. Optional scope: `feat(api): ...`, `fix(web/designer): ...`.
- One logical change per commit. Refactors and behavior changes never share
  a commit.
- Imperative subject, ≤ 72 chars. Body explains _why_, not _what_.

## Pull requests

Before opening a PR:

```bash
pnpm typecheck             # tsc --noEmit across all packages
pnpm lint                  # eslint
pnpm test                  # vitest
pnpm format:check          # prettier
```

CI runs the same checks; PRs with red CI cannot merge.

PR checklist (the [template](./.github/PULL_REQUEST_TEMPLATE.md) prompts you for these):

- [ ] One logical change.
- [ ] Tests added or updated for the behavior changed.
- [ ] Schema changes include a Prisma migration (`pnpm --filter @biz-checks/api db:migrate`).
- [ ] No new `any`, no `as` casts without justification.
- [ ] No deep imports across workspace boundaries (use the package's `index.ts`).
- [ ] If you touched `packages/check-engine/src/templates/`, mirror the change in
      `apps/web/src/lib/templates/blueprints.ts` (the test suite does **not**
      catch drift between the two).
- [ ] Docs updated (`README.md`, `CLAUDE.md`, ADRs, OpenAPI) if the public
      surface changed.

## Coding conventions

The full house style lives in [`CLAUDE.md`](./CLAUDE.md). The non-negotiables:

- **Feature-first, not type-first.** Group code by domain feature
  (`features/auth/`), not by technical layer (`controllers/`, `models/`).
- **Public API per module.** Every feature/package exposes a single
  `index.ts` barrel as its public surface.
- **Schemas drive types.** Don't hand-write request/response types in
  `apps/api`; export them from the feature's `schemas.ts` via `z.infer`.
- **Money is integer minor units.** Never carry currency as a float. Use
  `formatMinor` / `parseDollarsToMinor` in `apps/web/src/lib/format.ts`.
- **Tenant isolation is enforced at the query layer**, not in handlers. Every
  service function takes `tenantId` as the first argument.
- **Strict TypeScript.** No `any`, no `as` casts unless unavoidable.
- **Konva is browser-only.** Any component that touches `react-konva` must be
  loaded via `next/dynamic` with `ssr: false`.
- **Default to no comments.** Add one only when the *why* is non-obvious.

## Testing

- Unit: pure functions, domain logic, parsers, reducers. No I/O.
- Integration: real Postgres + real Fastify instance. Mocks only for
  third-party APIs.
- Coverage target: **80%+** on `domain/` and `features/*/service.ts`.
- Test names describe behavior, not implementation:
  `it("returns 409 when email already exists")`.
- Arrange / Act / Assert with a blank line between blocks.

Single-test runs:

```bash
pnpm --filter @biz-checks/formula test -- src/formula.test.ts -t "addition"
pnpm --filter @biz-checks/api test -- src/features/auth/service.test.ts
```

## Database changes

```bash
pnpm --filter @biz-checks/api db:migrate           # interactive: prompts for migration name
pnpm --filter @biz-checks/api db:migrate:deploy    # CI / production
pnpm db:studio                                     # open Prisma Studio
```

Every schema change ships a migration in `apps/api/prisma/migrations/`. Never
edit a checked-in migration after merging — write a follow-up migration.

## Security

If you discover a security issue, please follow [`SECURITY.md`](./SECURITY.md)
**instead of** opening a public issue.

## Reporting bugs / requesting features

- Bug reports: use the [bug template](./.github/ISSUE_TEMPLATE/bug_report.yml).
  Include reproduction steps, expected vs. actual, version (`git rev-parse HEAD`).
- Feature requests: use the [feature template](./.github/ISSUE_TEMPLATE/feature_request.yml).
  Describe the user problem first, the proposed solution second.

## Releasing

Releases are tagged from `main` after CI is green. We use semver:

- `MAJOR` — breaking API changes (request/response shape, schema, env vars).
- `MINOR` — new features, additive schema changes.
- `PATCH` — bug fixes, doc updates, dependency bumps.

The release notes for each tag should be derived from the conventional-commit
log between the previous tag and `HEAD`.

## Questions

Open a discussion on GitHub or email `jwillz7667@gmail.com`. We're happy to
help you find your way around.
