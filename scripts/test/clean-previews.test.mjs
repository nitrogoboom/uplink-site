// What scripts/clean-previews.mjs deletes: only old previews; never a deployed version or an open pull request's
// newest preview.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aliasOf, pick } from '../clean-previews.mjs';

const DAY = 86400000;
const now = Date.parse('2026-11-10T00:00:00Z');
const v = (id, alias, daysAgo) => ({
  id,
  annotations: alias ? { 'workers/alias': alias, 'workers/triggered_by': 'version_upload' } : { 'workers/triggered_by': 'version_upload' },
  metadata: { created_on: new Date(now - daysAgo * DAY).toISOString() },
});
// newest first, as Cloudflare lists them
const versions = [
  v('fresh', 'open-pr', 1),
  v('open-new', 'open-pr-2', 5),
  v('open-old', 'open-pr-2', 6),
  v('merged-a', 'merged-pr', 7),
  v('deployed', 'merged-pr', 8),
  v('deploy', null, 9),
];

test('aliasOf matches the alias site.yml gives a branch', () => {
  assert.equal(aliasOf('claude/wizardly-curran-beef14'), 'claude-wizardly-curran-beef14');
  assert.equal(aliasOf('Feature/__Big  Change__'), 'feature-big-change');
  assert.equal(aliasOf('claude/a-very-long-branch-name-that-goes-on'), 'claude-a-very-long-branch-name');
});

test('old previews go; deployed, recent, unaliased and open newest stay', () => {
  const gone = pick(versions, new Set(['deployed']), new Set(['open-pr', 'open-pr-2']), now - 3 * DAY).map((g) => g.id);
  assert.deepEqual(gone, ['open-old', 'merged-a']);
});

test('ONLY_ALIAS narrows it to one branch', () => {
  const gone = pick(versions, new Set(), new Set(), now - 3 * DAY, 'merged-pr').map((g) => g.id);
  assert.deepEqual(gone, ['merged-a', 'deployed']);
});
