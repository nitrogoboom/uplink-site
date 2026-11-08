// /sitemap.xml: every indexable page (the static ones, each service, each project) with the date its
// source last changed. soon and 404 are noindex and not listed. While the site is a test build every page is noindex
// (public/_headers) and robots.txt names no sitemap; at launch robots.txt points here again.
import type { APIRoute } from 'astro';
import { allPages } from '../lib/site';

export const GET: APIRoute = async ({ site }) => {
  const pages = await allPages();
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    pages
      .map(
        (p) =>
          `  <url><loc>${new URL(p.path, site).href}</loc>${p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : ''}</url>\n`,
      )
      .join('') +
    '</urlset>\n';
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
