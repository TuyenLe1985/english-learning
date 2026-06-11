import nestjsConfig from "@repo/eslint-config/nestjs";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nestjsConfig,
  {
    files: ["src/**/*.ts"],
  },
];
