<!--
Thanks for contributing! Please fill in the sections below. PRs that are
unclear about *what* changed and *why* slow review for everyone.
-->

## Summary

<!-- One paragraph: what does this PR change and why is it needed? -->

## Type of change

<!-- Pick one. Match your conventional-commit prefix. -->

- [ ] feat — new functionality
- [ ] fix — bug fix (no behavior change beyond the fix)
- [ ] refactor — internal restructure, no behavior change
- [ ] perf — performance improvement
- [ ] test — adding or correcting tests
- [ ] docs — documentation only
- [ ] chore / build / ci — tooling, dependencies, pipelines

## Linked issues

<!-- Closes #123, Refs #456 -->

## Test plan

<!-- Concrete steps a reviewer can run to verify this works. -->

- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] Manually verified in `apps/web` (if user-facing)
- [ ] Migration applies cleanly: `pnpm --filter @biz-checks/api db:migrate`
- [ ] Seeded data still loads: `pnpm db:seed`

## Schema changes

<!-- Delete this section if no DB changes. -->

- [ ] Added Prisma migration in `apps/api/prisma/migrations/`
- [ ] Backfill plan documented (or N/A — additive nullable column)
- [ ] Rollout safe under concurrent writes

## Screenshots / recordings

<!-- Required for any visible UI change. Include before/after if possible. -->

## Reviewer checklist

- [ ] One logical change. (Refactors and behavior changes are split.)
- [ ] No new `any`, no unjustified `as` casts.
- [ ] No deep imports across workspace boundaries.
- [ ] If `packages/check-engine/src/templates/` was touched, the corresponding
      `apps/web/src/lib/templates/blueprints.ts` mirror is updated.
- [ ] If a public route, request shape, or env var changed, docs are updated
      (`README.md`, `CLAUDE.md`, `docs/`).
- [ ] No secrets in code, fixtures, or test data.

## Deployment notes

<!-- Anything special for the deploy? new env var, manual migration, feature
flag, cache invalidation? Delete if N/A. -->
