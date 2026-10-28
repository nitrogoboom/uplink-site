// Password lock for the whole site, as a Worker in front of the static assets. Off by default.
// To turn it on, add to wrangler.jsonc:
//   "main": "tools/site-lock/worker.js",
//   "assets": { "directory": "./dist", "not_found_handling": "404-page", "binding": "ASSETS", "run_worker_first": true }
// then set the password and deploy:
//   npx wrangler secret put SITE_PASSWORD
//   npx wrangler deploy
// The browser asks for a username and password. Any username works; the password must match the secret.
// With no secret set, the site stays locked. To test locally: npx wrangler dev --var SITE_PASSWORD:some-test-value

const REALM = 'Uplink mockup';

export default {
  async fetch(request, env) {
    if (env.SITE_PASSWORD && await passwordOk(request, env.SITE_PASSWORD)) {
      const res = await env.ASSETS.fetch(request);
      const out = new Response(res.body, res);
      out.headers.set('X-Robots-Tag', 'noindex, nofollow');
      return out;
    }
    return new Response('Password required.', {
      status: 401,
      headers: {
        'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"`,
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  },
};

async function passwordOk(request, expected) {
  const header = request.headers.get('Authorization') || '';
  if (!header.startsWith('Basic ')) return false;
  let given = '';
  try {
    const decoded = new TextDecoder().decode(Uint8Array.from(atob(header.slice(6)), (c) => c.charCodeAt(0)));
    given = decoded.slice(decoded.indexOf(':') + 1);
  } catch {
    return false;
  }
  // compare hashes in constant time so the check doesn't leak the password
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(given)),
    crypto.subtle.digest('SHA-256', enc.encode(expected)),
  ]);
  return crypto.subtle.timingSafeEqual(a, b);
}
