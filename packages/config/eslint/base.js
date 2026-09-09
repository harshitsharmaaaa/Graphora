// Shared ESLint flat-config baseline for the whole monorepo.
// Apps extend this: `import base from "@eraser/config/eslint";`
// Kept dependency-light on purpose: JS + TypeScript + import hygiene.
// React / Node specifics are layered per-workspace so shared packages
// (e.g. shared-types) never inherit frontend-only rules.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/build/**", "**/.vite/**", "**/.turbo/**", "**/node_modules/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["*.js", "*.mjs", "*.cjs", "eslint.config.js"],
        },
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  // Plain-JS config files have no TS project — don't apply type-aware rules to them.
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
