// Tests for worker/index.js (npm test): the /api/report endpoint, the 404 page it sends for /404 and missing
// addresses, its own headers and the http redirect, and the routing in wrangler.jsonc. The Worker is a plain module:
// each test hands it a Request and checks the answer and the one log line per report (console.log is caught for the
// test). How the routing really behaves is checked against wrangler dev by the smoke check (checks/smoke.spec.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../../worker/index.js';

const post = (type, body, path = '/api/report', origin = 'https://example.test') => new Request(`https://example.test${path}`, {
  method: 'POST', headers: { 'Content-Type': type, 'User-Agent': 'TestBrowser/1', ...(origin ? { Origin: origin } : {}) },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});
// runs the Worker and returns [response, logged reports]
const call = async (req, env) => {
  const lines = [];
  const log = console.log;
  console.log = (s) => lines.push(JSON.parse(s));
  try { return [await worker.fetch(req, env), lines]; } finally { console.log = log; }
};

test('a CSP report (Reporting API) is logged without the query string', async () => {
  const [res, lines] = await call(post('application/reports+json', [{ type: 'csp-violation', url: 'https://example.test/contact?email=a@b.c',
    body: { blockedURL: 'https://evil.test/x.js?id=1', effectiveDirective: 'script-src-elem', sourceFile: 'https://example.test/_astro/a.js', lineNumber: 3 } }]));
  assert.equal(res.status, 204);
  assert.deepEqual(lines[0].report, { kind: 'csp-violation', page: 'https://example.test/contact', blocked: 'https://evil.test/x.js',
    directive: 'script-src-elem', source: 'https://example.test/_astro/a.js', line: 3 });
  assert.equal(lines[0].ua, 'TestBrowser/1');
  assert.ok(!JSON.stringify(lines).includes('a@b.c'), 'the query, which can hold personal data, is gone');
});

test('an older report-uri CSP report is logged too', async () => {
  const [res, lines] = await call(post('application/csp-report', { 'csp-report': { 'document-uri': 'https://example.test/', 'blocked-uri': 'inline', 'violated-directive': 'style-src' } }));
  assert.equal(res.status, 204);
  assert.equal(lines[0].report.blocked, 'inline');
  assert.equal(lines[0].report.directive, 'style-src');
});

test('a script error from core.js is logged', async () => {
  const [res, lines] = await call(post('application/json', { kind: 'error', page: '/services', message: 'x is not defined', source: 'https://example.test/_astro/home.js?v=2', line: 10, column: 4 }));
  assert.equal(res.status, 204);
  assert.deepEqual(lines[0].report, { kind: 'script-error', page: '/services', message: 'x is not defined', source: 'https://example.test/_astro/home.js', line: 10, column: 4 });
});

test('refuses what it should: other methods, other paths, junk, oversize', async () => {
  assert.equal((await worker.fetch(new Request('https://example.test/api/report'))).status, 405);
  assert.equal((await worker.fetch(post('application/json', {}, '/api/other'))).status, 404);
  assert.equal((await call(post('application/json', 'not json')))[0].status, 400);
  assert.equal((await call(post('application/json', 'x'.repeat(9000))))[0].status, 413);
  const [res, lines] = await call(post('application/json', { kind: 'something-else' }));
  assert.equal(res.status, 204);
  assert.equal(lines.length, 0, 'an unknown shape logs nothing');
});

test('/404 by name answers 404 with the page', async () => {
  const env = { ASSETS: { fetch: async () => new Response('<h1>Not found</h1>', { status: 200, headers: { 'Content-Type': 'text/html' } }) } };
  const res = await worker.fetch(new Request('https://example.test/404'), env);
  assert.equal(res.status, 404);
  assert.equal(res.headers.get('Content-Type'), 'text/html');
  assert.equal(await res.text(), '<h1>Not found</h1>');
});

test('only this site counts: another Origin is refused, reports about other sites are dropped', async () => {
  const csp = { 'csp-report': { 'document-uri': 'https://other.test/', 'blocked-uri': 'inline', 'violated-directive': 'style-src' } };
  assert.equal((await call(post('application/csp-report', csp, '/api/report', 'https://evil.test')))[0].status, 403);
  const [res, lines] = await call(post('application/csp-report', csp, '/api/report', null));
  assert.equal(res.status, 204);
  assert.equal(lines.length, 0, 'a CSP report about another site is not logged');
  const error = { kind: 'error', page: '/', message: 'x' };
  assert.equal((await call(post('application/json', error, '/api/report', null)))[1].length, 0, 'a script error needs our own Origin');
});

