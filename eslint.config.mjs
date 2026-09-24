/** Lint configuration loaded by offline ESLint task. Checks authored TypeScript for
 * unsafe shortcuts and unused code; no environment input, network or generated-file writes.
 * Violations make npm run lint nonzero; TypeScript supplies semantic type checking. */
import tseslint from "typescript-eslint";
export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "tmp/**", "reports/**"] },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
    },
  },
);
