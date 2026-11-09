// The site's content, typed. Services and projects are one JSON file each (the file name is the slug and the
// page address: src/content/services/help-desk.json → /services/help-desk). Smaller lists are one file each
// in src/data/. Every page, card, footer link and JSON-LD block reads from here, so a service or project is
// added in one place.
// Every object is strict: a key the schema doesn't name (a typo, a field left from a rename) stops the build
// instead of being dropped. Icon names come from src/components/icons.ts; a drawing name must have its files in
// public/assets/img/.
import { defineCollection, reference } from 'astro:content';
import { z } from 'astro/zod';
import { glob, file } from 'astro/loaders';
import { existsSync, readdirSync } from 'node:fs';
import { ICON_NAMES } from './components/icons';
import { COPY, type CopyName } from './lib/copy-schema';

// A drawing's name, with the cuts the pages show (NAME.svg, NAME-compact.svg …) checked in public/assets/img/.
const drawing = (...cuts: string[]) =>
  z.string().superRefine((name, ctx) => {
    const missing = cuts.map((c) => `public/assets/img/${name}${c}.svg`).filter((f) => !existsSync(f));
    if (missing.length)
      ctx.addIssue({ code: 'custom', message: `no drawing ${missing.join(', ')} (tools/gen_*.py writes it)` });
  });
export const icon = z.enum(ICON_NAMES);

const services = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/services' }),
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
    card: z.string(), // the short line on every card and menu entry, and in llms.txt
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
  loader: glob({ pattern: '*.json', base: './src/content/projects' }),
  schema: z.strictObject({
    order: z.number(),
    name: z.string(),
    tag: z.enum(['Build', 'Protect', 'Plan']), // the filter on the Work page is its lower-case form
    client: z.string(), // "Law office, 18 staff"
    clientShort: z.string(), // "Law office · 18 staff" (card)
    services: z.array(reference('services')).min(1), // service slugs: ["network", "help-desk"]; the case study links them, the service page lists the project
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

// A plain JSON list: the entry's id is its place in the file ("1", "2" …), so the page keeps the file's order
// (the store sorts by id otherwise). Read with byOrder() below.
const numbered = (t: string) => JSON.parse(t).map((e: object, i: number) => ({ id: String(i + 1), ...e }));
export const byOrder = <T extends { id: string }>(a: T, b: T) => Number(a.id) - Number(b.id);
// a list entry's schema: its own fields, plus the id numbered() gave it (the loader keeps it in the entry's data)
const item = <T extends z.ZodRawShape>(shape: T) => z.strictObject({ id: z.string(), ...shape });

const faq = defineCollection({
  loader: file('./src/data/faq.json', { parser: numbered }),
  schema: item({ q: z.string(), a: z.string() }),
});

const team = defineCollection({
  loader: file('./src/data/team.json', { parser: numbered }),
  schema: item({ initials: z.string(), name: z.string(), role: z.string() }),
});

// Home "We grow with you": one entry a step, in the order they play. `at` names the drawing's anchor a tag sits on
// (a .tg-a circle in grow-world.svg, tools/gen_grow.py).
const grow = defineCollection({
  loader: file('./src/data/grow.json', { parser: numbered }),
  schema: item({
    place: z.string(), // "Your office" (top left of the picture, and the dot's label)
    title: z.string(), // the card's heading
    watch: z.string(), // "Watch for"
    handle: z.string(), // "We handle"
    team: z.number().int().positive(), // "Team of 8"
    tags: z.array(z.strictObject({ at: z.string().regex(/^s\d+[a-z]$/), risk: z.string(), fix: z.string() })).min(1),
  }),
});

// The site's words: one YAML file a page or area in src/data/copy/, each its own collection checked against its schema
// in src/lib/copy-schema.ts (a missing or unknown key stops the build). Read them with copy() from src/lib/copy.ts.
// A YAML file there with no schema stops the build too, so no file is read by nothing.
const COPY_DIR = './src/data/copy';
const unknown = readdirSync(COPY_DIR).filter((f) => !(f.replace(/\.yaml$/, '') in COPY));
if (unknown.length)
  throw new Error(`src/data/copy/: ${unknown.join(', ')} has no schema (COPY in src/lib/copy-schema.ts)`);
const copy = <N extends CopyName>(name: N) =>
  defineCollection({ loader: glob({ pattern: `${name}.yaml`, base: COPY_DIR }), schema: COPY[name] });

export const collections = {
  services,
  projects,
  faq,
  team,
  grow,
  'copy-ui': copy('ui'),
  'copy-home': copy('home'),
  'copy-about': copy('about'),
  'copy-services': copy('services'),
  'copy-work': copy('work'),
  'copy-contact': copy('contact'),
  'copy-soon': copy('soon'),
  'copy-not-found': copy('not-found'),
  'copy-text-pages': copy('text-pages'),
};
