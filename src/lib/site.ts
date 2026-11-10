// The site's page table (PAGES, NAV) and the helpers the pages and generated files (sitemap.xml, robots.txt,
// llms.txt, index.md, agents.md) share. src/README.md, "The shared layout"; each export is described where it's defined.
import type { IconName } from '../components/Icon.astro';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { shipped } from '../../scripts/svgo-config.mjs';
import { getCollection } from 'astro:content';
import { MEDIA } from './media.js';
import { byOrder } from '../content.config';
import { entryFile, lastmod } from './git-dates.mjs';
import { copy } from './copy';

// Drawings keep their names when they change and are cached for a day (_headers), but home.js inserts these into the
// page, so a stale one would meet new CSS, script and style hashes. Each address carries a hash of the file as the
// site serves it, after SVGO (?v=; shipped() in scripts/svgo-config.mjs), so a changed drawing is a new address,
// even when only SVGO's output changed.
const fresh = (path: string) => `${path}?v=${createHash('sha1').update(shipped(path)).digest('hex').slice(0, 8)}`;

// The home hero drawing's cuts and the screens each is for (home.js fetches one; index.astro preloads it), written
// by tools/gen_office.py. tablet: where the full cut's 21-unit sublines measure under 12px (the hero is
// 440-680px wide there). phone: the hero scene framed closer for phones, no words (home.js writes its captions),
// with its dashes in their own file; with reduced motion it stands still. still: the phone cut as a picture, for
// phones without script (an <img>, so no ?v=).
export const HERO = {
  full: fresh('/assets/img/hero-office.svg'),
  tablet: fresh('/assets/img/hero-office-tablet.svg'),
  phone: fresh('/assets/img/office-compact-build.svg'),
  phoneFlows: fresh('/assets/img/office-compact-flows.svg'),
  still: '/assets/img/hero-office-phone.svg',
  media: {
    phone: MEDIA.smallPhone,
    tablet: '(37.5em <= width < 81.25em) and (height < 68.75em)',
    full: '(width >= 81.25em), (width >= 37.5em) and (height >= 68.75em)',
  },
};

// the footer's campus map, written by tools/gen_campus.py (footer.js fetches it on every page)
export const CAMPUS = fresh('/assets/img/campus.svg');

// The static pages (five in the menu, plus privacy and accessibility): address and name. Each page's <title> and
// description are words, in its copy file (pageMeta() below).
export const PAGES = {
  home: { path: '/', name: 'Home' },
  services: { path: '/services', name: 'Services' },
  work: { path: '/work', name: 'Our work' },
  about: { path: '/about', name: 'About' },
  contact: { path: '/contact', name: 'Contact' },
  privacy: { path: '/privacy', name: 'Privacy' },
  accessibility: { path: '/accessibility', name: 'Accessibility' },
} as const;

// A static page's <title> and description, from src/data/copy/en/: NAME.yaml's top for the five in the menu,
// text-pages.yaml for privacy and accessibility. The page, the sitemap and llms.txt all read them here.
export const pageMeta = async (page: keyof typeof PAGES) => {
  const t = page === 'privacy' || page === 'accessibility' ? (await copy('text-pages'))[page] : await copy(page);
  return { title: t.title, description: t.description };
};

// Name and address come from PAGES. short: the phone tab bar's word, where it differs.
type Tab = { page: keyof typeof PAGES; icon: IconName; short?: string };
export const NAV: readonly Tab[] = [
  { page: 'home', icon: 'home' },
  { page: 'services', icon: 'grid' },
  { page: 'work', icon: 'play', short: 'Work' },
  { page: 'about', icon: 'building' },
  { page: 'contact', icon: 'bubble' },
];

// A service page or case study keeps its section's tab lit, but only the section page itself is "the current page".
export const tabCurrent = (tab: keyof typeof PAGES, current: string, pathname: string) => {
  if (tab !== current) return undefined;
  const bare = (p: string) => p.replace(/(\/index)?(\.html)?\/?$/, ''); // the build sees /index.html, /services.html
  return bare(pathname) === bare(PAGES[tab].path) ? 'page' : 'true';
};

// A drawing's size from its own <svg> tag (written by the generators), so an <img> never guesses it from the
// drawing's name. cardSize: the card cut, NAME-card.svg.
export const svgSize = (file: string) => {
  const head = readFileSync(`public/assets/img/${file}`, 'utf-8').slice(0, 400);
  const n = (k: string) => Number(head.match(new RegExp(` ${k}="([0-9.]+)"`))?.[1]);
  return { width: n('width'), height: n('height') };
};
export const cardSize = (image: string) => svgSize(`${image}-card.svg`);

