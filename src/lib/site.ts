// The site's page table and the helpers the generated files share (sitemap.xml, robots.txt, llms.txt,
// index.md, agents.md).
//   PAGES       the static pages (five in the menu, plus privacy and accessibility): address, name, <title>, description. The .astro pages read their
//               title and description from here, so the sitemap and llms.txt say the same thing.
//   getServices(), getProjects()  the collections in their own order.
//   jsonLd(), breadcrumbs()  the JSON-LD write-out and its breadcrumb list, for every page.
//   allPages()  every indexable page: the seven in PAGES plus one per service and project, with a lastmod.
//   lastmod()   when the files behind a page last changed, from git (the build runs in a checkout); created(): when first added.
//   businessNode()  the business in short, for the JSON-LD of every page but Home.
//   HERO        the home hero drawing's cuts and the screens each is for (home.js fetches one; index.astro preloads it).
//   NAV         the main tabs in order: the header and the phone tab bar read it.
//   tabCurrent() a tab's aria-current: 'page' on its own page, 'true' on a page inside its section.
//   svgSize()   a drawing's own width and height, read from the file, for the <img> that shows it (cardSize(): its card cut).
import type { IconName } from '../components/Icon.astro';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { shipped } from '../../scripts/svgo-config.mjs';
import { getCollection } from 'astro:content';
import { MEDIA } from './media.js';
import { byOrder } from '../content.config';

// Drawings keep their names when they change and are cached for a day (_headers), but home.js inserts these into the
// page, so a stale one would meet new CSS, script and style hashes. Each address carries a hash of the file as the
// site serves it, after SVGO (?v=; shipped() in scripts/svgo-config.mjs), so a changed drawing is a new address,
// even when only SVGO's output changed.
const fresh = (path: string) => `${path}?v=${createHash('sha1').update(shipped(path)).digest('hex').slice(0, 8)}`;

// written by tools/gen_office.py. tablet: where the full cut's 21-unit sublines measure under 12px (the hero is
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
    tablet: '(min-width: 600px) and (max-width: 1299px) and (max-height: 1099px)',
    full: '(min-width: 1300px), (min-width: 600px) and (min-height: 1100px)',
  },
};

// the footer's campus map, written by tools/gen_campus.py (footer.js fetches it on every page)
export const CAMPUS = fresh('/assets/img/campus.svg');

export const PAGES = {
  home: { path: '/', name: 'Home', title: 'Uplink Technology · Managed IT for Ontario businesses',
    description: 'Outsourced IT for Ontario businesses: help desk, security, cloud, networks and phones, run by one in-house team.' },
  services: { path: '/services', name: 'Services', title: 'Services · Uplink Technology',
    description: 'Managed help desk, cybersecurity, Microsoft 365 and Google Workspace, networks, backup and IT planning for Ontario businesses.' },
  work: { path: '/work', name: 'Our work', title: 'Our work · Uplink Technology',
    description: 'Office moves, security lockdowns, Microsoft 365 and Google moves, and backup projects we built and still run.' },
  about: { path: '/about', name: 'About', title: 'About · Uplink Technology',
    description: 'Uplink Technology is an in-house team of 22 technicians running IT for Ontario businesses since 2011.' },
  contact: { path: '/contact', name: 'Contact', title: 'Contact · Uplink Technology',
    description: 'Call, email or book a free IT check-up with Uplink Technology. A real person replies within one business day.' },
  privacy: { path: '/privacy', name: 'Privacy', title: 'Privacy · Uplink Technology',
    description: 'What this website collects, why, who handles it and where, how long it is kept, and your rights under Canadian law.' },
  accessibility: { path: '/accessibility', name: 'Accessibility', title: 'Accessibility · Uplink Technology',
    description: 'How we build this website to WCAG 2.0 AA, the aids built into it, its known limits, and how to give feedback.' },
} as const;

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
  const bare = (p: string) => p.replace(/(\/index)?(\.html)?\/?$/, '');   // the build sees /index.html, /services.html
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
export const businessNode = (site: URL) => ({ '@type': 'ProfessionalService', '@id': `${site.href}#business`, name: 'Uplink Technology', url: site.href });
// A BreadcrumbList from [name, address] pairs, Home first.
export const breadcrumbs = (trail: [string, string][]) => ({ '@type': 'BreadcrumbList',
  itemListElement: trail.map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item })) });

// The services and the projects in their own order (each entry's `order`), as every list shows them.
export const getServices = async () => (await getCollection('services')).sort((a, b) => a.data.order - b.data.order);
export const getProjects = async () => (await getCollection('projects')).sort((a, b) => a.data.order - b.data.order);
export const getGrow = async () => (await getCollection('grow')).sort(byOrder).map((e) => e.data);   // in file order

// The source files behind each static page, for lastmod. Shared parts (layout, header, footer) are left out
// on purpose: a footer tweak is not a reason for a crawler to refetch every page.
const SOURCES: Record<keyof typeof PAGES, string[]> = {
  home: ['src/pages/index.astro', 'src/components/home', 'src/data/grow.json', 'src/content/services', 'src/content/projects'],
  services: ['src/pages/services.astro', 'src/components/services', 'src/content/services', 'src/data/faq.json'],
  work: ['src/pages/work.astro', 'src/components/work', 'src/content/projects'],
  about: ['src/pages/about.astro', 'src/components/about', 'src/data/team.json'],
  contact: ['src/pages/contact.astro', 'src/components/contact', 'src/content/services', 'src/components/ServiceOptions.astro'],
  privacy: ['src/pages/privacy.astro', 'src/data/privacy.md'],
  accessibility: ['src/pages/accessibility.astro', 'src/data/accessibility.md'],
};

export type SitePage = { path: string; name: string; description: string; lastmod?: string };

/** ISO date of the last commit that touched any of the paths, or undefined outside a git checkout. */
export function lastmod(paths: string[]): string | undefined {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', ...paths], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return out ? out.slice(0, 10) : undefined;
  } catch {
    return undefined;
  }
}

/** ISO date of the first commit that added any of the paths (the oldest), or undefined outside a git checkout. */
export function created(paths: string[]): string | undefined {
  try {
    const out = execFileSync('git', ['log', '--diff-filter=A', '--format=%cI', '--', ...paths], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return out ? out.split('\n').pop()!.slice(0, 10) : undefined;
  } catch {
    return undefined;
  }
}

export async function allPages(): Promise<SitePage[]> {
  const services = await getServices();
  const projects = await getProjects();
  return [
    ...(Object.keys(PAGES) as (keyof typeof PAGES)[]).map((k) => ({ ...PAGES[k], lastmod: lastmod(SOURCES[k]) })),
    ...services.map(({ id, data: s }) => ({ path: `/services/${id}`, name: s.title, description: s.card,
      lastmod: lastmod([`src/content/services/${id}.json`, 'src/components/services/ServiceCard.astro', 'src/pages/services/[slug].astro', 'src/content/projects']) })),
    ...projects.map(({ id, data: p }) => ({ path: `/work/${id}`, name: p.name, description: `${p.client}. ${p.result}.`,
      lastmod: lastmod([`src/content/projects/${id}.json`, 'src/components/work/ProjectCase.astro', 'src/pages/work/[slug].astro', 'src/content/services']) })),
  ];
}
