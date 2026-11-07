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
//    site is unchanged. Then reads the build's marker there (below).
// 4. Puts that version on 100% of traffic (wrangler versions deploy VERSION_ID@100%). If wrangler reports an error,
//    it reads the deployment status again: when the new version is live at any percentage (or the status can't be
//    read), it carries on to step 5, so a half-done deploy is still checked and rolled back; otherwise it stops.
// 5. Asks the live address for the build's marker every DEPLOY_POLL seconds, up to DEPLOY_POLLS times, until it is the
//    one the preview address gave (a deploy takes a few seconds to reach every Cloudflare location). Then it runs the
//    smoke check against the live address, and once more DEPLOY_RETRY seconds later if that fails.
// 6. If the marker never matched, or the live check still fails: rolls back to the version from step 1 (wrangler
//    rollback VERSION_ID) and exits 1.
// It exits 0 only when the new version is live and passed. Each step's result goes to the run's summary
// ($GITHUB_STEP_SUMMARY) as well as the log. It needs CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID, as wrangler does;
// the smoke runs don't get them. --old ADDRESS (smoke check: the old address redirects here) goes to the live run only.
// The build's marker: a hash of the home page's CSP header, the hashed /_astro/ files it names, and sitemap.xml (each
// page's lastmod). The live address can't say which version answers it, but these come from the build, and nothing
// on Cloudflare's side rewrites them (a zone feature that rewrites HTML, such as Email Address Obfuscation, would leave
// all three alone). Two builds with the same CSS, scripts, inline hashes and page dates share a marker, so for such a
// change the check passes at once: the smoke check then tests a site that is the same either way.
// Settings `versions deploy` doesn't apply from wrangler.jsonc, as `wrangler deploy` did: routes, custom domains,
// cron triggers, workers_dev and preview_urls. When those change (the custom domain at launch), run
// `npx wrangler triggers deploy` once, or deploy by hand with `npx wrangler deploy` (README, "Deploys").
// DEPLOY_WRANGLER and DEPLOY_SMOKE name other commands to run in place of wrangler and the smoke check: only for the
// test (scripts/test/deploy.test.mjs), which runs this against fakes.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
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
const POLL = Number(process.env.DEPLOY_POLL ?? 5);
const POLLS = Number(process.env.DEPLOY_POLLS ?? 24);   // 2 minutes at 5 s
const RETRY = Number(process.env.DEPLOY_RETRY ?? 30);
const command = (name, fallback) => (process.env[name] ? [process.env[name]] : fallback);
const WRANGLER = command('DEPLOY_WRANGLER', [process.execPath, join(ROOT, 'node_modules/wrangler/bin/wrangler.js')]);
const SMOKE = command('DEPLOY_SMOKE', [process.execPath, join(ROOT, 'scripts/check.mjs'), 'smoke']);
const CLOUDFLARE = ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'];   // wrangler's; the smoke runs never need them
// smoke arguments with a value that only fit the live address
const LIVE_ONLY = ['--old'];
const previewArgs = smokeArgs.filter((a, i) => !LIVE_ONLY.includes(a) && !LIVE_ONLY.includes(smokeArgs[i - 1]));