test('WebKit: a CSP report with Origin null, in the Reporting API shape under application/csp-report, is logged', async () => {
  const webkit = { type: 'csp-violation', url: 'https://example.test/about',
    body: { documentURL: 'https://example.test/about', disposition: 'enforce', effectiveDirective: 'script-src-elem', blockedURL: 'https://evil.test/x.js', statusCode: 200, sample: '' } };
  const [res, lines] = await call(post('application/csp-report', webkit, '/api/report', 'null'));
  assert.equal(res.status, 204);
  assert.deepEqual(lines.map((l) => l.report), [{ kind: 'csp-violation', page: 'https://example.test/about', blocked: 'https://evil.test/x.js', directive: 'script-src-elem' }]);
  const other = { ...webkit, url: 'https://other.test/', body: { ...webkit.body, documentURL: 'https://other.test/' } };
  assert.equal((await call(post('application/csp-report', other, '/api/report', 'null')))[1].length, 0, 'still only about our own pages');
  const error = { kind: 'error', page: '/', message: 'x' };
  assert.equal((await call(post('application/json', error, '/api/report', 'null')))[1].length, 0, 'a script error still needs our own Origin');
});

test("reports about a browser extension's own scripts are dropped", async () => {
  const ext = (sourceFile, blockedURL = 'trusted-types-policy') => ({ type: 'trusted-types-policy', url: 'https://example.test/',
    body: { documentURL: 'https://example.test/', effectiveDirective: 'trusted-types', blockedURL, sourceFile, lineNumber: 1 } });
  const [res, lines] = await call(post('application/reports+json', [ext('chrome-extension'), ext('moz-extension://abc-123/content.js'),
    ext('https://example.test/_astro/core.js', 'safari-web-extension://abc/x.css'), ext('https://example.test/_astro/core.js')]));
  assert.equal(res.status, 204);
  assert.deepEqual(lines.map((l) => l.report.source), ['https://example.test/_astro/core.js'], "only the site's own report is left");
});

test("WebKit's refusal of its own <select> style is dropped, and doesn't use up the rate limit", async () => {
  const select = { type: 'csp-violation', url: 'https://example.test/about',
    body: { documentURL: 'https://example.test/about', effectiveDirective: 'style-src-attr', blockedURL: 'inline', statusCode: 200, sample: '' } };
  const env = { REPORTS: { limit: async () => ({ success: false }) } };
  const [res, lines] = await call(post('application/csp-report', select, '/api/report', 'null'), env);
  assert.equal(res.status, 204, 'nothing to log, so not counted');
  assert.equal(lines.length, 0);
  const ours = { ...select, body: { ...select.body, sourceFile: 'https://example.test/_astro/core.js', lineNumber: 9 } };
  assert.equal((await call(post('application/csp-report', ours, '/api/report', 'null')))[1].length, 1, 'a style attribute from one of our scripts is still logged');
});

test('past the rate limit: 429, nothing logged', async () => {
  const keys = [];
  const env = { REPORTS: { limit: async ({ key }) => { keys.push(key); return { success: false }; } } };
  const req = post('application/json', { kind: 'error', page: '/', message: 'x' });
  req.headers.set('CF-Connecting-IP', '203.0.113.9');
  const [res, lines] = await call(req, env);
  assert.equal(res.status, 429);
  assert.equal(lines.length, 0);
  assert.deepEqual(keys, ['203.0.113.9'], 'counted per visitor address');
});

test('http:// goes to https://, the same address; local http stays', async () => {
  const res = await worker.fetch(new Request('http://example.test/services?x=1'), {});
  assert.equal(res.status, 308);
  assert.equal(res.headers.get('Location'), 'https://example.test/services?x=1');
  const assets = { ASSETS: { fetch: async () => new Response('page') } };
  assert.equal(await (await worker.fetch(new Request('http://localhost:8787/services'), assets)).text(), 'page');
  assert.equal(await (await worker.fetch(new Request('https://example.test/services'), assets)).text(), 'page', 'pages go to the assets');
});

test('line and column are logged only as whole numbers', async () => {
  const [, lines] = await call(post('application/json', { kind: 'error', page: '/', message: 'm', line: 'x'.repeat(500), column: { a: 1 } }));
  assert.equal(lines[0].report.line, undefined);
  assert.equal(lines[0].report.column, undefined);
});

