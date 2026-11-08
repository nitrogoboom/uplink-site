// Password lock for the whole site. Off, and not deployed: to turn it on, copy lock() and passwordOk() into
// worker/index.js after the http-to-https redirect and the /api/report line. Steps in README, "Password lock".

const REALM = 'Uplink mockup';

/** The 401 that makes the browser ask for the password, or null when the request carries the right one. */
export async function lock(request, env) {
  if (env.SITE_PASSWORD && (await passwordOk(request, env.SITE_PASSWORD))) return null;
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
  let given;
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
