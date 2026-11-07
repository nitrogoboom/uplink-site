// Tests for scripts/deploy.mjs (npm test), CI's deploy on a push to main (review H3). Each test runs the real script
// against a fake wrangler and a fake smoke check (small scripts in a temp folder that log how they were called), so
// nothing reaches Cloudflare. It proves the order: a version that fails its smoke check never takes traffic, and one
// that breaks the live address is rolled back and fails the job.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const LIVE = 'https://uplink-site.example.workers.dev';
const PREVIEW = 'https://new12345-uplink-site.example.workers.dev';

// wrangler: deployments status → the live version is old-version; versions upload → new-version at PREVIEW (in the
// output file, as wrangler writes it); versions deploy and rollback succeed. smoke: fails where FAKE_SMOKE_FAIL says
// (preview, live or none). Both append one JSON line per call to the log.
const WRANGLER = `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.FAKE_LOG, JSON.stringify(['wrangler', ...args]) + '\\n');
if (args[0] === 'deployments') console.log(JSON.stringify({ id: 'd1', versions: [{ version_id: 'old-version', percentage: 100 }] }));
if (args[0] === 'versions' && args[1] === 'upload') {
  fs.appendFileSync(process.env.WRANGLER_OUTPUT_FILE_PATH, JSON.stringify({ type: 'wrangler-session', version: 1 }) + '\\n');
  fs.appendFileSync(process.env.WRANGLER_OUTPUT_FILE_PATH, JSON.stringify({ type: 'version-upload', version: 1, version_id: 'new-version', preview_url: '${PREVIEW}' }) + '\\n');
}
`;
const SMOKE = `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.FAKE_LOG, JSON.stringify(['smoke', ...args]) + '\\n');
const where = args.includes('--preview') ? 'preview' : 'live';
process.exit(process.env.FAKE_SMOKE_FAIL === where ? 1 : 0);
`;

const deploy = (smokeFails, extra = []) => {
  const dir = mkdtempSync(join(tmpdir(), 'uplink-deploy-test-'));
  const tool = (name, text) => { const p = join(dir, name); writeFileSync(p, text); chmodSync(p, 0o755); return p; };
  const log = join(dir, 'calls.log'), summary = join(dir, 'summary.md');
  try {
    const r = spawnSync(process.execPath, ['scripts/deploy.mjs', LIVE, ...extra], {
      env: { ...process.env, DEPLOY_WRANGLER: tool('wrangler', WRANGLER), DEPLOY_SMOKE: tool('smoke', SMOKE), DEPLOY_SETTLE: '0',
        DEPLOY_RETRY: '0', FAKE_LOG: log, FAKE_SMOKE_FAIL: smokeFails, GITHUB_STEP_SUMMARY: summary, GITHUB_SHA: 'abc123def4567890' },
      encoding: 'utf-8',
    });
    const calls = existsSync(log) ? readFileSync(log, 'utf-8').trim().split('\n').map((l) => JSON.parse(l)) : [];
    return { code: r.status, calls, out: r.stdout + r.stderr, summary: existsSync(summary) ? readFileSync(summary, 'utf-8') : '' };
  } finally { rmSync(dir, { recursive: true }); }
};
const did = (calls, ...cmd) => calls.some((c) => cmd.every((part, i) => c[i] === part));

test('all good: uploads, smokes the version, deploys it at 100%, smokes the live address, no rollback', () => {
  const { code, calls, out, summary } = deploy('none');
  assert.equal(code, 0, out);
  assert.deepEqual(calls.map((c) => c.slice(0, 2).join(' ')), ['wrangler deployments', 'wrangler versions', 'smoke ' + PREVIEW, 'wrangler versions', 'smoke ' + LIVE]);
  assert.ok(did(calls, 'smoke', PREVIEW, '--preview'), 'the preview smoke is told it is a preview');
  assert.ok(did(calls, 'wrangler', 'versions', 'deploy', 'new-version@100%', '--yes'), 'deploys exactly the version it smoked');
  assert.ok(!did(calls, 'wrangler', 'rollback'), 'no rollback');
  assert.ok(!did(calls, 'wrangler', 'deploy'), 'never the old one-step wrangler deploy');
  assert.match(summary, /new-version/);
});

test('the new version fails its smoke check: nothing is deployed, the job fails', () => {
  const { code, calls, summary } = deploy('preview');
  assert.notEqual(code, 0);
  assert.ok(did(calls, 'wrangler', 'versions', 'upload'));
  assert.ok(!did(calls, 'wrangler', 'versions', 'deploy'), 'no versions deploy');
  assert.ok(!did(calls, 'wrangler', 'rollback'), 'nothing to roll back');
  assert.match(summary, /Not deployed/);
});

test('deployed, then the live address fails (twice): rolls back to the version that was live, the job fails', () => {
  const { code, calls, summary } = deploy('live');
  assert.notEqual(code, 0);
  assert.ok(did(calls, 'wrangler', 'versions', 'deploy', 'new-version@100%'));
  assert.equal(calls.filter((c) => c[0] === 'smoke' && c[1] === LIVE).length, 2, 'the live smoke is tried twice before a rollback');
  const back = calls.findIndex((c) => c[0] === 'wrangler' && c[1] === 'rollback');
  assert.ok(back > 0, 'rollback called');
  assert.deepEqual(calls[back].slice(0, 4), ['wrangler', 'rollback', 'old-version', '--yes'], 'to the version from before');
  assert.match(summary, /[Rr]olled back to old-version/);
});

test('extra arguments go to both smoke runs (--launch at launch)', () => {
  const { code, calls } = deploy('none', ['--launch']);
  assert.equal(code, 0);
  assert.equal(calls.filter((c) => c[0] === 'smoke' && c.includes('--launch')).length, 2);
});

test('site.yml: the main deploy runs scripts/deploy.mjs, not a one-step wrangler deploy', () => {
  const yml = readFileSync('.github/workflows/site.yml', 'utf-8');
  const job = yml.slice(yml.indexOf('\n  deploy:'), yml.indexOf('\n  preview:'));
  assert.match(job, /node scripts\/deploy\.mjs https:\/\/uplink-site\.johnoreilly\.workers\.dev/);
  assert.doesNotMatch(job, /wrangler deploy\b/);
  assert.match(job, /- run: npm ci/, 'npm ci first (review H4)');
  assert.match(job, /name: dist/, 'the tested build');
});
