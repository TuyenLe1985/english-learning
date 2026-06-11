import baseConfig from "./index.mjs";

/** @type {import("eslint").Linter.Config[]} */
const nextjsConfig = [
  ...baseConfig,
  {
    // Next.js-specific rules — extended in later phases when @next/eslint-plugin-next is added
    rules: {
      // Placeholder: Next.js App Router patterns enforced here
    },
  },
];

export default nextjsConfig;
