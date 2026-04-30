# ---- builder ----
FROM node:20-slim AS builder
RUN corepack enable
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.base.json ./
COPY packages/game-logic/package.json packages/game-logic/
COPY apps/web/package.json apps/web/

RUN pnpm install --filter @ludo/web... --frozen-lockfile=false

COPY packages/game-logic packages/game-logic
COPY apps/web apps/web

# Build-time public env vars (baked into the JS bundle by Next.js)
ARG NEXT_PUBLIC_LUDO_HTTP
ARG NEXT_PUBLIC_LUDO_WS
ENV NEXT_PUBLIC_LUDO_HTTP=$NEXT_PUBLIC_LUDO_HTTP
ENV NEXT_PUBLIC_LUDO_WS=$NEXT_PUBLIC_LUDO_WS

RUN pnpm --filter @ludo/web build

# ---- runner ----
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Next.js standalone output is self-contained — copy just the standalone artifact + static + public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "apps/web/server.js"]
