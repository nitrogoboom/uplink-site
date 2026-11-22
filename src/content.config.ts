// The site's content, typed. Everything a visitor reads is in src/content/<language>/ (en today; a fr/ folder beside
// it is French): services and projects one JSON file each (the file name is the slug and the page address:
// en/services/help-desk.json → /services/help-desk), the smaller lists one file each, and the pages' own words in
// copy/*.yaml. Every page, card, footer link and JSON-LD block reads from here, so a service or project is added in
// one place. Read them through src/lib/site.ts and src/lib/copy.ts, which take the page's language.
// Every object is strict: a key the schema doesn't name (a typo, a field left from a rename) stops the build
// instead of being dropped. Icon names come from src/components/icons.ts; a drawing name must have its files in
// public/assets/img/.
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { existsSync } from 'node:fs';
import { ICON_NAMES } from './components/icons';

const BASE = './src/content';
// one file an entry, in a folder per language: en/services/help-desk.json is "en/help-desk"
const entries = (folder: string, ext = 'json') =>
  glob({
    pattern: `*/${folder}/*.${ext}`,
    base: BASE,
    generateId: ({ entry }) => entry.replace(`/${folder}/`, '/').replace(/\.\w+$/, ''),
  });
// one file a language, holding a list in its own order: en/faq.json is "en"
const list = (name: string) =>
  glob({ pattern: `*/${name}.json`, base: BASE, generateId: ({ entry }) => entry.split('/')[0] });
const items = <T extends z.ZodRawShape>(shape: T) => z.strictObject({ items: z.array(z.strictObject(shape)).min(1) });

// A drawing's name, with the cuts the pages show (NAME.svg, NAME-compact.svg …) checked in public/assets/img/.
const drawing = (...cuts: string[]) =>
  z.string().superRefine((name, ctx) => {
    const missing = cuts.map((c) => `public/assets/img/${name}${c}.svg`).filter((f) => !existsSync(f));
    if (missing.length)
      ctx.addIssue({ code: 'custom', message: `no drawing ${missing.join(', ')} (tools/gen_*.py writes it)` });
  });
export const icon = z.enum(ICON_NAMES);

const services = defineCollection({
  loader: entries('services'),
  schema: z.strictObject({
    order: z.number(),
    title: z.string(), // "Managed help desk"
    chip: z.enum(['Support', 'Protect', 'Build', 'Connect', 'Plan']),
    tag: z.string(), // second chip on the drawing ("Starts day one")
    image: drawing('', '-compact', '-card'), // drawing name in public/assets/img/ (NAME.svg, NAME-compact.svg, NAME-card.svg)
    icon, // <Icon> name for the short home tile (src/components/Icon.astro)
    featured: z.boolean().optional(), // one of the three tall cards on the home page; the rest are short tiles
    alt: z.string(),
    lead: z.string(),
    card: z.string(), // the short line on every card and menu entry
    features: z.array(z.strictObject({ title: z.string(), detail: z.string() })).length(3),
    bestFor: z.string(),
    footerLabel: z.string().optional(), // when the footer link says it differently
    optionLabel: z.string().optional(), // when the "What do you need?" option says it differently
    page: z.strictObject({
      // only on the service's own page (/services/<slug>)
      heading: z.string(), // "How it works" section title
      body: z.array(z.string()).min(2), // its paragraphs
      faq: z.array(z.strictObject({ q: z.string(), a: z.string() })).min(2),
    }),
  }),
});

const projects = defineCollection({
  loader: entries('projects'),
  schema: z.strictObject({
    order: z.number(),
    name: z.string(),
    tag: z.enum(['Build', 'Protect', 'Plan']), // the filter on the Work page is its lower-case form
    client: z.string(), // "Law office, 18 staff"
    clientShort: z.string(), // "Law office · 18 staff" (card)
    services: z.array(z.string()).min(1), // service slugs: ["network", "help-desk"] (getProjects() checks each exists); the case study links them, the service page lists the project
    result: z.string(),
    image: drawing('', '-card'), // NAME.svg (the case study), NAME-card.svg (the card)
    alt: z.string(),
    story: z.string(),
    page: z.strictObject({
      // only on the project's own page (/work/<slug>)
      timeline: z.string(), // "Six weeks"
      challenge: z.array(z.string()).min(1), // paragraphs: where they started
      steps: z.array(z.strictObject({ title: z.string(), detail: z.string() })).min(3),
      results: z.array(z.string()).min(2), // one line each, with a number where there is one
    }),
  }),
});

const faq = defineCollection({
  loader: list('faq'),
  schema: items({ q: z.string(), a: z.string() }),
});

const team = defineCollection({
  loader: list('team'),
  schema: items({ initials: z.string(), name: z.string(), role: z.string() }),
});

// Home "We grow with you": one entry a step, in the order they play. `at` names the drawing's anchor a tag sits on
// (a .tg-a circle in grow-world.svg, tools/gen_grow.py).
const grow = defineCollection({
  loader: list('grow'),
  schema: items({
    place: z.string(), // "Your office" (top left of the picture, and the dot's label)
    title: z.string(), // the card's heading
    watch: z.string(), // "Watch for"
    handle: z.string(), // "We handle"
    tags: z.array(z.strictObject({ at: z.string().regex(/^s\d+[a-z]$/), risk: z.string(), fix: z.string() })).min(1),
  }),
});

// Home "What clients say": sample reviews until the real ones come from Google (notes.md). One entry may be `featured`
// (the big card); the rest are the small cards, in file order.
const reviews = defineCollection({
  loader: list('reviews'),
  schema: items({
    featured: z.boolean().optional(),
    quote: z.string(),
    name: z.string(),
    initials: z.string().max(3),
    role: z.string(), // "Office manager"
    company: z.string(), // "Whitfield & Lo, law office"
    rating: z.number().int().min(1).max(5), // not shown yet: every sample is 5; the real ones will vary
    date: z.string().regex(/^\d{4}-\d{2}$/), // "2026-10": the page shows "October 2026" in a <time>
  }),
});

// The pages' own words: one YAML file a page or area (en/copy/home.yaml is "en/home"), with no schema: the YAML is
// the only place a key is written. Read them with copy() from src/lib/copy.ts (a key the YAML lacks throws).
const copy = defineCollection({ loader: entries('copy', 'yaml') });

export const collections = { services, projects, faq, team, grow, reviews, copy };