// JSON-LD for a <script type="application/ld+json">: one space per level, and </ escaped so the text can never
// close the script early.
export const jsonLd = (data: unknown) => JSON.stringify(data, null, 1).replace(/<\//g, '<\\/');
// The business in short, for every page's graph but Home's (whose own block, index.astro, has the rest): a reader
// of one page alone can still name the provider and publisher the page points at by @id.
export const businessNode = (site: URL) => ({
  '@type': 'ProfessionalService',
  '@id': `${site.href}#business`,
  name: 'Uplink Technology',
  url: site.href,
});
// A BreadcrumbList from [name, address] pairs, Home first.
export const breadcrumbs = (trail: [string, string][]) => ({
  '@type': 'BreadcrumbList',
  itemListElement: trail.map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item })),
});

// The services and the projects in their own order (each entry's `order`), as every list shows them.
export const getServices = async () => (await getCollection('services')).sort((a, b) => a.data.order - b.data.order);
export const getProjects = async () => (await getCollection('projects')).sort((a, b) => a.data.order - b.data.order);
export const getGrow = async () => (await getCollection('grow')).sort(byOrder).map((e) => e.data); // in file order
export const getReviews = async () => (await getCollection('reviews')).sort(byOrder).map((e) => e.data); // in file order

// The /work filters (components/work/Projects.astro): "All" (label null: its word is the copy's, work.yaml), then one radio per project tag, in the order the projects
// first use it, each with its count. No tag is listed by hand, so none can be empty. workFilterCss() hides the other
// tags' cards while one is checked, with :has() and no script; work.astro puts it in the page's <head>, and
// scripts/headers.mjs hashes it for the CSP like any inline <style>. A browser without :has() ignores the rules and
// shows every project (projects.css then hides the filters).
export const WORK_FILTER = 'work-filter'; // the radios' name
export const workFilters = async () => {
  const projects = await getProjects();
  const tags = [...new Set(projects.map((p) => p.data.tag))];
  return [
    { key: 'all', label: null, count: projects.length },
    ...tags.map((t) => ({ key: t.toLowerCase(), label: t, count: projects.filter((p) => p.data.tag === t).length })),
  ];
};
export const workFilterCss = async () =>
  (await workFilters())
    .filter((f) => f.key !== 'all')
    .map(
      ({ key }) =>
        `.work-layout:has(input[name="${WORK_FILTER}"][value="${key}"]:checked) .work-grid > li:not([data-tags~="${key}"]) { display: none; }`,
    )
    .join('\n');

// The source files behind each static page, for lastmod (its copy file in src/data/copy/en/ included). Shared parts
// (layout, header, footer, ui.yaml) are left out on purpose: a footer tweak is not a reason for a crawler to refetch
// every page. A service or project page dates
// from its own entry file alone (entryFile()), the date its JSON-LD carries too: editing one changes one URL.
const SOURCES: Record<keyof typeof PAGES, string[]> = {
  home: [
    'src/pages/index.astro',
    'src/components/home',
    'src/data/copy/en/home.yaml',
    'src/data/grow.json',
    'src/content/services',
    'src/content/projects',
  ],
  services: [
    'src/pages/services.astro',
    'src/components/services',
    'src/data/copy/en/services.yaml',
    'src/content/services',
    'src/data/faq.json',
  ],
  work: ['src/pages/work.astro', 'src/components/work', 'src/data/copy/en/work.yaml', 'src/content/projects'],
  about: ['src/pages/about.astro', 'src/components/about', 'src/data/copy/en/about.yaml', 'src/data/team.json'],
  contact: [
    'src/pages/contact.astro',
    'src/components/contact',
    'src/data/copy/en/contact.yaml',
    'src/content/services',
    'src/components/ServiceOptions.astro',
  ],
  privacy: ['src/pages/privacy.astro', 'src/data/privacy.md', 'src/data/copy/en/text-pages.yaml'],
  accessibility: ['src/pages/accessibility.astro', 'src/data/accessibility.md', 'src/data/copy/en/text-pages.yaml'],
};

export type SitePage = { path: string; name: string; description: string; lastmod?: string };

// Every indexable page: the seven in PAGES plus one per service and project, with a lastmod. A static page dates from
// its SOURCES above; a service or project from its own entry file (lastmod() and entryFile() in git-dates.mjs, which
// also refuses a shallow clone in CI).
export async function allPages(): Promise<SitePage[]> {
  const services = await getServices();
  const projects = await getProjects();
  return [
    ...(await Promise.all(
      (Object.keys(PAGES) as (keyof typeof PAGES)[]).map(async (k) => ({
        ...PAGES[k],
        description: (await pageMeta(k)).description,
        lastmod: lastmod(SOURCES[k]),
      })),
    )),
    ...services.map(({ id, data: s }) => ({
      path: `/services/${id}`,
      name: s.title,
      description: s.card,
      lastmod: lastmod([entryFile('services', id)]),
    })),
    ...projects.map(({ id, data: p }) => ({
      path: `/work/${id}`,
      name: p.name,
      description: `${p.client}. ${p.result}.`,
      lastmod: lastmod([entryFile('projects', id)]),
    })),
  ];
}
