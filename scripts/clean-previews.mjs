// Deletes old pull request previews from Cloudflare, so they don't pile up. Each push to a pull request uploads a
// preview version of the Worker (site.yml, `wrangler versions upload --preview-alias BRANCH`), and Cloudflare keeps
// every one, with its own address, until deleted. Git is never touched: no branch, pull request or commit.
// Deleted: preview versions (ones uploaded with a branch alias) older than KEEP_DAYS, except
//   - any version that is or was deployed (the live site and every rollback target), and
//   - the newest preview of a branch with an open pull request (its preview address keeps working).
// Run by .github/workflows/clean-previews.yml (every 3 days, and by hand). Dry run unless DRY_RUN=false.
// Env: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID (an API token: Cloudflare refuses the delete with a wrangler
// login), OPEN_BRANCHES (file: one open pull request branch a line), KEEP_DAYS (3), ONLY_ALIAS (one alias only),
// DRY_RUN ('false' to delete), GITHUB_STEP_SUMMARY (optional: the list goes there too).
import { appendFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const WORKER = 'uplink-site';

// the alias site.yml gives a branch: lowercased, other characters to '-', repeats and end dashes dropped, 30 long
export const aliasOf = (branch) =>
  branch
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30)
    .replace(/-$/, '');

// what to delete, from the versions (newest first, as Cloudflare lists them), the deployed version ids, the aliases
// of open pull requests and the cut-off time (ms). Pure, so the test can run it.
export function pick(versions, deployed, open, cutoff, onlyAlias = '') {
  const seen = new Set();
  const out = [];
  for (const v of versions) {
    const alias = v.annotations?.['workers/alias'];
    if (!alias) continue; // not a preview: a deploy, or an upload from before previews had aliases
    const newest = !seen.has(alias);
    seen.add(alias);
    if (onlyAlias && alias !== onlyAlias) continue;
    if (deployed.has(v.id)) continue;
    if (newest && open.has(alias)) continue; // an open pull request's preview address
    if (new Date(v.metadata.created_on).getTime() > cutoff) continue;
    out.push({ id: v.id, alias, created: v.metadata.created_on.slice(0, 10) });
  }
  return out;
}

async function main() {
  const { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: account } = process.env;
  const keepDays = Number(process.env.KEEP_DAYS || 3);
  const only = (process.env.ONLY_ALIAS || '').trim();
  const dry = process.env.DRY_RUN !== 'false';
  if (!token || !account) {
    console.log('No Cloudflare secrets: nothing to clean (skipped).');
    return;
  }
  const api = async (method, path) => {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${WORKER}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
    });
    return { status: res.status, body: await res.json().catch(() => ({})) };
  };

  const versions = [];
  for (let page = 1; ; page++) {
    const { status, body } = await api('GET', `/versions?per_page=100&page=${page}`);
    if (status !== 200) throw new Error(`listing versions: ${status} ${JSON.stringify(body.errors)}`);
    const items = body.result.items ?? body.result;
    versions.push(...items);
    if (items.length < 100) break;
  }
  const dep = await api('GET', '/deployments');
  if (dep.status !== 200) throw new Error(`listing deployments: ${dep.status} ${JSON.stringify(dep.body.errors)}`);
  const deployed = new Set(dep.body.result.deployments.flatMap((d) => d.versions.map((v) => v.version_id)));
  const branches = process.env.OPEN_BRANCHES ? readFileSync(process.env.OPEN_BRANCHES, 'utf8').split('\n').filter(Boolean) : [];
  const open = new Set(branches.map(aliasOf));
  const gone = pick(versions, deployed, open, Date.now() - keepDays * 86400000, only);

  const previews = versions.filter((v) => v.annotations?.['workers/alias']).length;
  const lines = [
    `${versions.length} versions on ${WORKER}, ${previews} of them previews. Kept: ${deployed.size} deployed, and the newest preview of ${open.size} open pull request(s).`,
    `${dry ? 'Dry run: would delete' : 'Deleting'} ${gone.length} preview(s) older than ${keepDays} days${only ? ` (alias ${only} only)` : ''}.`,
  ];
  let failed = 0;
  for (const g of gone) {
    let result = 'would delete';
    if (!dry) {
      const { status, body } = await api('DELETE', `/versions/${g.id}`);
      result = status === 200 ? 'deleted' : `failed: ${status} ${JSON.stringify(body.errors)}`;
      if (status !== 200) failed++;
    }
    lines.push(`- ${g.created} ${g.alias} ${g.id.slice(0, 8)}: ${result}`);
  }
  console.log(lines.join('\n'));
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
  if (failed) throw new Error(`${failed} delete(s) failed`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
