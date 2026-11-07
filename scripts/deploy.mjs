// Deploys the built site (dist/) to the live Worker so that a version that fails its checks never takes traffic, and
// one that breaks the live address goes back out on its own (review H3). CI's deploy job runs it on a push to main,
// after npm ci and with the tested dist/ in place:
//   node scripts/deploy.mjs LIVE_ADDRESS [SMOKE_ARGUMENTS ...]
//   e.g. node scripts/deploy.mjs https://uplink-site.johnoreilly.workers.dev
//        node scripts/deploy.mjs https://uplinkit.ca --launch            (after launch: both smoke runs get --launch)
// 1. Notes the version live now (wrangler deployments status --json): the one a rollback goes back to.
// 2. Uploads dist/ and the Worker as a new version (wrangler versions upload). It takes no traffic yet, but answers
//    at its own preview address, which wrangler writes to its output file (WRANGLER_OUTPUT_FILE_PATH).
// 3. Runs the smoke check (checks/smoke.spec.mjs) against that address, with --preview. A failure stops here: the live
//    site is unchanged.
// 4. Puts that version on 100% of traffic (wrangler versions deploy VERSION_ID@100%).
// 5. Waits DEPLOY_SETTLE seconds (a deploy takes a few seconds to reach every Cloudflare location), then runs the
//    smoke check against the live address. A failure is tried once more, DEPLOY_RETRY seconds later.
// 6. If it still fails: rolls back to the version from step 1 (wrangler rollback VERSION_ID) and exits 1.
// It exits 0 only when the new version is live and passed. Each step's result goes to the run's summary
// ($GITHUB_STEP_SUMMARY) as well as the log. It needs CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID, as wrangler does.
// `versions deploy` doesn't apply routes, custom domains or cron triggers from wrangler.jsonc: when those change (the
// custom domain at launch), run `npx wrangler triggers deploy` once (README, "Deploys").
// DEPLOY_WRANGLER and DEPLOY_SMOKE name other commands to run in place of wrangler and the smoke check: only for the
// test (scripts/test/deploy.test.mjs), which runs this against fakes.
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const [live, ...smokeArgs] = process.argv.slice(2);
if (!/^https?:\/\/[^/]+\/?$/.test(live || '')) {
  console.error('usage: node scripts/deploy.mjs LIVE_ADDRESS [SMOKE_ARGUMENTS ...]');
  process.exit(2);
}
const SETTLE = Number(process.env.DEPLOY_SETTLE ?? 15);
const RETRY = Number(process.env.DEPLOY_RETRY ?? 30);
const command = (name, fallback) => (process.env[name] ? [process.env[name]] : fallback);
const WRANGLER = command('DEPLOY_WRANGLER', [process.execPath, join(ROOT, 'node_modules/wrangler/bin/wrangler.js')]);
const SMOKE = command('DEPLOY_SMOKE', [process.execPath, join(ROOT, 'scripts/check.mjs'), 'smoke']);

// runs a command with its output in the log; capture: stdout comes back as well
const run = ([cmd, ...pre], args, { capture = false, env = {} } = {}) => {
  console.log(`\n> ${[cmd, ...pre, ...args].map((a) => a.replace(ROOT, '')).join(' ')}`);
  const r = spawnSync(cmd, [...pre, ...args], { cwd: ROOT, env: { ...process.env, ...env }, encoding: 'utf-8',
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit' });
  if (r.error) console.error(r.error.message);
  if (capture) process.stdout.write(r.stdout || '');
  return { ok: r.status === 0, stdout: r.stdout || '' };
};
const wrangler = (args, opts) => run(WRANGLER, args, opts);
const smoke = (address, extra = []) => run(SMOKE, [address, ...extra, ...smokeArgs]).ok;
const note = (line) => {
  console.log(`\n${line}`);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n\n`);
};
const stop = (why) => {
  note(`**Not deployed:** ${why}`);
  process.exit(1);
};
const sha = (process.env.GITHUB_SHA || '').slice(0, 12) || 'a local build';
const message = `main ${sha}`;

// 1. the version live now
const status = wrangler(['deployments', 'status', '--json'], { capture: true });
let previous = null;
try {
  const versions = JSON.parse(status.stdout.slice(status.stdout.indexOf('{'))).versions || [];
  previous = versions.sort((a, b) => b.percentage - a.percentage)[0]?.version_id || null;
} catch { /* stays null */ }
if (!status.ok || !previous) stop("couldn't read the version live now (`wrangler deployments status`), so a rollback would have nothing to go back to. Nothing changed.");
note(`Live before this deploy: version \`${previous}\`.`);

// 2. upload, untouched by traffic
const dir = mkdtempSync(join(tmpdir(), 'uplink-deploy-'));
const output = join(dir, 'wrangler-output.ndjson');
const upload = wrangler(['versions', 'upload', '--message', message], { env: { WRANGLER_OUTPUT_FILE_PATH: output } });
const entry = (existsSync(output) ? readFileSync(output, 'utf-8') : '').split('\n').filter(Boolean)
  .map((line) => { try { return JSON.parse(line); } catch { return {}; } })
  .find((e) => e.type === 'version-upload');
rmSync(dir, { recursive: true, force: true });
const id = entry?.version_id, preview = entry?.preview_url;
if (!upload.ok || !id || !preview) stop(`\`wrangler versions upload\` failed or gave no version ID and preview address (${id || 'no ID'}, ${preview || 'no address'}). Nothing changed.`);
note(`Uploaded version \`${id}\` for ${sha}: ${preview}`);

// 3. smoke the new version at its own address
if (!smoke(preview, ['--preview'])) stop(`version \`${id}\` failed the smoke check at ${preview}. It takes no traffic; the live site is unchanged.`);
note(`Version \`${id}\` passed the smoke check at its preview address.`);

// 4. all traffic to it
if (!wrangler(['versions', 'deploy', `${id}@100%`, '--yes', '--message', message]).ok) {
  stop(`\`wrangler versions deploy ${id}@100%\` failed. Run \`npx wrangler deployments status\` to see which version is live.`);
}
note(`Deployed version \`${id}\` to 100% of ${live}.`);

// 5. smoke the live address, once more if it fails
await sleep(SETTLE * 1000);
let passed = smoke(live);
if (!passed) {
  console.log(`\nThe live smoke check failed; trying again in ${RETRY} s, in case the deploy hadn't reached every location.`);
  await sleep(RETRY * 1000);
  passed = smoke(live);
}
if (passed) {
  note(`**Deployed:** version \`${id}\` is live and passed the smoke check at ${live}.`);
  process.exit(0);
}

// 6. roll back
const back = wrangler(['rollback', previous, '--yes', '--message', `Smoke check failed on ${id}`]);
note(back.ok
  ? `**Rolled back to ${previous}:** version \`${id}\` failed the smoke check at ${live} after it went live. Fix main; the next push deploys again.`
  : `**Rollback failed:** version \`${id}\` is live and failed the smoke check at ${live}. Run \`npx wrangler rollback ${previous}\` now.`);
process.exit(1);
