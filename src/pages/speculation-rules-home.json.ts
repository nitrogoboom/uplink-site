// /speculation-rules-home.json: once Home is open, Chrome and Edge fetch the other menu pages (NAV, src/lib/site.ts)
// straight away, so a click on a tab doesn't wait for the server. Home only (public/_headers adds it to "/" beside
// the site-wide hover rules). Prefetch, not prerender: only the HTML comes down, nothing on those pages runs, so no
// script or animation starts for a page nobody opened. Kept about five minutes; other browsers
// ignore it. docs/ops.md, "Response headers".
import type { APIRoute } from 'astro';
import { NAV, PAGES } from '../lib/site';

const urls = NAV.map(({ page }) => PAGES[page].path).filter((p) => p !== PAGES.home.path);

export const GET: APIRoute = () =>
  new Response(JSON.stringify({ prefetch: [{ urls, eagerness: 'immediate' }] }, null, 2), {
    headers: { 'Content-Type': 'application/speculationrules+json' },
  });
