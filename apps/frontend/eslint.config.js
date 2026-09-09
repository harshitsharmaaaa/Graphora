// Per-workspace flat config: shared baseline + React rules for apps/frontend.
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import base from "@eraser/config/eslint";

export default [
  ...base,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];
