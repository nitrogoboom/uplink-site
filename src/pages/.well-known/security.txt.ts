// /.well-known/security.txt (RFC 9116): where to report a security problem with this site. The inbox is in
// src/data/footer.json (inboxes.security, a placeholder until it's a real, watched inbox). Expires is a year from
// the build, so a site that stops being built stops advertising an inbox nobody reads. SECURITY.md says the same
// for the repository.
import type { APIRoute } from 'astro';
import { inboxes } from '../../lib/footer';

export const GET: APIRoute = ({ site }) => {
  const expires = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().replace(/\.\d+Z$/, 'Z');
  const body = [
    `Contact: mailto:${inboxes.security}`,
    `Expires: ${expires}`,
    'Preferred-Languages: en',
    `Canonical: ${new URL('/.well-known/security.txt', site).href}`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
