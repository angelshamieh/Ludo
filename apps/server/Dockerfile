# ---- builder ----
FROM node:20-slim AS builder
RUN corepack enable
WORKDIR /app

# Copy workspace manifests first for better layer caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.base.json ./
COPY packages/game-shared/package.json packages/game-shared/
COPY packages/game-logic-ludo/package.json packages/game-logic-ludo/
COPY packages/game-logic-snakes/package.json packages/game-logic-snakes/
COPY apps/server/package.json apps/server/

RUN pnpm install --filter @ludo/server... --frozen-lockfile=false

# Copy sources for the workspaces we need
COPY packages/game-shared packages/game-shared
COPY packages/game-logic-ludo packages/game-logic-ludo
COPY packages/game-logic-snakes packages/game-logic-snakes
COPY apps/server apps/server

# ---- runner ----
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable

# Bring over workspace manifests + lockfile (for pnpm to resolve workspace links)
COPY --from=builder /app/pnpm-workspace.yaml /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/tsconfig.base.json ./

# Workspaces (source-only — game-logic packages ship .ts; server runs via tsx)
COPY --from=builder /app/packages/game-shared packages/game-shared
COPY --from=builder /app/packages/game-logic-ludo packages/game-logic-ludo
COPY --from=builder /app/packages/game-logic-snakes packages/game-logic-snakes
COPY --from=builder /app/apps/server apps/server

# node_modules (root + per-workspace)
COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/apps/server/node_modules apps/server/node_modules
COPY --from=builder /app/packages/game-logic-ludo/node_modules packages/game-logic-ludo/node_modules
COPY --from=builder /app/packages/game-logic-snakes/node_modules packages/game-logic-snakes/node_modules

EXPOSE 8787
ENV PORT=8787
CMD ["pnpm", "--filter", "@ludo/server", "exec", "tsx", "src/index.ts"]
