// ESLint (flat config): the recommended JS, TypeScript and Astro rules, for the page scripts, the config files and
// the Astro components. Formatting is Prettier's (npm run format); none of these
// configs turns on a formatting rule, so the two don't fight.
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import globals from 'globals';

export default defineConfig(
  // .claude/ holds the app's git worktrees (whole copies of the repo), which would be linted twice
  { ignores: ['dist/', 'out/', '.astro/', '.wrangler/', 'node_modules/', '.claude/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { parserOptions: { tsconfigRootDir: import.meta.dirname } } },
  ...astro.configs.recommended,
  { files: ['src/scripts/**/*.js', 'tools/**/*.js'], languageOptions: { globals: globals.browser } },
  { files: ['*.{js,mjs}', 'src/**/*.ts', 'src/lib/*.mjs', 'tools/*.mjs'], languageOptions: { globals: globals.node } },
  // the rules that need types (a promise left floating, a promise handed to a listener), for the code the type check
  // covers (tsconfig.json: checkJs)
  {
    files: ['src/scripts/**/*.js', 'src/lib/**/*.{js,mjs,ts}'],
    extends: [tseslint.configs.recommendedTypeCheckedOnly],
    languageOptions: { parserOptions: { projectService: true } },
  },
);
