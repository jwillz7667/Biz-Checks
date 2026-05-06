# Deployment

This project ships with two deploy targets out of the box:

- **`apps/api`** → [Railway](https://railway.app) (Fastify + Postgres + Redis)
- **`apps/web`** → [Vercel](https://vercel.com) (Next.js 15)

The two services talk over HTTPS. The web app calls the api via
`NEXT_PUBLIC_API_URL`. CORS on the api is gated by `CORS_ORIGINS`.

> Both platforms support GitHub auto-deploys. Wire each project to
> `https://github.com/jwillz7667/Biz-Checks` and pin to the `main` branch.

---

## 1 — Backend on Railway (`apps/api`)

Railway picks up `railway.json` + `nixpacks.toml` at the **monorepo root**
(the RAILPACK / NIXPACKS builder requires the config at the repo root, not
inside `apps/api/`). Build context is the entire monorepo so workspace
packages resolve correctly.

### Create the project

1. New Project → Deploy from GitHub repo → pick `Biz-Checks`.
2. Railway will offer to detect services. Decline and create an **empty
   service** named `api`.
3. In the service settings:
   - **Root Directory**: leave blank (i.e., monorepo root).
   - **Config Path**: `railway.json` (default; sits at the repo root).
   - **Watch Paths**: `apps/api/**`, `packages/**`, `pnpm-lock.yaml`,
     `pnpm-workspace.yaml`, `package.json`, `turbo.json`, `nixpacks.toml`,
     `railway.json`

### Provision dependencies

In the Railway dashboard for the same project:

- Add a **Postgres** plugin (Railway provisions a managed Postgres 15 instance
  and exposes `DATABASE_URL`).
- Add a **Redis** plugin (exposes `REDIS_URL`).

These are reachable from the api service via Railway's private network.

### Environment variables

Set these on the `api` service. The two secret values must be generated with
`openssl rand -base64 …` — never reuse them across environments.

| Variable             | Source / value                                                        | Required |
| -------------------- | --------------------------------------------------------------------- | :------: |
| `NODE_ENV`           | `production`                                                          |    ✅    |
| `PORT`               | Railway sets this automatically — read it in `server.ts`             |    ✅    |
| `LOG_LEVEL`          | `info`                                                                |    ✅    |
| `DATABASE_URL`       | Reference variable: `${{ Postgres.DATABASE_URL }}`                    |    ✅    |
| `REDIS_URL`          | Reference variable: `${{ Redis.REDIS_URL }}`                          |    ✅    |
| `JWT_SECRET`         | `openssl rand -base64 64`                                             |    ✅    |
| `ENCRYPTION_KEY`     | `openssl rand -base64 32` (must decode to exactly 32 bytes)           |    ✅    |
| `JWT_ACCESS_TTL_SECONDS` | `900` (15 min)                                                    |    ✅    |
| `CORS_ORIGINS`       | Vercel deploy URL (`https://<project>.vercel.app`) + custom domain    |    ✅    |
| `RATE_LIMIT_MAX`     | `300`                                                                 |    ➖    |
| `RATE_LIMIT_WINDOW`  | `1 minute`                                                            |    ➖    |
| `TRUST_PROXY`        | `true` (Railway sits behind a proxy)                                  |    ✅    |

> The `CORS_ORIGINS` value can be a comma-separated list. Add Vercel preview
> deploys with a wildcard if you need them: `https://*.vercel.app`.

### Object storage for PDFs

The api writes rendered check PDFs to object storage. Either:

- Add an S3-compatible bucket (Cloudflare R2, Backblaze B2, AWS S3) and set
  `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`,
  `S3_REGION`.
- Or attach a Railway Volume mounted at `/app/storage` and set
  `STORAGE_DRIVER=local`, `STORAGE_PATH=/app/storage`.

### Migrations

The Railway start command (`pnpm --filter @biz-checks/api start:prod`) runs
`prisma migrate deploy` before booting Fastify. Migrations are checked-in
under `apps/api/prisma/migrations/` and apply in order. No manual step.

### Healthchecks

`railway.json` declares `/health/ready` (provided by `@fastify/under-pressure`)
as the healthcheck path with a 30s grace window. Railway will not route traffic
to a replica until the path returns 200.

### MICR font

Production check rendering needs `fonts/GnuMICR.ttf`. The font is committed at
`fonts/GnuMICR.ttf` and gets bundled into the deploy artifact. **Without it
the renderer falls back to Courier and stamps `MICR-FALLBACK` on every check
— do not deploy without confirming the font is present.**

### Docker alternative

Prefer Docker? The repo ships a multi-stage Dockerfile at `apps/api/Dockerfile`.
Build from the monorepo root:

```bash
docker build -f apps/api/Dockerfile -t biz-checks-api .
```

Switch the Railway service to **Dockerfile** builder if you'd rather use this
than nixpacks.

---

## 2 — Frontend on Vercel (`apps/web`)

Vercel picks up `apps/web/vercel.json`. The install + build commands `cd`
out to the monorepo root so pnpm workspace links resolve.

### Create the project

1. Import → pick the `jwillz7667/Biz-Checks` repo.
2. **Root Directory**: `apps/web`
3. **Framework Preset**: Next.js (auto-detected).
4. **Build Settings**: leave the defaults — `vercel.json` overrides them.
5. **Node Version**: 20.x.

The `ignoreCommand` in `vercel.json` uses `turbo-ignore` so deploys are
skipped automatically when nothing in `apps/web` (or its workspace deps)
changed.

### Environment variables

Set these on the Vercel project under **Settings → Environment Variables**.

| Variable                | Value                                          | Required | Scope          |
| ----------------------- | ---------------------------------------------- | :------: | -------------- |
| `NEXT_PUBLIC_API_URL`   | `https://<api-service>.up.railway.app`         |    ✅    | All envs       |
| `NEXT_TELEMETRY_DISABLED` | `1`                                          |    ➖    | Production     |

> The api URL is **public** — it ships in the browser bundle. That's fine
> because all sensitive routes require a valid JWT and pass tenant checks.

If you use a custom domain for the api, prefer `https://api.biz-checks.com`
over Railway's auto-generated subdomain.

### Domains

Wire the production domain (`https://biz-checks.com`) on Vercel and add it
to `CORS_ORIGINS` on the Railway api service. Preview deploys get
auto-generated `*.vercel.app` URLs — either widen `CORS_ORIGINS` to allow
`https://*.vercel.app` (note: Fastify CORS supports the wildcard) or skip
auth-required preview testing.

### Konva / canvas

`apps/web/next.config.mjs` aliases the Node-only `konva/lib/index-node.js`
and `canvas` modules to `false`. Vercel's webpack bundle picks this up —
the designer canvas only loads in the browser via `dynamic({ssr: false})`.

If a future code path inadvertently imports Konva at module scope from a
Server Component, the Vercel build will fail with `Module not found: 'canvas'`.
Fix it by moving the import into a client-only module or by extending the
alias list.

### Headers

`vercel.json` ships these on every response:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`

Static `_next/static/*` assets get `Cache-Control: public, max-age=31536000, immutable`.

---

## 3 — Post-deploy smoke test

After both services are live, verify:

```bash
# api responds + healthcheck is green
curl -sf https://<api>.up.railway.app/health/ready

# web responds + can reach api (replace with your URL)
curl -sf https://<web>.vercel.app

# auth roundtrip
curl -sX POST https://<api>.up.railway.app/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"owner@demo.test","password":"demo-password-12345"}'
```

If you ran `pnpm db:seed` against the production database (you can do this
once-off via `railway run pnpm --filter @biz-checks/api db:seed`), the demo
login above works. Otherwise create an account via `POST /api/v1/auth/register`.

---

## 4 — Operational notes

- **Logs**: Railway streams Fastify's pino output. Vercel streams Next.js
  output. Both have a 7-day retention on the free tier — set up a log
  drain (Logtail, Datadog, Axiom) for longer retention.
- **Secrets rotation**: bump `JWT_SECRET` invalidates every active session.
  `ENCRYPTION_KEY` rotation requires a re-encrypt step — every `BankAccount`
  row stores the key version it was encrypted under, so you can roll forward
  by writing a one-shot job that decrypts with v1 and re-encrypts with v2.
- **Backups**: Railway's Postgres plugin includes automated daily backups.
  For higher tier, enable point-in-time recovery (PITR).
- **Custom domains**: configure on Vercel + Railway → set the api domain in
  `NEXT_PUBLIC_API_URL` → add the web domain to `CORS_ORIGINS`. There is
  no DNS step on the api side beyond what Railway provides.
