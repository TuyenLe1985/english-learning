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
      // serverComponentsExternalPackages doesn't always fire before webpack
      // resolves the pnpm symlink into TypeScript source. Catch @repo/database
      // and @prisma/client by name in the externals callback so webpack emits
      // require('@repo/database') / require('@prisma/client'), which Node.js
      // resolves via the workspace symlink to the CJS dist — where the relative
      // ../generated/client path is valid relative to that dist file's location.
      const originalExternals = config.externals ?? [];
      config.externals = [
        ...(Array.isArray(originalExternals) ? originalExternals : [originalExternals]),
        ({ request }, callback) => {
          if (
            request &&
            (request === '@repo/database' ||
              request === '@prisma/client' ||
              request.startsWith('@prisma/'))
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
