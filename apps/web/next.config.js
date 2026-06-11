/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@repo/database', '@repo/shared'],
  experimental: {},
  eslint: {
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;
