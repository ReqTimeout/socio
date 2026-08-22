import js from "@eslint/js";
import ts from "typescript-eslint";
import svelte from "eslint-plugin-svelte";
import globals from "globals";

export default [
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs["flat/recommended"],
  {
    ignores: [
      "build/**",
      ".svelte-kit/**",
      "node_modules/**",
      "*.tsbuildinfo",
      "vite.config.ts.timestamp-*.mjs",
    ],
  },
  {
    files: ["**/*.ts", "**/*.svelte"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    files: ["**/*.svelte"],
    languageOptions: {
      parserOptions: {
        parser: ts.parser,
      },
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-useless-assignment": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "svelte/valid-compile": "warn",
      "svelte/no-navigation-without-resolve": "warn",
      "svelte/prefer-svelte-reactivity": "warn",
      "svelte/require-each-key": "warn",
      "svelte/prefer-writable-derived": "warn",
    },
  },
];
