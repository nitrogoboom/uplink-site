// The site's one Worker script. Everything else is the built site in dist/, served as static assets: wrangler.jsonc
// sends only /api/* here first (run_worker_first).
//
// POST /api/report: problems real visitors' browsers hit, so we hear about them.
//   CSP blocks       the browser posts these itself (public/_headers: report-to csp, report-uri for older browsers)
//   script errors    core.js posts uncaught errors and rejected promises (navigator.sendBeacon)
// Each report becomes one line in the Workers logs (Cloudflare dashboard > Workers > uplink-site > Logs; observability
// is on in wrangler.jsonc). Nothing else is kept. What a line holds, and what it never holds, is in the privacy page
// (src/data/privacy.md): the page and script addresses without their ?query, the message, the browser's name. This
// code never logs the IP address or form contents, though Cloudflare's own record of each Worker run carries the
// request's headers, IP included (kept 3 days on the free plan, 7 on paid). A body over 8 KB, or more than 20
// reports in one post, is dropped.
//
// PR #38 adds the forms' routes (/api/contact, /api/book, /api/newsletter) to this same file: keep both.

const MAX_BODY = 8 * 1024;
const MAX_REPORTS = 20;
const cut = (v, n = 300) => (v == null ? undefined : String(v).slice(0, n));
// an address without its ?query or #fragment (a query can carry personal data; the path is what we need)
const bare = (u) => {
  if (!u) return undefined;
  try {
    const url = new URL(u);
    return cut(url.origin + url.pathname);
  } catch {
    return cut(String(u).split(/[?#]/)[0]);   // 'inline', 'eval' and the like
  }
};

// the three shapes a report arrives in, as one flat record
function records(type, body) {
  if (type.includes('application/reports+json')) {   // Reporting API: an array of { type, url, body }
    return (Array.isArray(body) ? body : []).slice(0, MAX_REPORTS).map((r) => ({
      kind: cut(r.type, 40),
      page: bare(r.url || r.body?.documentURL),
      blocked: bare(r.body?.blockedURL),
      directive: cut(r.body?.effectiveDirective, 60),
      source: bare(r.body?.sourceFile),
      line: r.body?.lineNumber,
    }));
  }
  if (type.includes('application/csp-report')) {     // report-uri: { "csp-report": { … } }
    const r = body?.['csp-report'] || {};
    return [{ kind: 'csp-violation', page: bare(r['document-uri']), blocked: bare(r['blocked-uri']),
      directive: cut(r['effective-directive'] || r['violated-directive'], 60), source: bare(r['source-file']), line: r['line-number'] }];
  }
  if (body?.kind === 'error') {                       // core.js
    return [{ kind: 'script-error', page: bare(body.page), message: cut(body.message), source: bare(body.source),
      line: body.line, column: body.column }];
  }
  return [];
}

async function report(request) {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
  const text = await request.text();
  if (text.length > MAX_BODY) return new Response(null, { status: 413 });
  let body;
  try { body = JSON.parse(text); } catch { return new Response(null, { status: 400 }); }
  const ua = cut(request.headers.get('User-Agent'), 200);
  for (const r of records(request.headers.get('Content-Type') || '', body)) console.log(JSON.stringify({ report: r, ua }));
  return new Response(null, { status: 204 });
}

export default {
  async fetch(request) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/report') return report(request);
    return new Response('Not found', { status: 404 });
  },
};
