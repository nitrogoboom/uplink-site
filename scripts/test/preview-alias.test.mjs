// Tests for scripts/preview-alias.mjs (npm test): every branch name gets an alias wrangler takes, short enough, and
// two branches never share one by being cut to the same length (review T1).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { MAX, WRANGLER, previewAlias } from '../preview-alias.mjs';

const NAMES = [
  'main', 'claude/uplink-site-best-practices-ppzgw3', 'Feature/ÉTÉ_2026', '123-fix', '2026-11-07', '-x-', '___', '',
  'dependabot/npm_and_yarn/minor-and-patch-6f1e2d', 'UPPER', 'a', 'x'.repeat(80), 'z/' + '9'.repeat(40), 'fix--double..dots',
];

test('every alias is one wrangler accepts, and at most 30 characters', () => {
  for (const name of NAMES) {
    const a = previewAlias(name);
    assert.match(a, WRANGLER, `${JSON.stringify(name)} -> ${a}`);
    assert.ok(a.length <= MAX, `${JSON.stringify(name)} -> ${a} (${a.length})`);
  }
});

test('short names read as the branch; a name that starts with a digit gets a letter', () => {
  assert.equal(previewAlias('Feature/New_Footer'), 'feature-new-footer');
  assert.equal(previewAlias('123-fix'), 'b-123-fix');
  assert.equal(previewAlias('___'), 'b');
});

test('two long branches that start the same get different aliases, the same one on every push', () => {
  const a = previewAlias('claude/uplink-site-best-practices-ppzgw3');
  const b = previewAlias('claude/uplink-site-best-practices-other');
  assert.notEqual(a, b);
  assert.equal(previewAlias('claude/uplink-site-best-practices-ppzgw3'), a);
  assert.match(a, /^claude-uplink-site-best-[0-9a-f]{6}$/);
});

test('the command prints the alias', () => {
  assert.equal(execFileSync('node', ['scripts/preview-alias.mjs', 'Feature/X'], { encoding: 'utf-8' }), 'feature-x\n');
});
