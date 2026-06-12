/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@repo/shared'],
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', '@repo/database'],
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  webpack(config, { isServer }) {
    if (isServer) {
      // Prisma's generated client imports node: built-ins via relative paths
      // that bypass serverComponentsExternalPackages. Externalize any module
      // containing the generated client path or @prisma runtime directly.
      const originalExternals = config.externals ?? [];
      config.externals = [
        ...(Array.isArray(originalExternals) ? originalExternals : [originalExternals]),
        ({ request }, callback) => {
          if (
            request &&
            (request.includes('/generated/client') ||
              request.includes('@prisma/client') ||
              request.includes('prisma/runtime'))
          ) {
            return callback(null, 'commonjs ' + request);
          }
          callback();
        },
      ];
    }
    return config;
  },
};

module.exports = nextConfig;
