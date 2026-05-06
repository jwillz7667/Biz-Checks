# Multi-stage Docker build for the @biz-checks/api workspace.
#
# Build context is the monorepo root. Railway autodetects this Dockerfile
# at the root and uses the Docker builder instead of nixpacks (which has
# a known issue where its final `COPY . /app` overwrites build artifacts).
#
# Local equivalent: `docker build -t biz-checks-api .`

# ──────────────────────────────────────────────────────────────────────
# Stage 1 — install full workspace deps and build everything api needs.
# ──────────────────────────────────────────────────────────────────────
FROM node:20.19.5-bookworm-slim AS builder

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

# `prepare` lifecycle script runs husky which expects .git — tolerated.
RUN pnpm install --frozen-lockfile --prod=false

# Now copy sources and build.
COPY tsconfig*.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

RUN pnpm --filter @biz-checks/api... build

# ──────────────────────────────────────────────────────────────────────
# Stage 2 — slim runtime image. Only api dist + production node_modules.
# ──────────────────────────────────────────────────────────────────────
FROM node:20.19.5-bookworm-slim AS runtime

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates dumb-init \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

ENV NODE_ENV=production \
    NPM_CONFIG_UPDATE_NOTIFIER=false

# Manifests + lockfile for production install.
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/packages/check-engine/package.json ./packages/check-engine/
COPY --from=builder /app/packages/domain/package.json ./packages/domain/
COPY --from=builder /app/packages/formula/package.json ./packages/formula/
COPY --from=builder /app/packages/micr/package.json ./packages/micr/
COPY --from=builder /app/packages/tsconfig/package.json ./packages/tsconfig/

# Built artifacts.
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/packages/check-engine/dist ./packages/check-engine/dist
COPY --from=builder /app/packages/domain/dist ./packages/domain/dist
COPY --from=builder /app/packages/formula/dist ./packages/formula/dist
COPY --from=builder /app/packages/micr/dist ./packages/micr/dist

# Production install — keeps Prisma CLI (it's a devDep, but needed for
# `prisma migrate deploy` at startup) by passing --prod=false. The image
# is still slim because Next/Konva/etc live in the @biz-checks/web tree
# which we don't filter into.
RUN pnpm install --frozen-lockfile --prod=false --filter @biz-checks/api...

# Run as non-root with a real $HOME so corepack/npm caches have a writable
# location. Without this, HOME defaults to /nonexistent and any node
# tooling that touches `~/.cache` (corepack, npm, etc.) fails with EACCES.
RUN addgroup --system --gid 1001 app \
  && adduser --system --uid 1001 --ingroup app --home /home/app --shell /bin/sh app \
  && mkdir -p /home/app \
  && chown -R app:app /home/app /app
USER app
ENV HOME=/home/app

# Railway injects PORT — leave EXPOSE out so we don't lie about the port.
# Resolve prisma directly via node + workspace bin (avoids spawning corepack
# at every startup, which is slow and fragile in slim images).
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "cd apps/api && ./node_modules/.bin/prisma migrate deploy && node dist/src/server.js"]
