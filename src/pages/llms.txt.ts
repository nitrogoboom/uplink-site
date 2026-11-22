// /llms.txt (llmstxt.org): what the site is and where its pages are, as Markdown, for an AI tool reading the site on
// someone's behalf. PageSpeed's "Agentic Browsing" group asks for a title, a link and more than a line (owner,
// November 17, 2026). Built from what the pages are built from, so it can't drift: the name and summary are the
// business's (ui.yaml, home.yaml), and each line is a page's own name and description. The headings are the pages'
// names too, but "Optional", which the format gives a meaning: what a reader short of room may skip.
// The draft's noindex header covers this file as it does every other (public/_headers).
import type { APIRoute } from 'astro';
import { NAV, PAGES, getProjects, getServices, pageMeta, pageName } from '../lib/site';
import { copy } from '../lib/copy';
import { email, hours, office, phone } from '../lib/footer';

export const GET: APIRoute = async ({ site }) => {
  const ui = await copy('ui', undefined);
  const at = (path: string) => new URL(path, site).href;
  const line = (name: string, path: string, about: string) => `- [${name}](${at(path)}): ${about}`;
  const page = async (key: keyof typeof PAGES) =>
    line(await pageName(key, undefined), PAGES[key].path, (await pageMeta(key, undefined)).description);
  const pages = (keys: readonly (keyof typeof PAGES)[]) => Promise.all(keys.map(page));

  const body = [
    `# ${ui.site.name}`,
    '',
    `> ${(await copy('home', undefined)).business}`,
    '',
    `${phone.display} · ${email} · ${office.street}, ${office.city} · ${hours.line}, ${hours.days}`,
    '',
    `## ${ui.llms.pages}`,
    '',
    ...(await pages(NAV.map((tab) => tab.page))),
    '',
    `## ${await pageName('services', undefined)}`,
    '',
    ...(await getServices(undefined)).map(({ id, data: s }) => line(s.title, `/services/${id}`, s.card)),
    '',
    `## ${await pageName('work', undefined)}`,
    '',
    ...(await getProjects(undefined)).map(({ id, data: p }) =>
      line(p.name, `/work/${id}`, `${p.client}. ${p.result}.`),
    ),
    '',
    '## Optional',
    '',
    ...(await pages(['privacy', 'accessibility'])),
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
