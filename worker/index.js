// The site's one Worker script. Everything else is the built site in dist/, served as static assets with _headers
// and _redirects applied, and none of those requests run this script. It runs only for what the assets can't answer
// well on their own (wrangler.jsonc):
//   /api/*    run_worker_first: POST /api/report (below); any other /api/ address is a 404
//   /404      run_worker_first: the 404 page by name, with a 404 status (as a file, dist/404.html, it would be 200)
//   a miss    not_found_handling "none": an address with no file comes here instead of getting the 404 page from
//             the assets, so it gets the same page as /404 with /404's headers, not those of the _headers rules its
//             path matches (/*.md's type, /_astro/*'s year-long cache, /assets/img/*'s drawing CSP)
// It also sends plain http:// to https:// for those requests. The pages and files themselves aren't redirected here:
// browsers never ask workers.dev over http (.dev is on every browser's HSTS preload list), and on our own zone at
// launch Always Use HTTPS redirects every request before it reaches the Worker or the assets (README, "The Worker").
//
// POST /api/report: problems real visitors' browsers hit, so we hear about them.
//   CSP blocks       the browser posts these itself (public/_headers: report-to csp, report-uri for older browsers)
//   script errors    core.js posts uncaught errors and rejected promises (navigator.sendBeacon)
// Each report becomes one line in the Workers logs (Cloudflare dashboard > Workers > uplink-site > Logs; observability
// is on in wrangler.jsonc, with Cloudflare's own record of each run, the invocation log, turned off). Nothing else is
// kept. What a line holds, and what it never holds, is in the privacy page (src/data/privacy.md): the page and script
// addresses without their ?query, the message, the user agent (cut to 200 characters). This code never logs the IP
// address or form contents. A body over 8 KB is refused (413); a post with more than 20 reports has only its first
// 20 read (browsers batch them, and the first are as good as any).
// Only this site's reports count: a post whose Origin header is another site's gets 403, a script error needs our own
// Origin (sendBeacon always sends one), and a CSP report about a page on another site is dropped. WebKit (Safari)
// posts its CSP reports with "Origin: null", so null is let through: a report about another page is still dropped,
// and a script error still needs our own Origin. Reports about a browser extension's own scripts (Chrome strips their
// address to "chrome-extension") are dropped too: they aren't the site's, and they'd bury the ones that are. So is
// WebKit's refusal of its own style for each <select> (style-src-attr, "inline", no script named: it does it on a bare
// page with nothing of ours, checked November 6, 2026), two on every page. Each visitor address may have 30 posts a
// minute logged (the REPORTS rate limit in wrangler.jsonc, counted by Cloudflare and not kept); past that, 429. A post
// with nothing to log isn't counted. Without the binding (the tests) there is no limit.
// Every answer this script writes itself (not the 404 page, which is the assets' own) carries nosniff, no-store and a
// policy that lets it load nothing (OWN, below): _headers doesn't reach a Worker's own responses.
//
// PR #38 (open, paused until a sending domain exists) adds the forms' routes (/api/contact, /api/book, /api/newsletter) to this same file: keep both.

