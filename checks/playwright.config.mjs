// Playwright Test settings for the site checks. Run them through scripts/check.mjs (the npm scripts do), which picks
// one check (a project here) and hands it its arguments; README "Tools" lists them.
import { defineConfig } from '@playwright/test';

export const CHECKS = ['site', 'links', 'text', 'spacing', 'styles', 'visual', 'smoke', 'pagespeed', 'audit'];

export default defineConfig({
  testDir: '.',
  outputDir: '../out/test-results',
  fullyParallel: true, // the site and text checks: one test per page and size, six at a time
  workers: 6,
  retries: 0,
  timeout: 120_000, // a test; the checks that run as one long test set their own
  forbidOnly: !!process.env.CI,
  reporter: [['list', { printSteps: false }]],
  use: { browserName: 'chromium', headless: true },
  projects: CHECKS.map((name) => ({ name, testMatch: `${name}.spec.mjs` })),
});
