// Tests for worker/index.js, the /api/report endpoint (npm test). The Worker is a plain module: each test hands it
// a Request and checks the answer and the one log line per report (console.log is caught for the test).
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
    body: { documentURL: 'https://example.test/about', disposition: 'enforce', effectiveDirective: 'style-src-attr', blockedURL: 'inline', statusCode: 200, sample: '' } };
  const [res, lines] = await call(post('application/csp-report', webkit, '/api/report', 'null'));
  assert.equal(res.status, 204);
  assert.deepEqual(lines.map((l) => l.report), [{ kind: 'csp-violation', page: 'https://example.test/about', blocked: 'inline', directive: 'style-src-attr' }]);
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
