// /robots.txt: everything may be crawled; the sitemap is at the site's own address. (While the site is a test
// build it is kept out of results by the X-Robots-Tag header in public/_headers, not here.)
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap.xml', site).href}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
