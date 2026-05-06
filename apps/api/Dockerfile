# Multi-stage build for the @biz-checks/api workspace.
# Build context is the monorepo root: `docker build -f apps/api/Dockerfile .`
#
# Use this if you want to deploy via Docker (Railway, Fly.io, ECS, etc.)
# instead of nixpacks. Outputs a slim image with only the api artifacts +
# pnpm production install.

# ──────────────────────────────────────────────────────────────────────
# Stage 1 — install full workspace deps and build everything api needs.
# ──────────────────────────────────────────────────────────────────────
FROM node:20.10.0-bookworm-slim AS builder

WORKDIR /app

# Toolchain for native modules (argon2, prisma engines).
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates python3 build-essential \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

# Copy lockfile + workspace manifests first for better layer caching.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/check-engine/package.json ./packages/check-engine/
COPY packages/domain/package.json ./packages/domain/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/formula/package.json ./packages/formula/
COPY packages/micr/package.json ./packages/micr/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/ui/package.json ./packages/ui/

RUN pnpm install --frozen-lockfile

# Now copy sources and build.
COPY tsconfig*.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

RUN pnpm --filter @biz-checks/api... build

# ──────────────────────────────────────────────────────────────────────
# Stage 2 — slim runtime image. Only api dist + production node_modules.
# ──────────────────────────────────────────────────────────────────────
FROM node:20.10.0-bookworm-slim AS runtime

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates dumb-init \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

ENV NODE_ENV=production \
    PORT=4000 \
    NPM_CONFIG_UPDATE_NOTIFIER=false

COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/packages ./packages

# Production install — drops devDependencies, keeps workspace links.
RUN pnpm install --prod --frozen-lockfile --filter @biz-checks/api...

# Run as non-root.
RUN addgroup --system --gid 1001 app \
  && adduser --system --uid 1001 --ingroup app app \
  && chown -R app:app /app
USER app

EXPOSE 4000

ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "cd apps/api && npx prisma migrate deploy && node dist/src/server.js"]
