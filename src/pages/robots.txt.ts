// /robots.txt: everything may be crawled. While the site is a test build it is kept out of results by the
// X-Robots-Tag noindex header in public/_headers; crawling stays allowed so search engines can read that header.
// No Sitemap line meanwhile: offering a sitemap of pages that all say noindex mixes the signals.
// At launch (docs/release.md, "Launch day"): take `({ site })` again and add `\nSitemap: ${new URL('/sitemap.xml', site).href}\n`.
import type { APIRoute } from 'astro';

export const GET: APIRoute = () =>
  new Response('User-agent: *\nAllow: /\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
