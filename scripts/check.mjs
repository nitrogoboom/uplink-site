// Runs one site check (Playwright Test, checks/*.spec.mjs) with its own arguments:
//   node scripts/check.mjs CHECK [ARGUMENTS ...] [-- PLAYWRIGHT_OPTIONS ...]
//   e.g. node scripts/check.mjs text --text 1        node scripts/check.mjs site --all -- --headed
// The npm scripts call this (npm run verify, verify:text, smoke ...); README "Tools" lists every check and argument.
// Playwright Test takes no arguments of its own for a test, so they travel in CHECK_ARGS (checks/lib.mjs reads it).
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { CHECKS } from '../checks/playwright.config.mjs';

const [name, ...rest] = process.argv.slice(2);
if (!CHECKS.includes(name)) {
  console.error(`usage: node scripts/check.mjs CHECK [ARGUMENTS ...]\n  CHECK is one of: ${CHECKS.join(', ')}`);
  process.exit(2);
}
const cut = rest.indexOf('--');
const args = cut < 0 ? rest : rest.slice(0, cut);
const own = cut < 0 ? [] : rest.slice(cut + 1);
const cli = createRequire(import.meta.url).resolve('@playwright/test/cli');
const config = fileURLToPath(new URL('../checks/playwright.config.mjs', import.meta.url));
const child = spawn(process.execPath, [cli, 'test', '--config', config, '--project', name, ...own], {
  stdio: 'inherit',
  env: { ...process.env, CHECK_ARGS: JSON.stringify(args) },
});
child.on('exit', (code) => process.exit(code ?? 1));
