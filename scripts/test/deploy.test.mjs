// Tests for scripts/deploy.mjs (npm test), CI's deploy on a push to main (review H3). Each test runs the real script
// against a fake wrangler and a fake smoke check (small scripts in a temp folder that log how they were called), and
// two small local servers that stand in for the new version's preview address and the live address, so nothing
// reaches Cloudflare. It proves the order: a version that fails its smoke check never takes traffic; the live check
// waits until the live address serves the new build; and one that breaks the live address is rolled back and fails
// the job.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// wrangler: deployments status → old-version is live, or new-version once a deploy has run (and old-version again
// after a rollback); versions upload → new-version at the preview server (in the output file, as wrangler writes
// it); versions deploy → recorded in the state file, then exits FAKE_DEPLOY_EXIT; rollback → recorded. smoke: fails
// where FAKE_SMOKE_FAIL says (preview, live or none) and logs whether it saw the Cloudflare credentials.
const WRANGLER = `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.FAKE_LOG, JSON.stringify(['wrangler', ...args]) + '\\n');
const state = () => (fs.existsSync(process.env.FAKE_STATE) ? fs.readFileSync(process.env.FAKE_STATE, 'utf-8').trim().split('\\n').pop() : '');
if (args[0] === 'deployments') {
  const id = state() === 'deployed' && process.env.FAKE_DEPLOY_LANDS !== 'no' ? 'new-version' : 'old-version';
  console.log(JSON.stringify({ id: 'd1', versions: [{ version_id: id, percentage: id === 'new-version' ? 10 : 100 }] }));
}
if (args[0] === 'versions' && args[1] === 'upload') {
  fs.appendFileSync(process.env.WRANGLER_OUTPUT_FILE_PATH, JSON.stringify({ type: 'wrangler-session', version: 1 }) + '\\n');
  fs.appendFileSync(process.env.WRANGLER_OUTPUT_FILE_PATH, JSON.stringify({ type: 'version-upload', version: 1, version_id: 'new-version', preview_url: process.env.FAKE_PREVIEW }) + '\\n');
}
if (args[0] === 'versions' && args[1] === 'deploy') {
  fs.appendFileSync(process.env.FAKE_STATE, 'deployed\\n');
  process.exit(Number(process.env.FAKE_DEPLOY_EXIT || 0));
}
if (args[0] === 'rollback') fs.appendFileSync(process.env.FAKE_STATE, 'rolled back\\n');
`;
const SMOKE = `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
const creds = ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'].filter((n) => n in process.env);
fs.appendFileSync(process.env.FAKE_LOG, JSON.stringify(['smoke', ...args, 'creds:' + creds.join(',')]) + '\\n');
const where = args.includes('--preview') ? 'preview' : 'live';
process.exit(process.env.FAKE_SMOKE_FAIL === where ? 1 : 0);
`;

