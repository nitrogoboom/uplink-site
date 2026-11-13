// Smoke check: is the deployed site up and still safe? Over plain HTTP, no browser. The deploy runs it before and
// after a version goes live and rolls back on a failure; also on launch day. Draft mode: Home only (owner, November
// 13, 2026). What it checks and each flag: docs/site-checks.md, "The smoke check".
//   npm run smoke -- https://uplink-site.johnoreilly.workers.dev        today: noindex expected
//   npm run smoke -- https://uplinkit.ca --launch                       after launch: indexable
//   npm run smoke -- https://uplinkit.ca --launch --old https://uplink-site.johnoreilly.workers.dev
//   npm run smoke -- http://localhost:8787                              the local build (npm run serve)
//   npm run smoke -- https://ab12cd34-uplink-site.johnoreilly.workers.dev --preview   (scripts/deploy.mjs, pre-deploy)
import { test } from '@playwright/test';
import { flag, option, positional } from './lib.mjs';

const UA = { 'User-Agent': 'uplink-smoke-test' }; // Cloudflare refuses a client with no user agent of its own (403)
// the security headers every page sends (public/_headers, docs/security.md)
const HEADERS = [
  'strict-transport-security',
  'content-security-policy',
  'x-content-type-options',
  'referrer-policy',
  'x-frame-options',
  'permissions-policy',
  'cross-origin-opener-policy',
  'cross-origin-resource-policy',
];

// [status, headers, body] without following redirects
async function get(url) {
  const r = await fetch(url, { headers: UA, redirect: 'manual', signal: AbortSignal.timeout(30_000) });
  return [r.status, r.headers, await r.text()];
}

test('smoke', async () => {
  test.setTimeout(120_000);
  if (!positional[0]) throw new Error('usage: npm run smoke -- ADDRESS [--launch] [--preview] [--old OLD_ADDRESS]');
  const base = positional[0].replace(/\/$/, '');
  const launch = flag('--launch');
  const preview = flag('--preview'); // a version's own address, before it takes traffic (scripts/deploy.mjs)
  const old = option('--old')?.replace(/\/$/, '');
  const host = new URL(base).host;
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname); // npm run serve
  const fails = [];
  const ok = (cond, what) => cond || fails.push(what);

  // 1. Home is up: a web page, with its security headers, and marked noindex while the site is a draft
  let [status, h] = await get(`${base}/`);
  ok(status === 200, `Home: ${status}`);
  ok((h.get('content-type') || '').includes('text/html'), `Home: content-type ${h.get('content-type')}`);
  const missing = HEADERS.filter((n) => !h.get(n));
  ok(!missing.length, `Home: missing ${missing.join(', ')}`);
  const noindex = (h.get('x-robots-tag') || '').includes('noindex');
  ok(noindex !== launch, `Home: noindex ${launch ? 'still on' : 'missing (draft)'}`);

  // 2. plain http goes to https (the Worker for the requests it sees; at launch, the zone for every request)
  if (!local && !preview) {
    for (const path of launch ? ['/api/report', '/'] : ['/api/report']) {
      [status, h] = await get(`http://${host}${path}`);
      ok(
        [301, 308].includes(status) && h.get('location') === `https://${host}${path}`,
        `http://${host}${path} redirect: ${status} to ${h.get('location')}`,
      );
    }
  }

  // 3. a made-up address gets the site's 404 page, with status 404
  let body;
  [status, , body] = await get(`${base}/no-such-page-smoke-test`);
  ok(status === 404, `made-up address: ${status}, not 404`);
  ok(body.includes('404') || body.toLowerCase().includes('not found'), 'made-up address: not the site 404 page');

  // 4. launch day only: the old address sends visitors to the new one
  if (old) {
    [status, h] = await get(`${old}/`);
    ok(
      [301, 308].includes(status) && h.get('location') === `${base}/`,
      `old address: ${status} to ${h.get('location')}, not ${base}/`,
    );
  }

  console.log(fails.length ? `${fails.length} failure(s)` : 'smoke test passed');
  if (fails.length) throw new Error(fails.map((f) => 'FAIL ' + f).join('\n'));
});
