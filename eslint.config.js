// Root flat ESLint config. Shared rules live in packages/config/eslint/base.js
// so every workspace inherits the same baseline.
import base from "./packages/config/eslint/base.js";

export default [
  ...base,
  {
    ignores: [
      "**/dist/**",
      "**/build/**",
      "**/.vite/**",
      "**/.turbo/**",
      "**/node_modules/**",
      "**/bun.lock",
    ],
  },
];
