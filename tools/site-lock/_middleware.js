// Password lock for the whole Cloudflare Pages site (every page and file).
// The browser asks for a username and password. Any username works; the
// password must match the secret SITE_PASSWORD. Set or change it with:
//   npx wrangler pages secret put SITE_PASSWORD --project-name uplink-site
// then deploy again. With no secret set, the site stays locked.

const REALM = 'Uplink mockup';

export async function onRequest({ request, env, next }) {
  if (env.SITE_PASSWORD && await passwordOk(request, env.SITE_PASSWORD)) {
    const res = await next();
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
}

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
