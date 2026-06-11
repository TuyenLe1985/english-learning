import baseConfig from "./index.mjs";

/** @type {import("eslint").Linter.Config[]} */
const nestjsConfig = [
  ...baseConfig,
  {
    // NestJS-specific rules — extended in later phases when NestJS patterns are established
    rules: {
      // Placeholder: NestJS module/service/controller patterns enforced here
    },
  },
];

export default nestjsConfig;
