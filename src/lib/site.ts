// The site's page table (PAGES, NAV) and the helpers the pages and generated files (sitemap.xml, llms.txt) share. src/README.md, "Pages"; each export is described where it's defined.
import type { IconName } from '../components/Icon.astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { copy } from './copy';
import { DEFAULT_LOCALE, linker, localeOf } from './i18n';

// The drawings (src/assets/img/*.svg, written by tools/) are Astro assets: the build gives each a hashed name under
// /_astro/, so a changed drawing is a new address and the browser may keep each one for a year, and reads its size
// from its <svg> tag. drawing('backup-card.svg') is { src, width, height }; Drawing.astro shows one in both themes.
const DRAWINGS = import.meta.glob<ImageMetadata>('../assets/img/*.svg', { eager: true, import: 'default' });
export const drawing = (file: string) => {
  const image = DRAWINGS[`../assets/img/${file}`];
  if (!image) throw new Error(`no drawing src/assets/img/${file} (tools/gen_*.py writes it)`);
  return image;
};

// the footer's campus map, written by tools/gen_campus.py (footer.js fetches it on every page)
export const CAMPUS = drawing('campus.svg').src;

// The static pages (five in the menu, plus privacy and accessibility): their addresses, as in the default language
// (linker() in i18n.ts gives another language's). Their names are words, in ui.yaml's pages (pageName() below), and
// each page's <title> and description in its copy file (pageMeta() below).
// Every helper below that reads words or content takes the page's language: Astro.currentLocale.
export const PAGES = {
  home: { path: '/' },
  services: { path: '/services' },
  work: { path: '/work' },
  about: { path: '/about' },
  contact: { path: '/contact' },
  privacy: { path: '/privacy' },
  accessibility: { path: '/accessibility' },
} as const;

// A static page's name (ui.yaml, pages); short: the phone tab bar's word where there is one (ui.yaml, tabs)
export const pageName = async (page: keyof typeof PAGES, locale: string | undefined, short = false) => {
  const t = await copy('ui', locale);
  return String(short && page in t.tabs ? t.tabs[page] : t.pages[page]);
};

// A static page's <title> and description, from the copy files: NAME.yaml's top for the five in the menu,
// text-pages.yaml for privacy and accessibility. The page and the sitemap read them here.
export const pageMeta = async (page: keyof typeof PAGES, locale: string | undefined) => {
  const t =
    page === 'privacy' || page === 'accessibility'
      ? (await copy('text-pages', locale))[page]
      : await copy(page, locale);
  return { title: t.title, description: t.description };
};

// Address from PAGES, name from pageName().
type Tab = { page: keyof typeof PAGES; icon: IconName };
export const NAV: readonly Tab[] = [
  { page: 'home', icon: 'home' },
  { page: 'services', icon: 'grid' },
  { page: 'work', icon: 'layers' },
  { page: 'about', icon: 'building' },
  { page: 'contact', icon: 'bubble' },
];

// A service page or case study keeps its section's tab lit, but only the section page itself is "the current page".
export const tabCurrent = (tab: keyof typeof PAGES, current: string, pathname: string, locale: string | undefined) => {
  if (tab !== current) return undefined;
  const bare = (p: string) => p.replace(/(\/index)?(\.html)?\/?$/, ''); // the build sees /index.html, /services.html
  return bare(pathname) === bare(linker(locale)(PAGES[tab].path)) ? 'page' : 'true';
};

// A drawing's size, for an <img>'s width and height. cardSize: the card cut, NAME-card.svg.
export const svgSize = (file: string) => {
  const { width, height } = drawing(file);
  return { width, height };
};
export const cardSize = (image: string) => svgSize(`${image}-card.svg`);

// JSON-LD for a <script type="application/ld+json">: one space per level, and every < escaped (as wordsJson does,
// src/lib/copy.ts), so the text can never close the script early or open a comment inside it.
export const jsonLd = (data: unknown) => JSON.stringify(data, null, 1).replace(/</g, '\\u003c');
// The business, pointed at by @id from every page's JSON-LD (provider, publisher, author).
export const businessRef = (site: URL) => ({ '@id': `${site.href}#business` });
// The business in short, for every page's graph (Home's block, index.astro, adds the rest): a reader of one page
// alone can still name the provider and publisher the page points at by @id. Its name is ui.yaml's site.name.
export const businessNode = async (site: URL, locale: string | undefined) => ({
  '@type': 'ProfessionalService',
  ...businessRef(site),
  name: (await copy('ui', locale)).site.name,
  url: site.href,
});
// A BreadcrumbList from [name, address] pairs, Home first.
export const breadcrumbs = (trail: [string, string][]) => ({
  '@type': 'BreadcrumbList',
  itemListElement: trail.map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item })),
});

