// Playwright Test settings for the smoke check, the only check here: the deploy runs it (scripts/deploy.mjs) to decide
// whether to roll back. It asks over plain HTTP and opens no browser. Run it through scripts/check.mjs (npm run smoke).
import { defineConfig } from '@playwright/test';

export const CHECKS = ['smoke'];

export default defineConfig({
  testDir: '.',
  outputDir: '../out/test-results',
  retries: 0,
  timeout: 120_000,
  forbidOnly: !!process.env.CI,
  reporter: [['list', { printSteps: false }]],
  projects: CHECKS.map((name) => ({ name, testMatch: `${name}.spec.mjs` })),
});
