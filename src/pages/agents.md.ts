// /agents.md: notes for AI agents, written by hand in src/data/agents.md; {site} becomes the site's address.
import type { APIRoute } from 'astro';
import source from '../data/agents.md?raw';

export const GET: APIRoute = ({ site }) => {
  const text = source.replaceAll('{site}', site!.href.replace(/\/$/, ''));
  return new Response(text, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
