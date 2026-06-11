# apps/web/Dockerfile — Next.js 14 multi-stage production build
# Next.js 14 targets React 18; requires Node.js 18+ (Node 20 used for consistency)
# Stage 1: builder — install deps, generate Prisma client, compile Next.js app
# Stage 2: runner — Next.js standalone output (self-contained server)

# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm (pinned to 9.x for lockfile compatibility with project spec)
RUN npm install -g pnpm@9.15.9

# Copy workspace configuration files first for better layer caching
COPY package.json pnpm-workspace.yaml turbo.json ./

# Copy package manifests for all workspaces (enables pnpm to resolve workspace deps)
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

# Install all dependencies (frozen lockfile for reproducible builds)
RUN pnpm install --frozen-lockfile

# Generate Prisma client (Next.js RSCs import @repo/database directly — D-01)
# Note: postinstall is intentionally NOT used (pnpm symlink timing issue — pitfall #3)
RUN pnpm --filter @repo/database run db:generate

# Build the Next.js app (output: standalone for minimal Docker image)
RUN pnpm --filter @repo/web run build

# ─── Stage 2: Runner ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Next.js listens on port 3000 (per D-05 port convention)
EXPOSE 3000

# Copy Next.js standalone output (self-contained server with node_modules embedded)
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static

# server.js is the entry point for Next.js standalone output
CMD ["node", "server.js"]
