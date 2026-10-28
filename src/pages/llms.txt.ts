// /llms.txt: a short Markdown guide to the site for AI agents (llmstxt.org layout): the pages, then every
// service and project with its own address. Home links to /index.md, the home page as Markdown.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { PAGES } from '../lib/site';

export const GET: APIRoute = async ({ site }) => {
  const url = (path: string) => new URL(path, site).href;
  const services = (await getCollection('services')).sort((a, b) => a.data.order - b.data.order);
  const projects = (await getCollection('projects')).sort((a, b) => a.data.order - b.data.order);
  const lines = [
    '# Uplink Technology', '', `> ${PAGES.home.description}`, '',
    'This is a test build: Uplink Technology is a placeholder company and the copy is sample text.', '',
    '## Pages', '',
    ...Object.values(PAGES).map((p) => `- [${p.name}](${url(p.path === '/' ? '/index.md' : p.path)}): ${p.description}`),
    '', '## Services', '',
    ...services.map(({ id, data: s }) => `- [${s.title}](${url(`/services/${id}`)}): ${s.card}`),
    '', '## Projects', '',
    ...projects.map(({ id, data: p }) => `- [${p.name}](${url(`/work/${id}`)}): ${p.client}. ${p.result}.`),
    '', '## For agents', '', `- [Notes for AI agents](${url('/agents.md')})`,
  ];
  return new Response(lines.join('\n') + '\n', { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
