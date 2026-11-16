// The site's one Worker script: it runs only for /404 and addresses with no file (wrangler.jsonc); every other
// request is a static file from dist/. The http:// redirect, the 404 page and its own headers: docs/ops.md, "The
// Worker". It takes no input: it reads no request body, and the site has no /api/ address.
//
// PR #38 (open, paused until a sending domain exists) adds the forms' routes (/api/contact, /api/book, /api/newsletter)
// to this file, and /api/* back to run_worker_first in wrangler.jsonc.

// what every response this script writes itself carries: never sniffed, never stored, and if one were ever opened as
// a page it could load nothing and be framed nowhere
const OWN = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
};
const reply = (status, body = null, headers = {}) => new Response(body, { status, headers: { ...OWN, ...headers } });
// a value as text for the error log, cut short (an error's message is whatever was thrown)
const cut = (v, n = 300) => (typeof v === 'string' || typeof v === 'number' ? String(v).slice(0, n) : undefined);

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
  // the assets answer any other method with a bare 405 (a POST to /services): the same here, with the list
  if (request.method !== 'GET' && request.method !== 'HEAD')
    return reply(405, 'Method not allowed', { Allow: 'GET, HEAD' });
  if (url.pathname === '/404') return notFound(request, env);
  // any other address comes here only when the assets had no file for it (wrangler.jsonc): pass on whatever they
  // answer now but a 404, which gets the 404 page
  const res = await env.ASSETS.fetch(request);
  if (res.status !== 404) return res;
  await res.body?.cancel();
  return notFound(request, env);
}

// A throw anywhere would be Cloudflare's error page instead of the site: anything unexpected is logged (the path and
// the message, nothing else) and the request goes on to the static assets as if the Worker weren't there.
export default {
  async fetch(request, env) {
    try {
      return await route(request, env);
    } catch (e) {
      const path = new URL(request.url).pathname;
      console.error(JSON.stringify({ worker_error: cut(e?.message) ?? 'unknown', path: cut(path) }));
      return env.ASSETS.fetch(request);
    }
  },
};
