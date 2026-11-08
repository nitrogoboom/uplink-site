// /llms.txt: a short Markdown guide to the site for AI agents (llmstxt.org layout): the pages, then every
// service and project. Each links to the page's Markdown copy (the address plus .md; Home's is /index.md),
// written at build by scripts/markdown.mjs.
import type { APIRoute } from 'astro';
import { PAGES, getServices, getProjects } from '../lib/site';

export const GET: APIRoute = async ({ site }) => {
  const url = (path: string) => new URL(path, site).href;
  const md = (path: string) => url(path === '/' ? '/index.md' : `${path}.md`);
  const services = await getServices();
  const projects = await getProjects();
  const lines = [
    '# Uplink Technology',
    '',
    `> ${PAGES.home.description}`,
    '',
    'This is a test build: Uplink Technology is a placeholder company and the copy is sample text.',
    '',
    'Every link below is the page as Markdown. Drop the .md for the web page.',
    '',
    '## Pages',
    '',
    ...Object.values(PAGES).map((p) => `- [${p.name}](${md(p.path)}): ${p.description}`),
    '',
    '## Services',
    '',
    ...services.map(({ id, data: s }) => `- [${s.title}](${md(`/services/${id}`)}): ${s.card}`),
    '',
    '## Projects',
    '',
    ...projects.map(({ id, data: p }) => `- [${p.name}](${md(`/work/${id}`)}): ${p.client}. ${p.result}.`),
    '',
    '## For agents',
    '',
    `- [Notes for AI agents](${url('/agents.md')})`,
  ];
  return new Response(lines.join('\n') + '\n', { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
