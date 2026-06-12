/** @type {import('next').NextConfig} */
const nextConfig = {
  // @repo/shared has shared types/DTOs that need transpiling.
  // @repo/database is server-only (Prisma); exclude from webpack bundle
  // to prevent node: scheme errors from the Prisma runtime.
  transpilePackages: ['@repo/shared'],
  experimental: {
    // Keep Prisma packages as Node.js externals — they use node:child_process
    // and other node: built-ins that webpack cannot bundle (Next.js 14).
    serverComponentsExternalPackages: ['@prisma/client', '@repo/database'],
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;
