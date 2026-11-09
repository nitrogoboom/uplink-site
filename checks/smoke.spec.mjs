// Smoke check: a deployed site answers the way it should, over plain HTTP with no browser. Run it after a deploy and
// on launch day (docs/release.md, "Launch day"). What it checks and each flag: README, "Live-site checks".
//   npm run smoke -- https://uplink-site.johnoreilly.workers.dev        today: noindex expected
//   npm run smoke -- https://uplinkit.ca --launch                       after launch: indexable, sitemap named
//   npm run smoke -- https://uplinkit.ca --launch --old https://uplink-site.johnoreilly.workers.dev
//   npm run smoke -- http://localhost:8787                              the local build (npm run serve): CI runs this
//   npm run smoke -- https://ab12cd34-uplink-site.johnoreilly.workers.dev --preview   (scripts/deploy.mjs, pre-deploy)
import { test } from '@playwright/test';
import { flag, option, positional } from './lib.mjs';

const UA = { 'User-Agent': 'uplink-smoke-test' }; // Cloudflare refuses a client with no user agent of its own (403)
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
const DROPPED = ['x-permitted-cross-domain-policies']; // Flash and Acrobat were all that read it (review H9)

// [status, headers, body] without following redirects
async function get(url, method = 'GET', headers = {}) {
  const r = await fetch(url, {
    method,
    headers: { ...UA, ...headers },
    redirect: 'manual',
    signal: AbortSignal.timeout(30_000),
  });
  return [r.status, r.headers, await r.text()];
}

