// Prisma Client singleton — prevents duplicate instances under Next.js webpack hot-reload.
// Multiple PrismaClient instances exhaust the PostgreSQL connection pool within a few reloads.
// Anchoring on globalThis ensures the same instance is reused across hot-reloads in development.
// In production, the module is only loaded once, so globalThis is not needed.
//
// Reference: https://www.prisma.io/docs/guides/nextjs (globalThis singleton pattern)
// Reference: Prisma GitHub issue discussion — Next.js App Router + pnpm monorepo

import { PrismaClient } from "../generated/client/index.js";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma || new PrismaClient({ log: ["error"] });

if (process.env["NODE_ENV"] !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "../generated/client/index.js";