// a site that serves one build: its home page names a hashed /_astro/ file, its CSP, sitemap and X-Build are its own.
// 'new:old' serves the new build's files under the old build's X-Build (a change the files alone can't show)
const build = (name) => ({
  '/': [
    `<!doctype html><link rel="stylesheet" href="/_astro/index.${name}.css"><script src="/_astro/page.${name}.js"></script>`,
    'text/html',
  ],
  '/sitemap.xml': [
    `<urlset><url><loc>https://example.test/</loc><lastmod>${name}</lastmod></url></urlset>`,
    'application/xml',
  ],
});
const serve = (pick) =>
  new Promise((resolve) => {
    const server = createServer((req, res) => {
      const [name, id = name] = pick().split(':');
      const [body, type] = build(name)[req.url] || ['not found', 'text/plain'];
      res.writeHead(build(name)[req.url] ? 200 : 404, {
        'Content-Type': type,
        'Content-Security-Policy': `style-src 'self' 'sha256-${name}'`,
        'X-Build': id,
      });
      res.end(body);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
const address = (server) => `http://127.0.0.1:${server.address().port}`;

// opts: smoke (where it fails), args (after the live address), deployExit, deployLands ('no': status never shows the
// new version), liveBuild (a function of the state file's last line: which build the live server serves)
const deploy = async ({ smoke = 'none', args = [], deployExit = 0, deployLands = 'yes', liveBuild, env = {} } = {}) => {
  const dir = mkdtempSync(join(tmpdir(), 'uplink-deploy-test-'));
  const tool = (name, text) => {
    const p = join(dir, name);
    writeFileSync(p, text);
    chmodSync(p, 0o755);
    return p;
  };
  const log = join(dir, 'calls.log'),
    summary = join(dir, 'summary.md'),
    state = join(dir, 'state');
  const now = () => (existsSync(state) ? readFileSync(state, 'utf-8').trim().split('\n').pop() : '');
  const preview = await serve(() => 'new');
  const live = await serve(() => (liveBuild || ((s) => (s === 'deployed' ? 'new' : 'old')))(now()));
  try {
    const child = spawn(process.execPath, ['scripts/deploy.mjs', address(live), ...args], {
      env: {
        ...process.env,
        DEPLOY_WRANGLER: tool('wrangler.cjs', WRANGLER),
        DEPLOY_SMOKE: tool('smoke.cjs', SMOKE),
        DEPLOY_POLL: '0',
        DEPLOY_WAIT: '1',
        DEPLOY_SETTLE: '0',
        DEPLOY_RETRY: '0',
        ...env,
        FAKE_LOG: log,
        FAKE_STATE: state,
        FAKE_SMOKE_FAIL: smoke,
        FAKE_PREVIEW: address(preview),
        FAKE_DEPLOY_EXIT: String(deployExit),
        FAKE_DEPLOY_LANDS: deployLands,
        GITHUB_STEP_SUMMARY: summary,
        GITHUB_SHA: 'abc123def4567890',
        CLOUDFLARE_API_TOKEN: 'fake-token',
        CLOUDFLARE_ACCOUNT_ID: 'fake-account',
      },
    });
    let out = '';
    child.stdout.on('data', (d) => {
      out += d;
    });
    child.stderr.on('data', (d) => {
      out += d;
    });
    const code = await new Promise((resolve) => child.on('exit', resolve));
    const calls = existsSync(log)
      ? readFileSync(log, 'utf-8')
          .trim()
          .split('\n')
          .map((l) => JSON.parse(l))
      : [];
    return {
      code,
      calls,
      out,
      summary: existsSync(summary) ? readFileSync(summary, 'utf-8') : '',
      live: address(live),
      preview: address(preview),
    };
  } finally {
    preview.close();
    live.close();
    rmSync(dir, { recursive: true });
  }
};
const did = (calls, ...cmd) => calls.some((c) => cmd.every((part, i) => c[i] === part));
const smokes = (calls, at) => calls.filter((c) => c[0] === 'smoke' && c[1] === at);

test('all good: uploads, smokes the version, deploys it at 100%, smokes the live address, no rollback', async () => {
  const { code, calls, out, summary, live, preview } = await deploy();
  assert.equal(code, 0, out);
  assert.deepEqual(
    calls.map((c) => c.slice(0, 2).join(' ')),
    ['wrangler deployments', 'wrangler versions', 'smoke ' + preview, 'wrangler versions', 'smoke ' + live],
  );
  assert.ok(did(calls, 'smoke', preview, '--preview'), 'the preview smoke is told it is a preview');
  assert.ok(
    did(calls, 'wrangler', 'versions', 'deploy', 'new-version@100%', '--yes'),
    'deploys exactly the version it smoked',
  );
  assert.ok(!did(calls, 'wrangler', 'rollback'), 'no rollback');
  assert.ok(!did(calls, 'wrangler', 'deploy'), 'never the old one-step wrangler deploy');
  assert.match(summary, /new-version/);
});

test('the new version fails its smoke check: nothing is deployed, the job fails', async () => {
  const { code, calls, summary } = await deploy({ smoke: 'preview' });
  assert.notEqual(code, 0);
  assert.ok(did(calls, 'wrangler', 'versions', 'upload'));
  assert.ok(!did(calls, 'wrangler', 'versions', 'deploy'), 'no versions deploy');
  assert.ok(!did(calls, 'wrangler', 'rollback'), 'nothing to roll back');
  assert.match(summary, /Not deployed/);
});

test('deployed, then the live address fails (twice): rolls back to the version that was live, the job fails', async () => {
  const { code, calls, summary, live } = await deploy({ smoke: 'live' });
  assert.notEqual(code, 0);
  assert.ok(did(calls, 'wrangler', 'versions', 'deploy', 'new-version@100%'));
  assert.equal(smokes(calls, live).length, 2, 'the live smoke is tried twice before a rollback');
  const back = calls.findIndex((c) => c[0] === 'wrangler' && c[1] === 'rollback');
  assert.ok(back > 0, 'rollback called');
  assert.deepEqual(
    calls[back].slice(0, 4),
    ['wrangler', 'rollback', 'old-version', '--yes'],
    'to the version from before',
  );
  assert.match(summary, /[Rr]olled back to old-version/);
});

test('versions deploy exits 1 but the new version is live (at any percentage): still checked, rolled back on failure', async () => {
  const good = await deploy({ deployExit: 1 });
  assert.equal(good.code, 0, good.out);
  assert.equal(
    good.calls.filter((c) => c[0] === 'wrangler' && c[1] === 'deployments').length,
    2,
    'status read again after the error',
  );
  assert.equal(smokes(good.calls, good.live).length, 1, 'the live address is checked');
  assert.match(good.summary, /new-version/);
  const bad = await deploy({ deployExit: 1, smoke: 'live' });
  assert.notEqual(bad.code, 0);
  assert.ok(did(bad.calls, 'wrangler', 'rollback', 'old-version'), 'rolled back');
});

test('versions deploy exits 1 and the new version is not live: stops, no live check, no rollback', async () => {
  const { code, calls, summary, live } = await deploy({ deployExit: 1, deployLands: 'no', liveBuild: () => 'old' });
  assert.notEqual(code, 0);
  assert.equal(smokes(calls, live).length, 0);
  assert.ok(!did(calls, 'wrangler', 'rollback'));
  assert.match(summary, /Not deployed/);
});

test('the live address still serves the old build: never matched, so no live smoke passes it; rolled back', async () => {
  const { code, calls, summary, live } = await deploy({ liveBuild: () => 'old' });
  assert.notEqual(code, 0);
  assert.equal(smokes(calls, live).length, 0, 'no smoke against a build that is not the new one');
  assert.ok(did(calls, 'wrangler', 'rollback', 'old-version'), 'rolled back');
  assert.match(summary, /another build/);
});

test('the live address serves the new build only after a while: waits for it, then checks', async () => {
  let asks = 0;
  const { code, calls, out, live } = await deploy({
    liveBuild: (s) => (s === 'deployed' && ++asks > 4 ? 'new' : 'old'),
  });
  assert.equal(code, 0, out);
  assert.equal(smokes(calls, live).length, 1);
});

test('the old build differs only in X-Build (a header or Worker change): still told apart, so it waits and rolls back', async () => {
  const { code, calls, live, summary } = await deploy({ liveBuild: () => 'new:old' });
  assert.notEqual(code, 0);
  assert.equal(smokes(calls, live).length, 0);
  assert.ok(did(calls, 'wrangler', 'rollback', 'old-version'));
  assert.match(summary, /another build/);
});

test('the live address already serves this exact build: says so, waits DEPLOY_SETTLE, then checks', async () => {
  const t0 = Date.now();
  const { code, calls, out, live, summary } = await deploy({ liveBuild: () => 'new', env: { DEPLOY_SETTLE: '1' } });
  assert.equal(code, 0, out);
  assert.match(summary, /can't tell the builds apart/);
  assert.equal(smokes(calls, live).length, 1);
  assert.ok(Date.now() - t0 >= 1000, 'the settle wait');
});

test('the wait for the live build is capped by the clock (DEPLOY_WAIT), however often it asks', async () => {
  const t0 = Date.now();
  const { code, summary } = await deploy({ liveBuild: () => 'old', env: { DEPLOY_WAIT: '1.5', DEPLOY_POLL: '0' } });
  const took = Date.now() - t0;
  assert.notEqual(code, 0);
  assert.ok(took >= 1500 && took < 6000, `took ${took} ms`);
  assert.match(summary, /after 1\.5 s/);
});

test('the smoke runs never see the Cloudflare credentials', async () => {
  const { calls } = await deploy();
  const runs = calls.filter((c) => c[0] === 'smoke');
  assert.equal(runs.length, 2);
  for (const c of runs) assert.equal(c.at(-1), 'creds:', `${c[1]} saw ${c.at(-1)}`);
});

test('extra arguments go to both smoke runs (--launch); --old only to the live one', async () => {
  const { code, calls, out, live, preview } = await deploy({ args: ['--launch', '--old', 'https://old.example.test'] });
  assert.equal(code, 0, out);
  assert.ok(smokes(calls, preview)[0].includes('--launch') && smokes(calls, live)[0].includes('--launch'));
  const atPreview = new Set(smokes(calls, preview)[0]);
  assert.ok(!atPreview.has('--old') && !atPreview.has('https://old.example.test'), 'no --old at the preview');
  assert.deepEqual(smokes(calls, live)[0].slice(2, 5), ['--launch', '--old', 'https://old.example.test']);
});