test('a body over the cap is refused even without a Content-Length', async () => {
  const big = new ReadableStream({ start(c) { for (let i = 0; i < 10; i++) c.enqueue(new TextEncoder().encode('x'.repeat(1000))); c.close(); } });
  const req = new Request('https://example.test/api/report', { method: 'POST', body: big, duplex: 'half',
    headers: { 'Content-Type': 'application/json', Origin: 'https://example.test' } });
  assert.equal((await worker.fetch(req)).status, 413);
});

// A report is whatever the sender posts. Every shape JSON can carry, in every field, must get an answer (204 or 400),
// never a crash: a throw in the Worker would be Cloudflare's error page, not ours (review B0, B11).
const bad = { toString: 1 };   // String() on this throws: toString is not a function
const odd = [null, 1, 'x', true, [], [null], bad, { toString: null, valueOf: null }];
const FUZZ = [
  ...['application/reports+json', 'application/csp-report', 'application/json'].flatMap((type) => [
    ...odd.map((v) => [type, v]),
    ...odd.map((v) => [type, [v]]),
    ...odd.map((v) => [type, [v, { type: 'csp-violation', url: 'https://example.test/' }]]),
  ]),
  ...odd.flatMap((v) => [
    ['application/reports+json', [{ type: v, url: 'https://example.test/', body: { effectiveDirective: 'script-src' } }]],
    ['application/reports+json', [{ type: 'csp-violation', url: v }]],
    ['application/reports+json', [{ type: 'csp-violation', url: 'https://example.test/', body: v }]],
    ['application/reports+json', [{ type: 'csp-violation', body: { documentURL: v, blockedURL: v, effectiveDirective: v, sourceFile: v, lineNumber: v } }]],
    ['application/csp-report', { 'csp-report': v }],
    ['application/csp-report', { 'csp-report': { 'document-uri': v, 'blocked-uri': v, 'violated-directive': v, 'source-file': v } }],
    ['application/csp-report', { 'csp-report': { 'document-uri': 'https://example.test/', 'blocked-uri': v, 'effective-directive': v } }],
    ['application/csp-report', { type: v, url: v, body: { documentURL: v } }],
    ['application/json', { kind: 'error', page: v, message: v, source: v, line: v, column: v }],
    ['application/json', { kind: 'error', page: '/', message: v }],
  ]),
];

test('odd reports never crash the Worker: each gets 204 or 400, and logs only strings and numbers', async () => {
  const crashes = [];
  for (const [type, body] of FUZZ) {
    const what = `${type} ${JSON.stringify(body)}`;
    try {
      const [res, lines] = await call(post(type, body));
      if (![204, 400].includes(res.status)) crashes.push(`${what}: ${res.status}`);
      for (const { report } of lines) {
        for (const [k, v] of Object.entries(report)) if (!['string', 'number'].includes(typeof v)) crashes.push(`${what}: ${k} logged as ${typeof v}`);
      }
    } catch (e) {
      crashes.push(`${what}: threw ${e.message}`);
    }
  }
  assert.deepEqual(crashes, [], `${crashes.length} of ${FUZZ.length} cases`);
});

test('[null], [1] and ["x"] as a Reporting API post: nothing to log, no crash', async () => {
  for (const body of [[null], [1], ['x']]) {
    const [res, lines] = await call(post('application/reports+json', body));
    assert.equal(res.status, 204, JSON.stringify(body));
    assert.equal(lines.length, 0);
  }
});

// like workerd's: a request whose body has been read can't be passed on ("Cannot reconstruct a Request with a used body")
const assets = (first = null) => {
  let calls = 0;
  return {
    fetch: async (req) => {
      if (req.bodyUsed) throw new TypeError('Cannot reconstruct a Request with a used body');
      if (calls++ === 0 && first) throw first;
      return new Response('from the assets', { status: 200 });
    },
  };
};
const quiet = async (fn) => {
  const err = console.error;
  console.error = () => {};
  try { return await fn(); } finally { console.error = err; }
};

test('an error after a report was read answers 503, not stored, instead of passing a used body on', async () => {
  const env = { REPORTS: { limit: async () => { throw new Error('rate limit binding down'); } }, ASSETS: assets() };
  const [res] = await quiet(() => call(post('application/json', { kind: 'error', page: '/', message: 'x' }), env));
  assert.equal(res.status, 503);
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
});

