// src/data/footer.json, checked against its schema when the build first imports it: the footer's lists, the contact
// details every page shows, and the spots on the campus map. Import from here, not from the JSON. A key the schema
// doesn't name, an icon <Icon> doesn't have or a panel pointing at a spot that isn't there stops the build, with
// the field's path in the message.
//   footer        the whole file, typed
//   PLACEHOLDERS  the values for {privacy} {accessibility} {phone} {tel} {email} {street} {city} {hours} in the
//                 Markdown copy (src/data/*.md; placeholders.mjs fills them)
// A heading is `title` plus an `accent` word, shown as "title <em>accent</em>", so the JSON holds no HTML.
import { z } from 'astro/zod';
import raw from '../data/footer.json';
import { ICON_NAMES } from '../components/icons';

const text = z.string().min(1);
const icon = z.enum(ICON_NAMES);
const link = z.strictObject({ label: text, href: z.string().startsWith('/') }); // root-relative, as every link
const SPOTS = ['hq', 'services', 'company', 'support', 'resources'] as const;
const spot = z.strictObject({ name: text, sub: text });

const schema = z.strictObject({
  contact: z.strictObject({ eyebrow: text, title: text, accent: text, lead: text }),
  panels: z.array(
    z
      .strictObject({
        id: text,
        map: z.enum(SPOTS), // its spot on the campus map
        title: text,
        lead: text,
        icon,
        tile: text, // its roster tile's word
        links: z.array(link).min(1).optional(), // every panel but Services, which lists the services collection
        more: link,
      })
      .refine((p) => p.id === 'services' || p.links, {
        message: 'a panel needs links (only Services takes them from the collection)',
        path: ['links'],
      }),
  ),
  // Contact's social icons and newsletter form
  follow: z.strictObject({
    socials: z.array(z.strictObject({ name: text, href: z.string().startsWith('/'), icon })).min(1),
    newsletter: z.strictObject({ name: text, note: text }),
  }),
  phone: z.strictObject({ display: text, href: z.string().regex(/^tel:\+\d+$/) }),
  email: z.email(),
  inboxes: z.strictObject({ privacy: z.email(), accessibility: z.email(), security: z.email() }),
  office: z.strictObject({ city: text, street: text }),
  hours: z.strictObject({ line: text, days: text }),
  legal: z.array(link).min(1),
  copyright: text,
  status: text,
  spots: z.strictObject(Object.fromEntries(SPOTS.map((k) => [k, spot])) as Record<(typeof SPOTS)[number], typeof spot>),
});

const parsed = schema.safeParse(raw);
if (!parsed.success)
  throw new Error(
    `src/data/footer.json doesn't match its schema (src/lib/footer.ts):\n${z.prettifyError(parsed.error)}`,
  );
export const footer = parsed.data;
export const { phone, email, inboxes, office, hours } = footer;

export const PLACEHOLDERS: Record<string, string> = {
  privacy: inboxes.privacy,
  accessibility: inboxes.accessibility,
  email,
  phone: phone.display,
  tel: phone.href.replace(/^tel:/, ''),
  street: office.street,
  city: office.city,
  hours: `${hours.line}, ${hours.days}`,
};
