// CI's deploy on main: uploads dist/ as a version that takes no traffic, smoke-checks it, puts it live, and rolls back
// on its own if the live address then fails (review H3). The steps, timings and marker: docs/ops.md, "Deploys".
//   node scripts/deploy.mjs LIVE_ADDRESS [SMOKE_ARGUMENTS ...]
//   e.g. node scripts/deploy.mjs https://uplink-site.johnoreilly.workers.dev
//        node scripts/deploy.mjs https://uplinkit.ca --launch            (after launch: both smoke runs get --launch)
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
const WAIT = Number(process.env.DEPLOY_WAIT ?? 120); // seconds by the clock; each ask gives up after 15 s
const SETTLE = Number(process.env.DEPLOY_SETTLE ?? 15);
const RETRY = Number(process.env.DEPLOY_RETRY ?? 30);
// DEPLOY_WRANGLER and DEPLOY_SMOKE name other commands to run in place of wrangler and the smoke check: only for the
// test (scripts/test/deploy.test.mjs), which runs this against fakes.
// a .cjs fake (the test's) runs under this Node, so it needs no shebang and runs on Windows too
const command = (name, fallback) => {
  const cmd = process.env[name];
  return cmd ? (cmd.endsWith('.cjs') ? [process.execPath, cmd] : [cmd]) : fallback;
};
const WRANGLER = command('DEPLOY_WRANGLER', [process.execPath, join(ROOT, 'node_modules/wrangler/bin/wrangler.js')]);
const SMOKE = command('DEPLOY_SMOKE', [process.execPath, join(ROOT, 'scripts/check.mjs'), 'smoke']);
const CLOUDFLARE = ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID']; // wrangler's; the smoke runs never need them
// smoke arguments with a value that only fit the live address
const LIVE_ONLY = ['--old'];
const previewArgs = smokeArgs.filter((a, i) => !LIVE_ONLY.includes(a) && !LIVE_ONLY.includes(smokeArgs[i - 1]));