const MAX_BODY = 8 * 1024;
// what every response this script writes itself carries: never sniffed, never stored, and if one were ever opened as
// a page it could load nothing and be framed nowhere
const OWN = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
};
const reply = (status, body = null, headers = {}) => new Response(body, { status, headers: { ...OWN, ...headers } });
const MAX_REPORTS = 20;
const EXTENSION = /^(chrome|moz|safari-web)-extension$/; // an extension's address, as bare() leaves it
// a field as text: only a string or a number counts (a report is the sender's word; an object's toString can throw)
const cut = (v, n = 300) => (typeof v === 'string' || typeof v === 'number' ? String(v).slice(0, n) : undefined);
// a line or column number, or nothing (a report is the sender's word: never log what it sends as is)
const num = (v) => (Number.isInteger(v) && v >= 0 ? v : undefined);
// an address without its ?query or #fragment (a query can carry personal data; the path is what we need)
const bare = (u) => {
  if (!u || (typeof u !== 'string' && typeof u !== 'number')) return undefined;
  try {
    const url = new URL(String(u));
    if (url.origin === 'null') return cut(url.protocol.slice(0, -1)); // data:, an extension's own address: the scheme only
    return cut(url.origin + url.pathname);
  } catch {
    return cut(String(u).split(/[?#]/)[0]); // 'inline', 'eval' and the like
  }
};

const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
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
  if (type.includes('application/reports+json')) {
    // Reporting API: an array of { type, url, body }
    return (Array.isArray(body) ? body : []).slice(0, MAX_REPORTS).filter(isObject).map(fromReport);
  }
  if (type.includes('application/csp-report')) {
    // report-uri: { "csp-report": { … } }
    if (!body?.['csp-report'] && body?.body) return [fromReport(body)]; // WebKit: one Reporting API report under this type
    const r = body?.['csp-report'] || {};
    return [
      {
        kind: 'csp-violation',
        page: bare(r['document-uri']),
        blocked: bare(r['blocked-uri']),
        directive: cut(r['effective-directive'] || r['violated-directive'], 60),
        source: bare(r['source-file']),
        line: num(r['line-number']),
      },
    ];
  }
  if (body?.kind === 'error') {
    // core.js
    return [
      {
        kind: 'script-error',
        page: bare(body.page),
        message: cut(body.message),
        source: bare(body.source),
        line: num(body.line),
        column: num(body.column),
      },
    ];
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
    if (size > MAX_BODY) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    all.set(c, at);
    at += c.byteLength;
  }
  return new TextDecoder().decode(all);
}

async function report(request, env) {
  if (request.method !== 'POST') return reply(405, 'Method not allowed', { Allow: 'POST' });
  const site = new URL(request.url).origin;
  const origin = request.headers.get('Origin');
  if (origin && origin !== 'null' && origin !== site) return reply(403); // null: WebKit's CSP reports (above)
  const text = await capped(request);
  if (text == null) return reply(413);
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return reply(400);
  }
  const ours = (r) =>
    r.kind === 'script-error' ? origin === site : r.page === site || !!r.page?.startsWith(`${site}/`);
  const extension = (r) => EXTENSION.test(r.source || '') || EXTENSION.test(r.blocked || '');
  const webkitSelect = (r) =>
    r.directive === 'style-src-attr' && r.blocked === 'inline' && !r.source && r.line === undefined;
  let keep;
  try {
    // the type checks above should leave nothing to throw; if a shape still does, it's a bad report, not a crash
    keep = records((request.headers.get('Content-Type') || '').toLowerCase(), body).filter(
      (r) => ours(r) && !extension(r) && !webkitSelect(r),
    );
  } catch {
    return reply(400);
  }
  if (!keep.length) return reply(204);
  if (env?.REPORTS) {
    const { success } = await env.REPORTS.limit({ key: request.headers.get('CF-Connecting-IP') || '' });
    if (!success) return reply(429);
  }
  const ua = cut(request.headers.get('User-Agent'), 200);
  for (const r of keep) console.log(JSON.stringify({ report: r, ua }));
  return reply(204);
}

// The 404 page, with a 404 status: for /404 by name, and for any address with no file. It is always asked for afresh
// as /404, so it has /404's headers (the page's CSP, the HTML type and cache) whatever path was missed (review B8),
// and with none of the visitor's If-None-Match / If-Modified-Since: the file would answer those 304, and a 304 turned
// into a 404 is an empty page (review B3). Its ETag and Last-Modified are dropped so a browser has nothing to send back.
async function notFound(request, env) {
  const page = await env.ASSETS.fetch(
    new Request(new URL('/404', request.url), { method: request.method === 'HEAD' ? 'HEAD' : 'GET' }),
  );
  const headers = new Headers(page.headers);
  headers.delete('ETag');
  headers.delete('Last-Modified');
  return new Response(page.body, { status: 404, headers });
}

// http:// to https://, the same address. 308 keeps a POST a POST. A server on this machine or the local network
// (npm run serve, or wrangler dev --ip 0.0.0.0 for a phone on the same Wi-Fi) stays on http: it has no certificate.
const local = (host) =>
  host === 'localhost' ||
  host.endsWith('.localhost') ||
  host.endsWith('.local') ||
  host === '0.0.0.0' ||
  host === '[::1]' ||
  /^(127|10)\.\d+\.\d+\.\d+$/.test(host) ||
  /^192\.168\.\d+\.\d+$/.test(host) ||
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(host) ||
  /^169\.254\.\d+\.\d+$/.test(host) ||
  /^\[(f[cd]|fe[89ab])[0-9a-f]*:/i.test(host); // IPv6: unique local, link-local

async function route(request, env) {
  const url = new URL(request.url);
  if (url.protocol === 'http:' && !local(url.hostname)) {
    url.protocol = 'https:';
    return reply(308, null, { Location: url.href });
  }
  if (url.pathname === '/api/report') return report(request, env);
  if (url.pathname.startsWith('/api/')) return reply(404, 'Not found', { 'Content-Type': 'text/plain; charset=utf-8' });
  // the assets answer any other method with a bare 405 (a POST to /services): the same here, with the list
  if (request.method !== 'GET' && request.method !== 'HEAD')
    return reply(405, 'Method not allowed', { Allow: 'GET, HEAD' });
  if (url.pathname === '/404') return notFound(request, env);
  // a miss (or, with run_worker_first true, any address): the file if there is one, else the 404 page
  const res = await env.ASSETS.fetch(request);
  if (res.status !== 404) return res;
  await res.body?.cancel();
  return notFound(request, env);
}

// A throw anywhere would be Cloudflare's error page instead of the site: anything unexpected is logged and the
// request goes on to the static assets as if the Worker weren't there. Not an /api/ request, nor one whose body has
// been read: the assets have nothing for it, and a used body can't be passed on (workerd throws "Cannot reconstruct a
// Request with a used body"), so that gets a plain 503.
export default {
  async fetch(request, env) {
    try {
      return await route(request, env);
    } catch (e) {
      const path = new URL(request.url).pathname;
      console.error(JSON.stringify({ worker_error: cut(e?.message) ?? 'unknown', path: cut(path) }));
      if (path.startsWith('/api/') || request.bodyUsed) return reply(503);
      return env.ASSETS.fetch(request);
    }
  },
};
