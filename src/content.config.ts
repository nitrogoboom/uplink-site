// The site's content, typed. Services and projects are one JSON file each (the file name is the slug and the
// page address: src/content/services/help-desk.json → /services/help-desk). Smaller lists are one file each
// in src/data/. Every page, card, footer link and JSON-LD block reads from here, so a service or project is
// added in one place.
import { defineCollection, reference, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

const services = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/services' }),
  schema: z.object({
    order: z.number(),
    title: z.string(),                 // "Managed help desk"
    chip: z.enum(['Support', 'Protect', 'Build', 'Connect', 'Plan']),
    tag: z.string(),                   // second chip on the drawing ("Starts day one")
    image: z.string(),                 // drawing name in public/assets/img/ (NAME.svg and NAME-compact.svg)
    icon: z.string(),                  // <Icon> name for the short home tile (src/components/Icon.astro)
    featured: z.boolean().optional(),  // one of the three tall cards on the home page; the rest are short tiles
    alt: z.string(),
    lead: z.string(),
    card: z.string(),                  // one line on the home page card
    features: z.array(z.object({ title: z.string(), detail: z.string() })).length(3),
    bestFor: z.string(),
    footerLabel: z.string().optional(),   // when the footer link says it differently
    optionLabel: z.string().optional(),   // when the "What do you need?" option says it differently
    page: z.object({                   // only on the service's own page (/services/<slug>)
      heading: z.string(),             // "How it works" section title
      body: z.array(z.string()).min(2),   // its paragraphs
      faq: z.array(z.object({ q: z.string(), a: z.string() })).min(2),
    }),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/projects' }),
  schema: z.object({
    order: z.number(),
    name: z.string(),
    tag: z.enum(['Build', 'Protect', 'Plan']),   // the filter on the Work page is its lower-case form
    client: z.string(),                 // "Law office, 18 staff"
    clientShort: z.string(),            // "Law office · 18 staff" (card)
    services: z.array(reference('services')).min(1),   // service slugs: ["network", "help-desk"]; the case study links them, the service page lists the project
    result: z.string(),
    image: z.string(),
    alt: z.string(),
    story: z.string(),
    page: z.object({                   // only on the project's own page (/work/<slug>)
      timeline: z.string(),            // "Six weeks"
      challenge: z.array(z.string()).min(1),   // paragraphs: where they started
      steps: z.array(z.object({ title: z.string(), detail: z.string() })).min(3),
      results: z.array(z.string()).min(2),     // one line each, with a number where there is one
    }),
  }),
});

// A plain JSON list: the entry's id is its place in the file ("1", "2" …), so the page keeps the file's order
// (the store sorts by id otherwise). Read with byOrder() below.
const numbered = (t: string) => JSON.parse(t).map((e: object, i: number) => ({ id: String(i + 1), ...e }));
export const byOrder = <T extends { id: string }>(a: T, b: T) => Number(a.id) - Number(b.id);

const faq = defineCollection({
  loader: file('./src/data/faq.json', { parser: numbered }),
  schema: z.object({ q: z.string(), a: z.string() }),
});

const team = defineCollection({
  loader: file('./src/data/team.json', { parser: numbered }),
  schema: z.object({ initials: z.string(), name: z.string(), role: z.string() }),
});

export const collections = { services, projects, faq, team };