test('any other error inside the Worker falls back to the static assets', async () => {
  const res = await quiet(() => worker.fetch(new Request('https://example.test/404'), { ASSETS: assets(new Error('first try fails')) }));
  assert.equal(res.status, 200);
  assert.equal(await res.text(), 'from the assets');
});

// Like the static assets (wrangler.jsonc: not_found_handling "none"): a file answers 200 with an ETag, or 304 to a
// matching If-None-Match; an address with no file answers a bare 404 with the headers of the _headers rules its path
// matches. Each request is kept, to see what the Worker asked for.
const PAGE_CSP = "default-src 'self'";
const RULES = [
  [/\.md$/, { 'Content-Type': 'text/markdown; charset=utf-8' }],
  [/^\/_astro\//, { 'Cache-Control': 'public, max-age=31536000, immutable' }],
  [/^\/assets\/img\//, { 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'" }],
];
const site = (files = { '/404': '<h1>Not found</h1>', '/services': '<h1>Services</h1>' }) => {
  const asked = [];
  return {
    asked,
    fetch: async (req) => {
      asked.push(req);
      const path = new URL(req.url).pathname;
      const headers = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=0, must-revalidate', 'Content-Security-Policy': PAGE_CSP };
      for (const [re, h] of RULES) if (re.test(path)) Object.assign(headers, h);
      if (!(path in files)) return new Response(null, { status: 404, headers });
      const etag = `"${path.length}"`;
      if (req.headers.get('If-None-Match') === etag) return new Response(null, { status: 304, headers: { ...headers, ETag: etag } });
      return new Response(req.method === 'HEAD' ? null : files[path], { status: 200,
        headers: { ...headers, ETag: etag, 'Last-Modified': 'Sat, 07 Nov 2026 00:00:00 GMT' } });
    },
  };
};

test('B3: /404 asked again with If-None-Match or If-Modified-Since still gets the whole page, with nothing to revalidate', async () => {
  const ASSETS = site();
  const req = new Request('https://example.test/404', { headers: { 'If-None-Match': '"4"', 'If-Modified-Since': 'Sun, 08 Nov 2026 00:00:00 GMT' } });
  const res = await worker.fetch(req, { ASSETS });
  assert.equal(res.status, 404);
  assert.equal(await res.text(), '<h1>Not found</h1>', 'not an empty 404 (the 304 the file would give)');
  assert.equal(res.headers.get('ETag'), null);
  assert.equal(res.headers.get('Last-Modified'), null);
  assert.ok(ASSETS.asked.every((r) => !r.headers.has('If-None-Match') && !r.headers.has('If-Modified-Since')), 'the page is asked for without them');
});

test("B8: an address with no file gets the 404 page with /404's headers, not those of the rules its path matches", async () => {
  for (const path of ['/nope', '/nope.md', '/_astro/nope.js', '/assets/img/nope.svg']) {
    const res = await worker.fetch(new Request(`https://example.test${path}`, { headers: { 'If-None-Match': '"4"' } }), { ASSETS: site() });
    assert.equal(res.status, 404, path);
    assert.equal(res.headers.get('Content-Type'), 'text/html; charset=utf-8', `${path}: HTML, not the path's type`);
    assert.equal(res.headers.get('Cache-Control'), 'public, max-age=0, must-revalidate', `${path}: not cached for a year`);
    assert.equal(res.headers.get('Content-Security-Policy'), PAGE_CSP, `${path}: the page's CSP, not the drawings'`);
    assert.equal(await res.text(), '<h1>Not found</h1>', `${path}: the 404 page`);
  }
  const head = await worker.fetch(new Request('https://example.test/nope.md', { method: 'HEAD' }), { ASSETS: site() });
  assert.equal(head.status, 404);
  assert.equal(head.headers.get('Content-Type'), 'text/html; charset=utf-8');
  const found = await worker.fetch(new Request('https://example.test/services'), { ASSETS: site() });
  assert.equal(found.status, 200, 'a file that exists is passed on as it is (with run_worker_first true, launch option B)');
  assert.equal(await found.text(), '<h1>Services</h1>');
});

test('H7: every answer the Worker writes itself is nosniff, no-store and loads nothing; POST /404 is 405', async () => {
  const env = { ASSETS: site(), REPORTS: { limit: async () => ({ success: false }) } };
  const error = { kind: 'error', page: '/', message: 'x' };
  const cases = [
    [new Request('https://example.test/api/report'), 405],
    [post('application/json', {}, '/api/other'), 404],
    [post('application/json', 'not json'), 400],
    [post('application/json', 'x'.repeat(9000)), 413],
    [post('application/json', error, '/api/report', 'https://evil.test'), 403],
    [post('application/json', { kind: 'other' }), 204],
    [post('application/json', error), 429],
    [new Request('http://example.test/services'), 308],
    [new Request('https://example.test/404', { method: 'POST' }), 405],
    [new Request('https://example.test/nope', { method: 'DELETE' }), 405],
  ];
  for (const [req, status] of cases) {
    const what = `${req.method} ${req.url}`;
    const res = await worker.fetch(req, env);
    assert.equal(res.status, status, what);
    assert.equal(res.headers.get('X-Content-Type-Options'), 'nosniff', what);
    assert.equal(res.headers.get('Cache-Control'), 'no-store', what);
    assert.equal(res.headers.get('Content-Security-Policy'), "default-src 'none'; frame-ancestors 'none'", what);
  }
  const res = await worker.fetch(new Request('https://example.test/404', { method: 'POST' }), env);
  assert.equal(res.headers.get('Allow'), 'GET, HEAD');
  const [down] = await quiet(() => call(post('application/json', error), { REPORTS: { limit: async () => { throw new Error('down'); } }, ASSETS: assets() }));
  assert.equal(down.status, 503);
  assert.equal(down.headers.get('X-Content-Type-Options'), 'nosniff', 'the 503 too');
});

test('H13: the Content-Type of a report is read whatever its case', async () => {
  const report = [{ type: 'csp-violation', url: 'https://example.test/', body: { effectiveDirective: 'script-src', blockedURL: 'inline' } }];
  const [res, lines] = await call(post('Application/Reports+JSON', report));
  assert.equal(res.status, 204);
  assert.equal(lines.length, 1);
  const csp = { 'csp-report': { 'document-uri': 'https://example.test/', 'blocked-uri': 'inline', 'violated-directive': 'style-src' } };
  assert.equal((await call(post('APPLICATION/CSP-REPORT', csp)))[1].length, 1);
});

test('H13: a post with more than 20 reports has its first 20 logged, as the comment says', async () => {
  const many = Array.from({ length: 25 }, (_, i) => ({ type: 'csp-violation', url: `https://example.test/p${i}`, body: { effectiveDirective: 'script-src' } }));
  const [res, lines] = await call(post('application/reports+json', many));
  assert.equal(res.status, 204);
  assert.deepEqual(lines.map((l) => l.report.page), many.slice(0, 20).map((r) => r.url));
});

test('H13: a dev server on this machine or the local network stays on http; anywhere else goes to https', async () => {
  const env = { ASSETS: site() };
  for (const host of ['localhost:8787', 'uplink.localhost:8787', '127.0.0.1:8787', '[::1]:8787', '0.0.0.0:8787', '192.168.1.20:8787',
    '10.0.0.5:8787', '172.20.1.2:8787', '169.254.3.4', 'johns-mac.local:8787', '[fd12:3456::1]:8787', '[fe80::1]:8787']) {
    assert.equal((await worker.fetch(new Request(`http://${host}/services`), env)).status, 200, host);
  }
  for (const host of ['example.test', '172.32.0.1', '8.8.8.8', 'localhost.example.test', '[2001:db8::1]']) {
    const res = await worker.fetch(new Request(`http://${host}/services`), env);
    assert.equal(res.status, 308, host);
    assert.equal(res.headers.get('Location'), `https://${host}/services`);
  }
});

// wrangler.jsonc as wrangler itself reads it
const config = async () => (await import('wrangler')).unstable_readConfig({ config: 'wrangler.jsonc' });

test('H1, H2: the Worker runs only for /api/*, /404 and addresses with no file; no invocation logs, console.log kept', async () => {
  const { assets, observability } = await config();
  assert.deepEqual(assets.run_worker_first, ['/api/*', '/404']);
  assert.equal(assets.not_found_handling, 'none', 'a miss must reach the Worker ("404-page" would answer it from the assets, review B8)');
  assert.equal(observability.enabled, true, 'the report lines are console.log, kept only with observability on');
  assert.equal(observability.logs?.invocation_logs, false);
});
