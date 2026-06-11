import nextjsConfig from "@repo/eslint-config/nextjs";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextjsConfig,
  {
    files: ["src/**/*.{ts,tsx}"],
  },
];
