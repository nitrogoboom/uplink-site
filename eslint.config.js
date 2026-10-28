// ESLint (flat config): the recommended JS, TypeScript and Astro rules, for the page scripts, the build scripts and
// the Astro components. Formatting is left alone (the code is hand-formatted; see .prettierignore).
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import globals from 'globals';

export default defineConfig(
  { ignores: ['dist/', 'out/', 'site/', 'editing-room/', '.astro/', '.wrangler/', 'node_modules/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  { files: ['src/scripts/**/*.js', 'tools/**/*.js'], languageOptions: { globals: globals.browser } },
  { files: ['scripts/**/*.mjs', '*.{js,mjs}', 'src/**/*.ts'], languageOptions: { globals: globals.node } },
);
