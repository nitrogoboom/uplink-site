// Tests for worker/index.js, the /api/report endpoint (npm test). The Worker is a plain module: each test hands it
// a Request and checks the answer and the one log line per report (console.log is caught for the test).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../../worker/index.js';

const post = (type, body, path = '/api/report') => new Request(`https://example.test${path}`, {
  method: 'POST', headers: { 'Content-Type': type, 'User-Agent': 'TestBrowser/1' }, body: typeof body === 'string' ? body : JSON.stringify(body),
});
// runs the Worker and returns [response, logged reports]
const call = async (req) => {
  const lines = [];
  const log = console.log;
  console.log = (s) => lines.push(JSON.parse(s));
  try { return [await worker.fetch(req), lines]; } finally { console.log = log; }
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
