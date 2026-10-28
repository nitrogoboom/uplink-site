// /index.md: the home page as Markdown, for AI agents. The prose is written by hand in src/data/index.md;
// {site} becomes the site's address and {services} the service list from the collection (one line each,
// linking to the service's own page), so the Markdown never drifts from the data.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import source from '../data/index.md?raw';

export const GET: APIRoute = async ({ site }) => {
  const base = site!.href.replace(/\/$/, '');
  const services = (await getCollection('services')).sort((a, b) => a.data.order - b.data.order);
  const list = services.map(({ id, data: s }) => `- [${s.title}](${base}/services/${id}): ${s.card}`).join('\n');
  const text = source.replace(/<!--.*?-->\n/s, '').replaceAll('{site}', base).replace('{services}', list);
  return new Response(text, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
