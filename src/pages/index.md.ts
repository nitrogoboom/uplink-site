// /index.md: the home page as Markdown, for AI agents. The prose is written by hand in src/data/index.md;
// {site} becomes the site's address, {services} the service list from the collection (one line each, linking to
// the service's own page), {grow} the We grow with you steps (src/data/grow.json), and the contact placeholders
// ({phone}, {street} …) the values from src/data/footer.json, so the Markdown never drifts from the data. A name
// with no value stops the build (fill(), src/lib/placeholders.mjs).
import type { APIRoute } from 'astro';
import source from '../data/index.md?raw';
import { getGrow, getServices } from '../lib/site';
import { PLACEHOLDERS } from '../lib/footer';
import { fill } from '../lib/placeholders.mjs';

export const GET: APIRoute = async ({ site }) => {
  const base = site!.href.replace(/\/$/, '');
  const services = await getServices();
  const grow = await getGrow();
  const list = services.map(({ id, data: s }) => `- [${s.title}](${base}/services/${id}): ${s.card}`).join('\n');
  const steps = grow.map((s) => `- ${s.place}: ${s.title}. Watch for: ${s.watch} We handle: ${s.handle}`).join('\n');
  // the file carries one editors' note in <!-- … --> (under its title): cut it out by position, with the newline after
  // it, rather than by pattern matching over the text
  const start = source.indexOf('<!--');
  const end = start < 0 ? -1 : source.indexOf('-->', start);
  const body = end < 0 ? source : source.slice(0, start) + source.slice(end + 3).replace(/^\n/, '');
  const text = fill(body, { ...PLACEHOLDERS, site: base, services: list, grow: steps }, 'src/data/index.md');
  return new Response(text, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
