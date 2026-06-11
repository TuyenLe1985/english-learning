# apps/api/Dockerfile — NestJS 11 multi-stage production build
# NestJS 11 requires Node.js 20+ (drops Node 16/18 support)
# Stage 1: builder — install deps, generate Prisma client, compile TypeScript
# Stage 2: runner — minimal production image with compiled output only

# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm (pinned to 9.x for lockfile compatibility with project spec)
RUN npm install -g pnpm@9.15.9

# Copy workspace configuration files first for better layer caching
COPY package.json pnpm-workspace.yaml turbo.json ./

# Copy package manifests for all workspaces (enables pnpm to resolve workspace deps)
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Install all dependencies (frozen lockfile for reproducible builds)
RUN pnpm install --frozen-lockfile

# Generate Prisma client (must run before building API)
# Note: postinstall is intentionally NOT used (pnpm symlink timing issue — pitfall #3)
RUN pnpm --filter @repo/database run db:generate

# Build the NestJS API (TypeScript compilation via SWC)
RUN pnpm --filter @repo/api run build

# ─── Stage 2: Runner ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy compiled output and runtime dependencies from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/packages/database/generated ./packages/database/generated

# NestJS API listens on port 3001 (per D-05 port convention)
EXPOSE 3001

CMD ["node", "dist/main.js"]
