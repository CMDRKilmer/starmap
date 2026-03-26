import js from "@eslint/js";
import globals from "globals";
import pluginReact from "eslint-plugin-react";
import json from "@eslint/json";
import markdown from "@eslint/markdown";
import css from "@eslint/css";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: ["dist/**", "node_modules/**", "package-lock.json"],
  },
  { 
    files: ["**/*.{js,mjs,cjs,jsx}"], 
    plugins: { js, react: pluginReact }, 
    extends: ["js/recommended"], 
    languageOptions: { 
      globals: globals.browser,
      ecmaVersion: 2020,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    settings: {
      react: {
        version: "detect"
      }
    },
    rules: {
      "react/display-name": "off",
      "no-unused-vars": "warn"
    }
  },
  { files: ["**/*.json"], plugins: { json }, language: "json/json", extends: ["json/recommended"] },
  { files: ["**/*.jsonc"], plugins: { json }, language: "json/jsonc", extends: ["json/recommended"] },
  { files: ["**/*.json5"], plugins: { json }, language: "json/json5", extends: ["json/recommended"] },
  { 
    files: ["**/*.md"], 
    plugins: { markdown }, 
    language: "markdown/gfm", 
    extends: ["markdown/recommended"],
    rules: {
      "markdown/fenced-code-language": "off"
    }
  },
  { files: ["**/*.css"], plugins: { css }, language: "css/css", extends: ["css/recommended"] },
]);
