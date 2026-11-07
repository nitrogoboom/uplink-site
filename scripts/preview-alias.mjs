// The preview alias for a branch: the name in a pull request's preview address,
// https://ALIAS-uplink-site.johnoreilly.workers.dev (CI's preview job runs this; README "Deploys").
//   node scripts/preview-alias.mjs BRANCH      prints the alias
// Wrangler takes an alias only if it matches ^[a-z](?:[a-z0-9-]*[a-z0-9])?$, so: lowercase, each run of other
// characters becomes one dash, no dash at either end, and "b-" in front of a name that doesn't start with a letter.
// Kept to 30 characters: a longer name is cut to 23 and ends in a dash and 6 characters of the branch name's hash, so
// two long branches that start the same still get addresses of their own.
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const MAX = 30;
export const WRANGLER = /^[a-z](?:[a-z0-9-]*[a-z0-9])?$/;

export function previewAlias(branch) {
  let a = String(branch).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!/^[a-z]/.test(a)) a = `b-${a}`.replace(/-+$/, '');
  if (a.length > MAX) {
    const hash = createHash('sha256').update(String(branch)).digest('hex').slice(0, 6);
    a = `${a.slice(0, MAX - hash.length - 1).replace(/-+$/, '')}-${hash}`;
  }
  return a;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 3) {
    console.error('usage: node scripts/preview-alias.mjs BRANCH');
    process.exit(2);
  }
  console.log(previewAlias(process.argv[2]));
}