// runs a command with its output in the log; capture: stdout comes back as well; strip: variables it doesn't get
const run = ([cmd, ...pre], args, { capture = false, env = {}, strip = [] } = {}) => {
  console.log(`\n> ${[cmd, ...pre, ...args].map((a) => a.replace(ROOT, '')).join(' ')}`);
  const childEnv = { ...process.env, ...env };
  for (const name of strip) delete childEnv[name];
  const r = spawnSync(cmd, [...pre, ...args], {
    cwd: ROOT,
    env: childEnv,
    encoding: 'utf-8',
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  });
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
  } catch {
    return null;
  }
};
// the build's marker at an address; null if it doesn't answer. A hash of the home page's X-Build header (the build's
// ID, scripts/headers.mjs), its CSP header, the hashed /_astro/ files it names, and sitemap.xml. Nothing on
// Cloudflare's side rewrites these (a zone feature that rewrites HTML, such as Email Address Obfuscation, would leave
// them alone).
const UA = { 'User-Agent': 'uplink-deploy' }; // Cloudflare refuses a client with no user agent of its own (403)
const marker = async (address, ms = 15_000) => {
  try {
    const signal = AbortSignal.timeout(Math.max(1, ms));
    const get = (path) => fetch(new URL(path, address), { headers: UA, signal });
    const [home, sitemap] = await Promise.all([get('/'), get('/sitemap.xml')]);
    if (!home.ok || !sitemap.ok) return null;
    const assets = [...new Set((await home.text()).match(/\/_astro\/[^"'\s)>]+/g) || [])].sort();
    const parts = [
      home.headers.get('x-build'),
      home.headers.get('content-security-policy'),
      assets,
      await sitemap.text(),
    ];
    return createHash('sha256').update(JSON.stringify(parts)).digest('hex').slice(0, 16);
  } catch {
    return null;
  }
};
const sha = (process.env.GITHUB_SHA || '').slice(0, 12) || 'a local build';
const message = `main ${sha}`;

// 1. the version live now
const previous = liveVersions()?.[0]?.version_id;
if (!previous) {
  stop(
    "couldn't read the version live now (`wrangler deployments status`), so a rollback would have nothing to go back to. Nothing changed. A first deploy goes by hand: `npx wrangler deploy`.",
  );
}
note(`Live before this deploy: version \`${previous}\`.`);

// 2. upload, untouched by traffic
const dir = mkdtempSync(join(tmpdir(), 'uplink-deploy-'));
const output = join(dir, 'wrangler-output.ndjson');
const upload = wrangler(['versions', 'upload', '--message', message], { env: { WRANGLER_OUTPUT_FILE_PATH: output } });
const entry = (existsSync(output) ? readFileSync(output, 'utf-8') : '')
  .split('\n')
  .filter(Boolean)
  .map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return {};
    }
  })
  .find((e) => e.type === 'version-upload');
rmSync(dir, { recursive: true, force: true });
const id = entry?.version_id,
  preview = entry?.preview_url;
if (!upload.ok || !id || !preview)
  stop(
    `\`wrangler versions upload\` failed or gave no version ID and preview address (${id || 'no ID'}, ${preview || 'no address'}). Nothing changed.`,
  );
note(`Uploaded version \`${id}\` for ${sha}: ${preview}`);

// 3. smoke the new version at its own address, and note its marker
if (!smoke(preview, ['--preview', ...previewArgs]))
  stop(`version \`${id}\` failed the smoke check at ${preview}. It takes no traffic; the live site is unchanged.`);
const want = await marker(preview);
if (!want)
  stop(
    `couldn't read the build's marker at ${preview} (its home page and sitemap.xml). It takes no traffic; the live site is unchanged.`,
  );
note(`Version \`${id}\` passed the smoke check at its preview address (build marker \`${want}\`).`);
const same = (await marker(live)) === want; // the live address serves this very build already (a rerun)
if (same)
  note(
    `The live address already serves build marker \`${want}\`, so this check can't tell the builds apart: the live smoke check waits ${SETTLE} s instead.`,
  );

// 4. all traffic to it
if (!wrangler(['versions', 'deploy', `${id}@100%`, '--yes', '--message', message]).ok) {
  const now = liveVersions();
  if (now && !now.some((v) => v.version_id === id)) {
    stop(
      `\`wrangler versions deploy ${id}@100%\` failed, and \`wrangler deployments status\` shows it isn't live. The live site is unchanged.`,
    );
  }
  note(
    `\`wrangler versions deploy\` reported an error, but version \`${id}\` ${now ? 'is live' : 'may be live (the status could not be read)'}: checking the live site anyway.`,
  );
} else {
  note(`Deployed version \`${id}\` to 100% of ${live}.`);
}

// 5. wait for the live address to serve this build (by the clock: DEPLOY_WAIT seconds at most), then smoke it, once
// more if it fails. When it served this build already, the marker can't show the switch: wait DEPLOY_SETTLE instead
let seen = null;
if (same) {
  await sleep(SETTLE * 1000);
  seen = want;
} else {
  const end = Date.now() + WAIT * 1000;
  while (seen !== want && Date.now() < end) {
    await sleep(Math.min(POLL * 1000, Math.max(0, end - Date.now())));
    seen = await marker(live, Math.min(15_000, end - Date.now()));
  }
}
let why;
if (seen !== want) {
  why = `${live} still served another build after ${WAIT} s (build marker \`${seen || 'none'}\`, not \`${want}\`)`;
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
note(
  back.ok
    ? `**Rolled back to ${previous}:** ${why}. Fix main; the next push deploys again.`
    : `**Rollback failed:** ${why}, and \`wrangler rollback\` failed too. Run \`npx wrangler rollback ${previous}\` now.`,
);
process.exit(1);
