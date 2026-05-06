# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Full ANSI X9.100-160 / CPSA security check template suite — pantograph
  background, microprint top/bottom bands, microprinted memo + signature
  lines, security borders, padlock + feature legend, stale-date warning,
  maximum-amount notice, two-signature notice, amount protection.
  Available in the designer as the default "Security check (Recommended)"
  starting layout (`buildSecurityCheckObjects` in `@biz-checks/check-engine`,
  mirrored as `buildSecurityDocument` in `apps/web`).
- Pro-team repo hygiene: `LICENSE` (Apache 2.0), `CONTRIBUTING.md`,
  `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md`, `.gitattributes`,
  GitHub PR + issue templates, CODEOWNERS, dependabot.yml, CI workflow.
- Deployment configs for Railway (api) and Vercel (web), plus
  `docs/deployment.md` walkthrough.
- `CLAUDE.md` for Claude Code orientation; project-level `README.md`.

### Changed

- Seeded templates now use the security feature suite by default.
- Default new-template layout in the web designer is "Security check"
  (was "Standard business check").

### Fixed

- CORS allowed-headers now includes `x-organization-id`, fixing tenant-scoped
  mutation requests being rejected at the preflight.

## [0.1.0] — initial bring-up

- Monorepo scaffolding with pnpm workspaces + Turborepo.
- `apps/api` Fastify 5 + Prisma 6 + Postgres + Redis with feature-first
  routing (`auth`, `bank-accounts`, `templates`, `checks`, `check-batches`,
  `data-sources`).
- `apps/web` Next.js 15 App Router + React 19 + Konva designer.
- `@biz-checks/domain`, `@biz-checks/micr`, `@biz-checks/formula`,
  `@biz-checks/check-engine`, `@biz-checks/ui`.
- AES-256-GCM field-level encryption for routing/account numbers.
- Argon2id password hashing, JWT access + opaque rotated refresh tokens.
- ANSI X9.100-160 E-13B MICR encoder + ABA mod-10 routing checksum.
- VB-script-like formula language (`L#("Name")`, `T#("Name")`, `Date()`).
- PDF rendering via `pdf-lib` + `@pdf-lib/fontkit` with the GnuMICR font.
