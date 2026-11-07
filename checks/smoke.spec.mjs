// Smoke test: the live site answers the way it should. A few seconds, plain HTTP, no browser. Run it straight after a
// deploy, and on launch day after the domain switch (docs/launch-runbook.md).
//   npm run smoke -- https://uplink-site.johnoreilly.workers.dev        today: noindex expected
//   npm run smoke -- https://uplinkit.ca --launch                       after launch: indexable, sitemap named
//   npm run smoke -- https://uplinkit.ca --launch --old https://uplink-site.johnoreilly.workers.dev
//                                                                       and the old address redirects here
// Checks:
//   every page in sitemap.xml answers 200 over https, as text/html, with the security headers
//   plain http:// redirects (301/308) to the same https:// address
//   a made-up address answers 404 with the site's 404 page; /404 itself answers 404
//   /api/report refuses a GET (405); robots.txt, llms.txt and a .md copy answer
//   sitemap.xml names this address (not another host)
//   noindex: present while it's a test build; with --launch, gone, and robots.txt names the sitemap
//   --old: the old address redirects to the same path here
// Fails on any of them. Cloudflare refuses a client with no user agent of its own (403), so requests name one.
import { test } from '@playwright/test';
import { flag, option, positional } from './lib.mjs';

const UA = { 'User-Agent': 'uplink-smoke-test' };
const HEADERS = ['strict-transport-security', 'content-security-policy', 'x-content-type-options', 'referrer-policy', 'x-frame-options', 'permissions-policy', 'cross-origin-opener-policy', 'cross-origin-resource-policy', 'x-permitted-cross-domain-policies'];

// [status, headers, body] without following redirects
async function get(url, method = 'GET') {
  const r = await fetch(url, { method, headers: UA, redirect: 'manual', signal: AbortSignal.timeout(30_000) });
  return [r.status, r.headers, await r.text()];
}

test('smoke', async () => {
  test.setTimeout(300_000);
  if (!positional[0]) throw new Error('usage: npm run smoke -- ADDRESS [--launch] [--old OLD_ADDRESS]');
  const base = positional[0].replace(/\/$/, '');
  const launch = flag('--launch');
  const old = option('--old')?.replace(/\/$/, '');
  const host = new URL(base).host;
  const fails = [];
  const ok = (cond, what) => cond || fails.push(what);

  let [status, h, body] = await get(`${base}/sitemap.xml`);
  ok(status === 200, `sitemap.xml: ${status}`);
  const urls = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  ok(urls.length > 0, 'sitemap.xml lists no pages');
  const other = urls.filter((u) => new URL(u).host !== host);
  ok(!other.length, `sitemap.xml names another host: ${other[0] || ''}`);

  for (const u of urls) {
    const path = new URL(u).pathname;
    [status, h] = await get(base + path);
    if (status !== 200) {
      fails.push(`${path}: ${status}`);
      continue;
    }
    ok((h.get('content-type') || '').includes('text/html'), `${path}: content-type ${h.get('content-type')}`);
    const missing = HEADERS.filter((n) => !h.get(n));
    ok(!missing.length, `${path}: missing ${missing.join(', ')}`);
    const noindex = (h.get('x-robots-tag') || '').includes('noindex');
    ok(noindex !== launch, `${path}: noindex ${launch ? 'still on' : 'missing (test build)'}`);
  }
  console.log(`${urls.length} pages checked`);

  [status, h] = await get(`http://${host}/services`);
  ok([301, 308].includes(status) && h.get('location') === `https://${host}/services`, `http:// redirect: ${status} to ${h.get('location')}`);
  [status, , body] = await get(`${base}/no-such-page-smoke-test`);
  ok(status === 404, `made-up address: ${status}, not 404`);
  ok(body.includes('404') || body.toLowerCase().includes('not found'), 'made-up address: not the site 404 page');
  ok((await get(`${base}/404`))[0] === 404, '/404 does not answer 404');
  ok((await get(`${base}/api/report`))[0] === 405, '/api/report GET is not 405');
  for (const path of ['/robots.txt', '/llms.txt', '/services.md']) ok((await get(base + path))[0] === 200, `${path} does not answer 200`);
  const robots = (await get(`${base}/robots.txt`))[2];
  if (launch) ok(robots.includes(`Sitemap: ${base}/sitemap.xml`), 'robots.txt has no Sitemap line for this address');

  if (old) {
    [status, h] = await get(`${old}/services`);
    ok([301, 308].includes(status) && h.get('location') === `${base}/services`, `old address: ${status} to ${h.get('location')}, not ${base}/services`);
  }

  console.log(fails.length ? `${fails.length} failure(s)` : 'smoke test passed');
  if (fails.length) throw new Error(fails.map((f) => 'FAIL ' + f).join('\n'));
});
