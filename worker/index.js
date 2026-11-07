// The site's one Worker script. Everything else is the built site in dist/, served as static assets. wrangler.jsonc
// sends every request here first (run_worker_first: true), so plain http:// can be sent to https:// (workers.dev is
// Cloudflare's zone, not ours, so its "Always Use HTTPS" setting isn't ours to turn on). Anything that isn't /api/*
// or /404 goes on to the assets (env.ASSETS), with _headers, _redirects and the 404 page as before.
// At launch, on our own zone: turn on Always Use HTTPS, and run_worker_first can go back to ["/api/*", "/404"].
//
// POST /api/report: problems real visitors' browsers hit, so we hear about them.
//   CSP blocks       the browser posts these itself (public/_headers: report-to csp, report-uri for older browsers)
//   script errors    core.js posts uncaught errors and rejected promises (navigator.sendBeacon)
// Each report becomes one line in the Workers logs (Cloudflare dashboard > Workers > uplink-site > Logs; observability
// is on in wrangler.jsonc). Nothing else is kept. What a line holds, and what it never holds, is in the privacy page
// (src/data/privacy.md): the page and script addresses without their ?query, the message, the user agent (cut to 200 characters). This
// code never logs the IP address or form contents, though Cloudflare's own record of each Worker run carries the
// request's headers, IP included (kept 3 days on the free plan, 7 on paid). A body over 8 KB, or more than 20
// reports in one post, is dropped.
// Only this site's reports count: a post whose Origin header is another site's gets 403, a script error needs our own
// Origin (sendBeacon always sends one), and a CSP report about a page on another site is dropped. WebKit (Safari)
// posts its CSP reports with "Origin: null", so null is let through: a report about another page is still dropped,
// and a script error still needs our own Origin. Reports about a browser extension's own scripts (Chrome strips their
// address to "chrome-extension") are dropped too: they aren't the site's, and they'd bury the ones that are. So is
// WebKit's refusal of its own style for each <select> (style-src-attr, "inline", no script named: it does it on a bare
// page with nothing of ours, checked November 6, 2026), two on every page. Each visitor address may have 30 posts a
// minute logged (the REPORTS rate limit in wrangler.jsonc, counted by Cloudflare and not kept); past that, 429. A post
// with nothing to log isn't counted. Without the binding (the tests) there is no limit.
//
// PR #38 (open, paused until a sending domain exists) adds the forms' routes (/api/contact, /api/book, /api/newsletter) to this same file: keep both.

const MAX_BODY = 8 * 1024;
const MAX_REPORTS = 20;
const EXTENSION = /^(chrome|moz|safari-web)-extension$/;   // an extension's address, as bare() leaves it
const cut = (v, n = 300) => (v == null ? undefined : String(v).slice(0, n));
// a line or column number, or nothing (a report is the sender's word: never log what it sends as is)
const num = (v) => (Number.isInteger(v) && v >= 0 ? v : undefined);
// an address without its ?query or #fragment (a query can carry personal data; the path is what we need)
const bare = (u) => {
  if (!u) return undefined;
  try {
    const url = new URL(u);
    if (url.origin === 'null') return cut(url.protocol.slice(0, -1));   // data:, an extension's own address: the scheme only
    return cut(url.origin + url.pathname);
  } catch {
    return cut(String(u).split(/[?#]/)[0]);   // 'inline', 'eval' and the like
  }
};

// one Reporting API report, { type, url, body }, as a record
const fromReport = (r) => ({
  kind: cut(r.type, 40),
  page: bare(r.url || r.body?.documentURL),
  blocked: bare(r.body?.blockedURL),
  directive: cut(r.body?.effectiveDirective, 60),
  source: bare(r.body?.sourceFile),
  line: num(r.body?.lineNumber),
});
// the shapes a report arrives in, as one flat record
function records(type, body) {
  if (type.includes('application/reports+json')) {   // Reporting API: an array of { type, url, body }
    return (Array.isArray(body) ? body : []).slice(0, MAX_REPORTS).map(fromReport);
  }
  if (type.includes('application/csp-report')) {     // report-uri: { "csp-report": { … } }
    if (!body?.['csp-report'] && body?.body) return [fromReport(body)];   // WebKit: one Reporting API report under this type
    const r = body?.['csp-report'] || {};
    return [{ kind: 'csp-violation', page: bare(r['document-uri']), blocked: bare(r['blocked-uri']),
      directive: cut(r['effective-directive'] || r['violated-directive'], 60), source: bare(r['source-file']), line: num(r['line-number']) }];
  }
  if (body?.kind === 'error') {                       // core.js
    return [{ kind: 'script-error', page: bare(body.page), message: cut(body.message), source: bare(body.source),
      line: num(body.line), column: num(body.column) }];
  }
  return [];
}

// the body as text, or null past MAX_BODY: stops reading there, so a huge post costs no more than a small one
async function capped(request) {
  if (Number(request.headers.get('Content-Length')) > MAX_BODY) return null;
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) { all.set(c, at); at += c.byteLength; }
  return new TextDecoder().decode(all);
}

async function report(request, env) {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
  const site = new URL(request.url).origin;
  const origin = request.headers.get('Origin');
  if (origin && origin !== 'null' && origin !== site) return new Response(null, { status: 403 });   // null: WebKit's CSP reports (above)
  const text = await capped(request);
  if (text == null) return new Response(null, { status: 413 });
  let body;
  try { body = JSON.parse(text); } catch { return new Response(null, { status: 400 }); }
  const ours = (r) => (r.kind === 'script-error' ? origin === site : r.page === site || !!r.page?.startsWith(`${site}/`));
  const extension = (r) => EXTENSION.test(r.source || '') || EXTENSION.test(r.blocked || '');
  const webkitSelect = (r) => r.directive === 'style-src-attr' && r.blocked === 'inline' && !r.source && r.line === undefined;
  const keep = records(request.headers.get('Content-Type') || '', body).filter((r) => ours(r) && !extension(r) && !webkitSelect(r));
  if (!keep.length) return new Response(null, { status: 204 });
  if (env?.REPORTS) {
    const { success } = await env.REPORTS.limit({ key: request.headers.get('CF-Connecting-IP') || '' });
    if (!success) return new Response(null, { status: 429 });
  }
  const ua = cut(request.headers.get('User-Agent'), 200);
  for (const r of keep) console.log(JSON.stringify({ report: r, ua }));
  return new Response(null, { status: 204 });
}

// /404 itself: the not-found page is a built file (dist/404.html), so asked for by name it would come back 200.
// wrangler.jsonc sends /404 here too; the same page goes back with the status it describes.
async function notFoundPage(request, env) {
  const page = await env.ASSETS.fetch(request);
  return new Response(page.body, { status: 404, headers: page.headers });
}

// http:// to https://, the same address. 308 keeps a POST a POST. Local servers (npm run serve) stay on http.
const LOCAL = ['localhost', '127.0.0.1', '[::1]'];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.protocol === 'http:' && !LOCAL.includes(url.hostname)) {
      url.protocol = 'https:';
      return Response.redirect(url.href, 308);
    }
    if (url.pathname === '/api/report') return report(request, env);
    if (url.pathname === '/404') return notFoundPage(request, env);
    if (url.pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });
    return env.ASSETS.fetch(request);
  },
};
