// /agents.md: notes for AI agents, written by hand in src/data/agents.md; {site} becomes the site's address, and
// {phone} and {email} (any of the contact placeholders) the values from src/data/footer.json.
import type { APIRoute } from 'astro';
import source from '../data/agents.md?raw';
import { PLACEHOLDERS } from '../lib/footer';
import { fill } from '../lib/placeholders.mjs';

export const GET: APIRoute = ({ site }) => {
  const text = fill(source, { ...PLACEHOLDERS, site: site!.href.replace(/\/$/, '') }, 'src/data/agents.md');
  return new Response(text, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
