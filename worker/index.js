// The site's one Worker script: the three forms post here (POST /api/contact, /api/book, /api/newsletter).
// Everything else is the built site in dist/, served as static assets (wrangler.jsonc sends only /api/* here first).
//
// Each post goes through, in order: the honeypot (a hidden "website" field people never fill), a rate limit per
// visitor address (the FORMS binding), Turnstile (the cf-turnstile-response token, checked with TURNSTILE_SECRET),
// the fields, then the email. The page script asks for JSON (Accept: application/json) and shows the answer;
// a post without script gets a 303 to /sent or /not-sent.
//
// Config: TURNSTILE_SECRET and FORM_TO (the inbox) are Worker secrets, never in the repo or the page.
// Locally, .dev.vars holds Turnstile's always-pass test secret.
//
// SENDING IS A STUB until the site has a domain on Cloudflare (notes.md): Email Service sends only from a domain on
// a Cloudflare zone. Until the EMAIL binding (send_email in wrangler.jsonc) and FORM_FROM exist, every post that gets
// past the checks is refused with 503 "not set up", so no form claims a send that did not happen.

const FORMS = {
  contact: {
    subject: (f) => `Website message: ${f.topic || 'General'}`,
    fields: { name: 200, email: 254, company: 200, topic: 120, message: 5000 },
    required: ['name', 'email', 'message'],
  },
  book: {
    subject: (f) => `Check-up request: ${f.company || f.name}`,
    fields: { name: 200, email: 254, company: 200, size: 60, service: 120 },
    required: ['name', 'email'],
  },
  newsletter: {
    subject: () => 'Newsletter sign-up',
    fields: { email: 254 },
    required: ['email'],
  },
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// what the visitor reads when a post is refused (the page shows it as is)
const SAY = {
  bad: 'Some fields are missing or too long. Check the form and try again.',
  check: 'The spam check did not pass. Try again, or call or email us.',
  busy: 'Too many messages from your connection. Wait a minute and try again.',
  off: 'The form cannot send yet. Call or email us instead.',
  failed: 'Your message did not go through. Try again, or call or email us.',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const kind = url.pathname.match(/^\/api\/(contact|book|newsletter)$/)?.[1];
    if (!kind) return new Response('Not found', { status: 404 });
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });

    const json = (request.headers.get('Accept') || '').includes('application/json');
    const answer = (status, error) => {
      if (json) return Response.json(error ? { ok: false, error: SAY[error] } : { ok: true }, { status, headers: { 'Cache-Control': 'no-store' } });
      return Response.redirect(new URL(error ? `/not-sent#${kind}` : `/sent#${kind}`, url), 303);
    };
    // only this site's own pages may post (a browser always sends Origin on a POST)
    if (request.headers.get('Origin') !== url.origin) return answer(403, 'check');

    let data;
    try { data = await request.formData(); } catch { return answer(400, 'bad'); }

    // the honeypot: a bot that fills every field gets a "sent", and nothing happens
    if (data.get('website')) return answer(200);

    const ip = request.headers.get('CF-Connecting-IP') || '';
    if (env.FORMS) {
      const { success } = await env.FORMS.limit({ key: ip || 'none' });
      if (!success) return answer(429, 'busy');
    }

    if (!(await turnstileOk(env, data.get('cf-turnstile-response'), ip))) return answer(403, 'check');

    const spec = FORMS[kind];
    const fields = {};
    for (const [key, max] of Object.entries(spec.fields)) {
      const v = String(data.get(key) || '').trim();
      if (v.length > max) return answer(400, 'bad');
      fields[key] = v;
    }
    if (spec.required.some((k) => !fields[k]) || !EMAIL_RE.test(fields.email)) return answer(400, 'bad');

    if (!env.EMAIL || !env.FORM_FROM || !env.FORM_TO) return answer(503, 'off');
    try {
      await env.EMAIL.send({
        to: env.FORM_TO,
        from: env.FORM_FROM,
        replyTo: fields.email,
        subject: spec.subject(fields),
        text: Object.entries(fields).map(([k, v]) => `${k}: ${v || '-'}`).join('\n'),
      });
    } catch (e) {
      console.error('send failed', e.code, e.message);
      return answer(502, 'failed');
    }
    return answer(200);
  },
};

async function turnstileOk(env, token, ip) {
  if (!token || !env.TURNSTILE_SECRET) return false;
  const body = new FormData();
  body.append('secret', env.TURNSTILE_SECRET);
  body.append('response', String(token));
  if (ip) body.append('remoteip', ip);
  try {
    const res = await fetch(SITEVERIFY, { method: 'POST', body });
    const out = await res.json();
    return out.success === true;
  } catch {
    return false;
  }
}
