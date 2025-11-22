import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";
import reactYouMightNotNeedAnEffect from "eslint-plugin-react-you-might-not-need-an-effect";

export default defineConfig([
  globalIgnores(["dist"]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "react-you-might-not-need-an-effect": reactYouMightNotNeedAnEffect,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...reactRefresh.configs.vite.rules,
      ...reactYouMightNotNeedAnEffect.configs.recommended.rules,
      "no-console": "error",
    },
  },
]);
