// Tests for src/lib/git-dates.mjs (review C14): the sitemap's <lastmod> and a case study's dates come from the
// entry's own file, and a shallow clone never passes its cut-off date off as a page's date. Each test makes a small
// repository in a temp folder with commits on fixed dates.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { created, entryFile, fullHistory, lastmod } from '../../src/lib/git-dates.mjs';

const repo = () => {
  const dir = mkdtempSync(join(tmpdir(), 'uplink-dates-'));
  const git = (...args) => execFileSync('git', args, { cwd: dir, stdio: 'pipe' });
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'test@example.test');
  git('config', 'user.name', 'Test');
  git('config', 'commit.gpgsign', 'false');
  // writes the files and commits them on that day
  const commit = (day, files) => {
    for (const [name, text] of Object.entries(files)) {
      mkdirSync(join(dir, name, '..'), { recursive: true });
      writeFileSync(join(dir, name), text);
    }
    git('add', '-A');
    const at = `${day}T12:00:00+00:00`;
    execFileSync('git', ['commit', '-q', '-m', day], { cwd: dir, env: { ...process.env, GIT_AUTHOR_DATE: at, GIT_COMMITTER_DATE: at } });
  };
  return { dir, commit };
};

const a = entryFile('projects', 'office-move');
const b = entryFile('projects', 'backups');
const history = () => {
  const r = repo();
  r.commit('2026-01-10', { [a]: '{"v":1}', [b]: '{"v":1}' });
  r.commit('2026-03-05', { [a]: '{"v":2}' });
  r.commit('2026-06-20', { [b]: '{"v":2}', 'src/components/work/ProjectCase.astro': 'x' });
  return r;
};

test('git-dates: each entry dates from its own file; created is the oldest add', () => {
  const { dir } = history();
  const opts = { cwd: dir, env: {}, warn: () => assert.fail('a full clone should not warn') };
  try {
    assert.equal(entryFile('services', 'help-desk'), 'src/content/services/help-desk.json');
    assert.equal(lastmod([a], opts), '2026-03-05', 'a later edit to another project or a shared part does not move it');
    assert.equal(lastmod([b], opts), '2026-06-20');
    assert.equal(created([a], opts), '2026-01-10');
    assert.equal(created([b], opts), '2026-01-10');
    assert.equal(lastmod(['src/content/projects/new.json'], opts), undefined, 'a file never committed has no date');
  } finally { rmSync(dir, { recursive: true }); }
});

test('git-dates: a shallow clone stops the build in CI, and leaves the dates out (with one warning) elsewhere', () => {
  const { dir } = history();
  const shallow = mkdtempSync(join(tmpdir(), 'uplink-shallow-'));
  try {
    execFileSync('git', ['clone', '-q', '--depth', '1', `file://${dir}`, shallow], { stdio: 'pipe' });
    // without the check, the cut-off commit "adds" every file: both dates would be 2026-06-20
    assert.equal(execFileSync('git', ['log', '-1', '--format=%cs', '--', a], { cwd: shallow }).toString().trim(), '2026-06-20');
    assert.throws(() => lastmod([a], { cwd: shallow, env: { CI: 'true' } }), /git history is shallow.*fetch-depth: 0/s);
    const warnings = [];
    const opts = { cwd: shallow, env: {}, warn: (m) => warnings.push(m) };
    assert.equal(lastmod([a], opts), undefined);
    assert.equal(created([a], opts), undefined);
    assert.equal(fullHistory(opts), false);
    assert.equal(warnings.length, 1, 'one warning per build, not one per page');
    assert.match(warnings[0], /shallow.*leaves out the sitemap's <lastmod>/);
  } finally { rmSync(dir, { recursive: true }); rmSync(shallow, { recursive: true }); }
});

test('git-dates: outside a git checkout, the same: stop in CI, no dates elsewhere', () => {
  const dir = mkdtempSync(join(tmpdir(), 'uplink-nogit-'));
  try {
    assert.throws(() => lastmod([a], { cwd: dir, env: { CI: '1' } }), /not a git checkout/);
    assert.equal(lastmod([a], { cwd: dir, env: {}, warn: () => {} }), undefined);
  } finally { rmSync(dir, { recursive: true }); }
});