// runs a command with its output in the log; capture: stdout comes back as well; strip: variables it doesn't get
const run = ([cmd, ...pre], args, { capture = false, env = {}, strip = [] } = {}) => {
  console.log(`\n> ${[cmd, ...pre, ...args].map((a) => a.replace(ROOT, '')).join(' ')}`);
  const childEnv = { ...process.env, ...env };
  for (const name of strip) delete childEnv[name];
  const r = spawnSync(cmd, [...pre, ...args], { cwd: ROOT, env: childEnv, encoding: 'utf-8',
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit' });
  if (r.error) console.error(r.error.message);
  if (capture) process.stdout.write(r.stdout || '');
  return { ok: r.status === 0, stdout: r.stdout || '' };
};
const wrangler = (args, opts) => run(WRANGLER, args, opts);
const smoke = (address, args) => run(SMOKE, [address, ...args], { strip: CLOUDFLARE }).ok;
const note = (line) => {
  console.log(`\n${line}`);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n\n`);
};
const stop = (why) => {
  note(`**Not deployed:** ${why}`);
  process.exit(1);
};
// the versions taking traffic now, as [{ version_id, percentage }], most traffic first; null if it can't be read
const liveVersions = () => {
  const status = wrangler(['deployments', 'status', '--json'], { capture: true });
  if (!status.ok) return null;
  try {
    const versions = JSON.parse(status.stdout.slice(status.stdout.indexOf('{'))).versions;
    return Array.isArray(versions) ? versions.sort((a, b) => b.percentage - a.percentage) : null;
  } catch { return null; }
};
// the build's marker at an address (see the top of this file); null if it doesn't answer
const UA = { 'User-Agent': 'uplink-deploy' };   // Cloudflare refuses a client with no user agent of its own (403)
const marker = async (address) => {
  try {
    const get = (path) => fetch(new URL(path, address), { headers: UA, signal: AbortSignal.timeout(15_000) });
    const [home, sitemap] = await Promise.all([get('/'), get('/sitemap.xml')]);
    if (!home.ok || !sitemap.ok) return null;
    const assets = [...new Set((await home.text()).match(/\/_astro\/[^"'\s)>]+/g) || [])].sort();
    return createHash('sha256').update(JSON.stringify([home.headers.get('content-security-policy'), assets, await sitemap.text()]))
      .digest('hex').slice(0, 16);
  } catch { return null; }
};
const sha = (process.env.GITHUB_SHA || '').slice(0, 12) || 'a local build';
const message = `main ${sha}`;

// 1. the version live now
const previous = liveVersions()?.[0]?.version_id;
if (!previous) {
  stop("couldn't read the version live now (`wrangler deployments status`), so a rollback would have nothing to go back to. Nothing changed. A first deploy goes by hand: `npx wrangler deploy`.");
}
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

// 3. smoke the new version at its own address, and note its marker
if (!smoke(preview, ['--preview', ...previewArgs])) stop(`version \`${id}\` failed the smoke check at ${preview}. It takes no traffic; the live site is unchanged.`);
const want = await marker(preview);
if (!want) stop(`couldn't read the build's marker at ${preview} (its home page and sitemap.xml). It takes no traffic; the live site is unchanged.`);
note(`Version \`${id}\` passed the smoke check at its preview address (build marker \`${want}\`).`);

// 4. all traffic to it
if (!wrangler(['versions', 'deploy', `${id}@100%`, '--yes', '--message', message]).ok) {
  const now = liveVersions();
  if (now && !now.some((v) => v.version_id === id)) {
    stop(`\`wrangler versions deploy ${id}@100%\` failed, and \`wrangler deployments status\` shows it isn't live. The live site is unchanged.`);
  }
  note(`\`wrangler versions deploy\` reported an error, but version \`${id}\` ${now ? 'is live' : 'may be live (the status could not be read)'}: checking the live site anyway.`);
} else {
  note(`Deployed version \`${id}\` to 100% of ${live}.`);
}

// 5. wait for the live address to serve this build, then smoke it, once more if it fails
let seen = null;
for (let i = 0; i < POLLS && seen !== want; i++) {
  await sleep(POLL * 1000);
  seen = await marker(live);
}
let why;
if (seen !== want) {
  why = `${live} still served another build after ${POLLS * POLL} s (build marker \`${seen || 'none'}\`, not \`${want}\`)`;
} else {
  let passed = smoke(live, smokeArgs);
  if (!passed) {
    console.log(`\nThe live smoke check failed; trying again in ${RETRY} s.`);
    await sleep(RETRY * 1000);
    passed = smoke(live, smokeArgs);
  }
  if (passed) {
    note(`**Deployed:** version \`${id}\` is live and passed the smoke check at ${live}.`);
    process.exit(0);
  }
  why = `version \`${id}\` failed the smoke check at ${live} after it went live`;
}

// 6. roll back
const back = wrangler(['rollback', previous, '--yes', '--message', `Live check failed on ${id}`]);
note(back.ok
  ? `**Rolled back to ${previous}:** ${why}. Fix main; the next push deploys again.`
  : `**Rollback failed:** ${why}, and \`wrangler rollback\` failed too. Run \`npx wrangler rollback ${previous}\` now.`);
process.exit(1);
