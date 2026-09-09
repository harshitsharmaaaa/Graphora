// Per-workspace flat config: shared baseline + Node globals for apps/backend.
import globals from "globals";
import base from "@eraser/config/eslint";

export default [
  ...base,
  {
    files: ["**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];