test('smoke', async () => {
  test.setTimeout(300_000);
  if (!positional[0]) throw new Error('usage: npm run smoke -- ADDRESS [--launch] [--preview] [--old OLD_ADDRESS]');
  const base = positional[0].replace(/\/$/, '');
  const launch = flag('--launch');
  const preview = flag('--preview'); // a version's own address: the build names the live one (scripts/deploy.mjs)
  const old = option('--old')?.replace(/\/$/, '');
  const host = new URL(base).host;
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname); // npm run serve, as in CI
  const fails = [];
  const ok = (cond, what) => cond || fails.push(what);

  let [status, h, body] = await get(`${base}/sitemap.xml`);
  ok(status === 200, `sitemap.xml: ${status}`);
  const urls = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  ok(urls.length > 0, 'sitemap.xml lists no pages');
  // the address the build names (SITE_URL): in the sitemap, robots.txt and the canonicals. A deployed site's own,
  // except a preview's, which names the live one
  const site = urls.length ? new URL(urls[0]).origin : base;
  const other = urls.filter((u) => new URL(u).host !== (preview ? new URL(site).host : host));
  ok(local || !other.length, `sitemap.xml names another host: ${other[0] || ''}`);

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
    const extra = DROPPED.filter((n) => h.has(n));
    ok(!extra.length, `${path}: still sends ${extra.join(', ')}`);
    const noindex = (h.get('x-robots-tag') || '').includes('noindex');
    ok(noindex !== launch, `${path}: noindex ${launch ? 'still on' : 'missing (test build)'}`);
  }
  console.log(`${urls.length} pages checked`);

  const pageCsp = h.get('content-security-policy'); // the last page's
  const speculation = h.get('speculation-rules');
  if (!local && !preview) {
    for (const path of launch ? ['/api/report', '/services'] : ['/api/report']) {
      [status, h] = await get(`http://${host}${path}`);
      ok(
        [301, 308].includes(status) && h.get('location') === `https://${host}${path}`,
        `http://${host}${path} redirect: ${status} to ${h.get('location')}`,
      );
    }
  }
  const page404 = (b) => b.includes('404') || b.toLowerCase().includes('not found');
  [status, , body] = await get(`${base}/no-such-page-smoke-test`);
  ok(status === 404, `made-up address: ${status}, not 404`);
  ok(page404(body), 'made-up address: not the site 404 page');
  [status, h] = await get(`${base}/404`);
  ok(status === 404, '/404 does not answer 404');
  // asked again the way a browser revalidates (review B3): with the validators it was given, or made-up ones
  const again = {
    'If-None-Match': h.get('etag') || '"smoke"',
    'If-Modified-Since': h.get('last-modified') || new Date().toUTCString(),
  };
  for (const path of ['/404', '/no-such-page-smoke-test']) {
    [status, , body] = await get(base + path, 'GET', again);
    ok(
      status === 404 && page404(body),
      `${path} asked again (If-None-Match): ${status}, ${body.length} bytes, not the 404 page`,
    );
  }
  ok((await get(`${base}/404`, 'POST'))[0] === 405, '/404 POST is not 405');
  // a missing file under a _headers path rule (review B8): the 404 page, as a page
  for (const path of [
    '/no-such.md',
    '/no-such.txt',
    '/_astro/no-such.js',
    '/assets/fonts/no-such.woff2',
    '/assets/img/no-such.svg',
  ]) {
    [status, h, body] = await get(base + path);
    const type = h.get('content-type') || '',
      cache = h.get('cache-control') || '',
      csp = h.get('content-security-policy');
    ok(status === 404 && page404(body), `${path}: ${status}, not the 404 page`);
    ok(type.startsWith('text/html'), `${path}: 404 page sent as ${type}`);
    ok(!/immutable|max-age=[1-9]/.test(cache), `${path}: 404 cached (${cache})`);
    ok(csp === pageCsp, `${path}: 404 page under another CSP (${(csp || 'none').slice(0, 40)}…)`);
  }
  // the Worker's own answers (review H7)
  for (const [path, want] of [
    ['/api/report', 405],
    ['/api/no-such', 404],
  ]) {
    [status, h] = await get(base + path);
    ok(status === want, `${path}: ${status}, not ${want}`);
    const missing = ['x-content-type-options', 'content-security-policy'].filter((n) => !h.get(n));
    if (h.get('cache-control') !== 'no-store') missing.push('Cache-Control: no-store');
    ok(!missing.length, `${path}: missing ${missing.join(', ')}`);
  }
  // the other spellings of an address (review H13)
  for (const [from, to] of [
    ['/index', '/'],
    ['/index.html', '/'],
    ['/services/', '/services'],
    ['/services.html', '/services'],
    ['/services/index.html', '/services'],
    ['/services/index', '/services'],
  ]) {
    [status, h] = await get(base + from);
    ok(status === 308 && h.get('location') === to, `${from}: ${status} to ${h.get('location')}, not 308 to ${to}`);
  }
  // Speculation Rules (review L12): the header names a file of prefetch rules for our own pages only
  const rulesPath = speculation?.match(/^"([^"]+)"$/)?.[1];
  ok(rulesPath, `pages: Speculation-Rules header ${speculation ?? 'missing'}, not a quoted address`);
  if (rulesPath) {
    [status, h, body] = await get(new URL(rulesPath, base).href);
    ok(
      status === 200 && h.get('content-type') === 'application/speculationrules+json',
      `${rulesPath}: ${status} as ${h.get('content-type')}`,
    );
    let rules;
    try {
      rules = JSON.parse(body);
    } catch {
      ok(false, `${rulesPath}: not JSON`);
    }
    const text = JSON.stringify(rules?.prefetch || []);
    ok(
      rules?.prefetch?.length && rules.prefetch.every((r) => r.eagerness === 'moderate'),
      `${rulesPath}: no moderate prefetch rules`,
    );
    for (const left of ['/api/*', '/*.md'])
      ok(text.includes(`{"not":{"href_matches":"${left}"}}`), `${rulesPath}: ${left} not left out`);
  }
  ok((await get(`${base}/api/report`))[0] === 405, '/api/report GET is not 405');
  for (const path of ['/robots.txt', '/llms.txt', '/services.md'])
    ok((await get(base + path))[0] === 200, `${path} does not answer 200`);
  // the Markdown copies (review M4): out of search results for good, not only while it's a test build, and each
  // names its page. The canonical is the build's address (site), as in the page's own <link rel="canonical">
  for (const [copy, page] of [
    ['/services.md', '/services'],
    ['/index.md', '/'],
  ]) {
    [status, h] = await get(base + copy);
    ok(status === 200, `${copy}: ${status}`);
    ok(
      (h.get('x-robots-tag') || '').includes('noindex'),
      `${copy}: no X-Robots-Tag: noindex (${h.get('x-robots-tag')})`,
    );
    const want = `<${site}${page}>; rel="canonical"`;
    ok((h.get('link') || '').split(/,\s*(?=<)/).includes(want), `${copy}: Link ${h.get('link')}, not ${want}`);
  }
  const robots = (await get(`${base}/robots.txt`))[2];
  if (launch) ok(robots.includes(`Sitemap: ${site}/sitemap.xml`), `robots.txt has no Sitemap line for ${site}`);

  if (old) {
    [status, h] = await get(`${old}/services`);
    ok(
      [301, 308].includes(status) && h.get('location') === `${base}/services`,
      `old address: ${status} to ${h.get('location')}, not ${base}/services`,
    );
  }

  console.log(fails.length ? `${fails.length} failure(s)` : 'smoke test passed');
  if (fails.length) throw new Error(fails.map((f) => 'FAIL ' + f).join('\n'));
});
