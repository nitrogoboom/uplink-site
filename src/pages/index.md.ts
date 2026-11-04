// /index.md: the home page as Markdown, for AI agents. The prose is written by hand in src/data/index.md;
// {site} becomes the site's address, {services} the service list from the collection (one line each, linking to
// the service's own page) and {grow} the We grow with you steps (src/data/grow.json), so the Markdown never drifts
// from the data.
import type { APIRoute } from 'astro';
import source from '../data/index.md?raw';
import { getGrow, getServices } from '../lib/site';

export const GET: APIRoute = async ({ site }) => {
  const base = site!.href.replace(/\/$/, '');
  const services = await getServices();
  const grow = await getGrow();
  const list = services.map(({ id, data: s }) => `- [${s.title}](${base}/services/${id}): ${s.card}`).join('\n');
  const steps = grow.map((s) => `- ${s.place}: ${s.title}. Watch for: ${s.watch} We handle: ${s.handle}`).join('\n');
  const text = source.replace(/<!--.*?-->\n/s, '').replaceAll('{site}', base).replace('{services}', list).replace('{grow}', steps);
  return new Response(text, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
