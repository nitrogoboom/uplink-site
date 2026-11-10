// Wrangler's build step (build.command in wrangler.jsonc): runs before every wrangler dev, deploy and versions upload,
// and refuses a dist/ the build didn't finish. Astro copies public/_headers as it is, with {script-hashes} and
// {style-hashes} in the CSP (and {build} for X-Build); the build's last step, scripts/headers.mjs (called from
// astro.config.mjs), fills them in. A build that stops before or inside that step leaves dist/ half done: deployed, the
// CSP would block the site's own scripts and styles (review H11). It builds nothing and takes a moment: it only reads
// dist/_headers and dist/_redirects.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = process.env.DIST || 'dist'; // another folder only for the tests (scripts/test/)
const headers = join(DIST, '_headers');
const problems = [];
if (!existsSync(headers)) problems.push(`${headers} is missing`);
else {
  const text = readFileSync(headers, 'utf-8');
  const left = [...new Set(text.match(/\{(?:[a-z]+-hashes|build)\}/g) || [])];
  if (left.length) problems.push(`${headers} still has ${left.join(' and ')} in it`);
  if (!/# @early-hints[^\n]*\n\/[^\n]*\n {2}Link:/.test(text)) problems.push(`${headers} has no Early Hints rules`);
}
if (!existsSync(join(DIST, '_redirects'))) problems.push(`${join(DIST, '_redirects')} is missing`);
if (problems.length) {
  console.error(
    `${DIST}/ isn't a finished build (${problems.join('; ')}). The last build stopped part way or never ran: run npm run build again and fix what it reports (its last step, scripts/headers.mjs, fills in the CSP hashes).`,
  );
  process.exit(1);
}