// A collection's entries in a page's language, by slug (the id "en/help-desk" becomes "help-desk"): the default
// language's, with the page's own laid over them, so one not translated yet still shows.
const inLocale = <E extends { id: string }>(all: E[], locale: string | undefined) => {
  const bySlug = new Map<string, E>();
  for (const l of new Set([DEFAULT_LOCALE, localeOf(locale)]))
    for (const e of all) {
      const [lang, slug] = e.id.split('/');
      if (lang === l) bySlug.set(slug, { ...e, id: slug });
    }
  return [...bySlug.values()];
};
// The services and the projects in their own order (each entry's `order`), as every list shows them.
export const getServices = async (locale: string | undefined) =>
  inLocale(await getCollection('services'), locale).sort((a, b) => a.data.order - b.data.order);
export const getProjects = async (locale: string | undefined) => {
  const slugs = new Set((await getServices(locale)).map((s) => s.id));
  const projects = inLocale(await getCollection('projects'), locale).sort((a, b) => a.data.order - b.data.order);
  for (const p of projects)
    for (const s of p.data.services)
      if (!slugs.has(s)) throw new Error(`projects/${p.id}.json: no service "${s}" (its services list)`);
  return projects;
};
// The smaller lists, in file order: the page's language, or the default's
const listOf = async <C extends 'faq' | 'team' | 'grow' | 'reviews'>(
  name: C,
  locale: string | undefined,
): Promise<CollectionEntry<C>['data']['items']> => {
  const files = (await getCollection(name)) as CollectionEntry<C>[];
  const entry = files.find((f) => f.id === localeOf(locale)) ?? files.find((f) => f.id === DEFAULT_LOCALE);
  if (!entry) throw new Error(`src/content/${DEFAULT_LOCALE}/${name}.json is missing`);
  return entry.data.items;
};
export const getFaq = (locale: string | undefined) => listOf('faq', locale);
export const getTeam = (locale: string | undefined) => listOf('team', locale);
export const getGrow = (locale: string | undefined) => listOf('grow', locale);
export const getReviews = (locale: string | undefined) => listOf('reviews', locale);

// The /work filters (components/work/Projects.astro): "All" (label null: its word is the copy's, work.yaml), then one radio per project tag, in the order the projects
// first use it, each with its count. No tag is listed by hand, so none can be empty. workFilterCss() hides the other
// tags' cards while one is checked, with :has() and no script; work.astro puts it in the page's <head>.
// A browser without :has() ignores the rules and
// shows every project (projects.css then hides the filters).
export const WORK_FILTER = 'work-filter'; // the radios' name
export const workFilters = async (locale: string | undefined) => {
  const projects = await getProjects(locale);
  const tags = [...new Set(projects.map((p) => p.data.tag))];
  return [
    { key: 'all', label: null, count: projects.length },
    ...tags.map((t) => ({ key: t.toLowerCase(), label: t, count: projects.filter((p) => p.data.tag === t).length })),
  ];
};
export const workFilterCss = async (locale: string | undefined) =>
  (await workFilters(locale))
    .filter((f) => f.key !== 'all')
    .map(
      ({ key }) =>
        `.work-layout:has(input[name="${WORK_FILTER}"][value="${key}"]:checked) .work-grid > li:not([data-tags~="${key}"]) { display: none; }`,
    )
    .join('\n');

export type SitePage = { path: string; name: string; description: string };

// Every indexable page in one language: the seven in PAGES plus one per service and project.
export async function allPages(locale: string | undefined): Promise<SitePage[]> {
  const services = await getServices(locale);
  const projects = await getProjects(locale);
  const to = linker(locale);
  return [
    ...(await Promise.all(
      (Object.keys(PAGES) as (keyof typeof PAGES)[]).map(async (k) => ({
        path: to(PAGES[k].path),
        name: await pageName(k, locale),
        description: (await pageMeta(k, locale)).description,
      })),
    )),
    ...services.map(({ id, data: s }) => ({
      path: to(`/services/${id}`),
      name: s.title,
      description: s.card,
    })),
    ...projects.map(({ id, data: p }) => ({
      path: to(`/work/${id}`),
      name: p.name,
      description: `${p.client}. ${p.result}.`,
    })),
  ];
}
