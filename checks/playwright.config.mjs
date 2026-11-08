// Playwright Test settings for the site checks. Run them through scripts/check.mjs (the npm scripts do), which picks
// one check (a project here) and hands it its arguments; README "Tools" lists them. The site check (npm run verify)
// also runs the zoom check; verify:zoom runs the zoom check alone.
import { availableParallelism } from 'node:os';
import { defineConfig } from '@playwright/test';

export const CHECKS = ['site', 'zoom', 'links', 'spacing', 'styles', 'visual', 'smoke', 'pagespeed', 'audit'];

export default defineConfig({
  testDir: '.',
  outputDir: '../out/test-results',
  fullyParallel: true, // the site check: one test per page and size, side by side
  workers: process.env.CI ? 6 : Math.max(6, Math.floor(availableParallelism() / 2)), // CI's runner: 4 cores; here, half of them
  retries: 0,
  timeout: 120_000, // a test; the checks that run as one long test set their own
  forbidOnly: !!process.env.CI,
  reporter: [['list', { printSteps: false }]],
  // a dark device: the site's own look, and what every check but the theme test (site.spec.mjs) expects. Playwright's
  // default is light, which would now give every page the light theme (Settings: System)
  use: { browserName: 'chromium', headless: true, colorScheme: 'dark' },
  projects: CHECKS.map((name) => ({
    name,
    testMatch: name === 'site' ? ['site.spec.mjs', 'zoom.spec.mjs'] : `${name}.spec.mjs`,
  })),
});
