import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "vault/**",
      "deprecated/openclaw/**/memory/**",
      "deprecated/openclaw/**/config/**",
      "deprecated/openclaw/**/site-packages/**",
      "deprecated/openclaw/**/youtube-venv/**",
      "deprecated/openclaw/**/.venv/**"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        project: false
      }
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off"
    }
  }
);
