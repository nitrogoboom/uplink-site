// The schema of each copy file in src/data/copy/en/ (one YAML file per page or area; ui.yaml is the shared UI and
// screen-reader text). content.config.ts makes each file a collection checked against its schema here, and
// src/lib/copy.ts reads them. Every object is strict: a key the schema doesn't name (a typo in the YAML) or one it
// names that the YAML lacks stops the build, with the file and the key's path in the message. A template ({n},
// {service} …) must hold exactly the names its schema lists; lib/fill.js fills them.
// To add a string: add its key to the YAML and here, then read it in the component (copy('home').hero.title).
import { z } from 'astro/zod';

const text = z.string().min(1);
// text holding exactly these {names}, each once or more
const tpl = (...names: string[]) =>
  text.superRefine((s, ctx) => {
    const found = new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
    const want = new Set(names);
    const missing = names.filter((n) => !found.has(n));
    const extra = [...found].filter((n) => !want.has(n));
    if (missing.length || extra.length)
      ctx.addIssue({
        code: 'custom',
        message: `the template needs ${names.map((n) => `{${n}}`).join(' ') || 'no {names}'}${missing.length ? `; missing ${missing.map((n) => `{${n}}`).join(' ')}` : ''}${extra.length ? `; unknown ${extra.map((n) => `{${n}}`).join(' ')}` : ''}`,
      });
  });
// an object of plain strings: texts('title', 'lead')
const texts = <K extends string>(...keys: K[]) =>
  z.strictObject(Object.fromEntries(keys.map((k) => [k, text])) as Record<K, typeof text>);
const obj = z.strictObject;
const list = <T extends z.ZodType>(item: T) => z.array(item).min(1);
const facts = list(texts('term', 'value')); // a <dl>: "Based in" / "Toronto, ON"
const band = texts('title', 'lead'); // a call-to-action band's heading and line

export const ui = obj({
  site: obj({ name: text, short: text, pageTitle: tpl('name'), ogImageAlt: text }),
  skipLink: text,
  header: obj({
    home: text,
    sub: text,
    nav: text,
    support: texts('label', 'text'),
    portal: texts('label', 'text'),
    settings: text,
  }),
  bottomNav: text,
  breadcrumb: text,
  hold: text,
  cta: texts('book'),
  dialog: texts('key', 'close'),
  form: obj({
    required: text,
    optional: text,
    choose: text,
    prototype: text,
    name: texts('label', 'title'),
    email: texts('label', 'title', 'placeholder', 'error'),
    company: text,
  }),
  book: obj({
    title: text,
    lead: text,
    nameError: text,
    size: obj({ label: text, options: list(text), error: text }),
    service: texts('label', 'unsure'),
    cancel: text,
    submit: text,
  }),
  settings: obj({
    title: text,
    theme: texts('legend', 'system', 'light', 'dark', 'note'),
    motion: texts('title', 'name', 'hint', 'device'),
  }),
  footer: obj({
    title: text,
    nav: text,
    contact: texts('tile'),
    links: tpl('n'), // a panel's eyebrow
    channels: tpl('n'), // Follow's eyebrow
    callOrEmail: text,
    office: text,
    follow: text,
    emailFor: text,
    subscribe: text,
    legal: text,
  }),
  toast: obj({
    dismiss: text,
    motionReduced: text,
    motionOn: text,
    booked: texts('title', 'text'),
    subscribed: texts('title', 'text'),
  }),
});

const app = texts('name', 'state', 'detail');
export const home = obj({
  title: text, // <title>
  description: text,
  business: text, // the business's description in Home's JSON-LD block
  hero: obj({
    eyebrow: list(text),
    title: text,
    accent: text,
    lead: text,
    cta: text,
    ctaNote: text,
    menu: text,
    alt: text,
    news: obj({ checkup: texts('tag', 'title', 'line'), windows: texts('tag', 'title', 'line') }),
  }),
  cloud: obj({
    title: text,
    apps: obj({ mail: app, files: app, meet: app, chat: app, cal: app, secure: app }),
  }),
  services: texts('eyebrow', 'title', 'seeAll', 'list', 'view', 'more', 'viewAll', 'previous', 'next', 'swipe'),
  grow: obj({
    eyebrow: text,
    title: text,
    lead: text,
    steps: text,
    play: texts('pause', 'play', 'again'),
    previous: text,
    next: text,
    dot: tpl('i', 'n', 'place'),
    watch: text,
    handle: text,
  }),
  work: texts('eyebrow', 'title', 'seeAll'),
  reviews: obj({
    eyebrow: text,
    title: text,
    accent: text,
    sample: text, // the note beside the stars that these are samples (remove with the real reviews)
    readAll: text,
    list: text, // the list's name
  }),
  proof: band,
});

export const about = obj({
  title: text, // <title>
  description: text,
  profile: obj({
    eyebrow: text,
    title: text,
    body: list(text),
    stats: list(texts('label', 'value')),
    card: obj({
      label: text,
      alt: text,
      since: text,
      line: text,
      knownFor: text,
      chips: list(text),
      facts,
    }),
  }),
  process: obj({ eyebrow: text, title: text, steps: list(texts('title', 'text')) }),
  team: obj({ eyebrow: text, title: text, cta: obj({ title: text, lead: text, join: text }) }),
});

export const services = obj({
  title: text, // <title>
  description: text,
  overview: texts('eyebrow', 'title', 'lead', 'list'),
  faq: obj({ eyebrow: text, title: text, cta: band }),
  page: obj({
    cta: text,
    how: text,
    questions: obj({ eyebrow: text, title: tpl('service') }),
    projects: texts('eyebrow', 'title'),
    count: tpl('n', 'total'),
    included: text,
    bestFor: text,
  }),
});

export const work = obj({
  title: text, // <title>
  description: text,
  projects: texts('eyebrow', 'title', 'lead', 'filter', 'all'),
  case: obj({
    client: text,
    services: text,
    timeline: text,
    result: text,
    story: texts('eyebrow', 'title', 'start', 'did', 'result'),
  }),
});

export const contact = obj({
  title: text, // <title>
  description: text,
  message: obj({
    eyebrow: text,
    title: text,
    lead: text,
    direct: text,
    call: text,
    copyPhone: text,
    email: text,
    copyEmail: text,
    book: text,
    form: obj({
      title: text,
      nameError: text,
      topic: texts('label', 'checkup', 'other', 'error'),
      message: texts('label', 'placeholder', 'error'),
      send: text,
    }),
    queue: obj({
      label: text,
      open: text,
      queued: text,
      reply: text,
      replyIn: text,
      title: text,
      facts,
    }),
  }),
  support: obj({
    eyebrow: text,
    title: text,
    lead: text,
    cards: obj({
      call: obj({ title: text, text: tpl('phone') }),
      ticket: texts('title', 'text'),
      remote: texts('title', 'text'),
    }),
  }),
  toast: obj({ copied: text, selected: texts('title', 'text'), received: texts('title', 'text') }),
});

export const soon = obj({
  title: text,
  description: text,
  eyebrow: text,
  heading: texts('page', 'rest'),
  lead: text,
  home: text,
  contact: text,
  pageTitle: tpl('name'),
  // the #parts the site links to (/soon#client-portal); a new one goes here and in the YAML
  names: texts(
    'client-portal',
    'remote-support',
    'system-status',
    'careers',
    'blog',
    'terms',
    'windows-10-guide',
    'security-checklist',
    'social',
    'francais',
  ),
});

export const notFound = texts('title', 'description', 'eyebrow', 'heading', 'lead', 'home', 'services', 'contact');

export const textPages = obj({
  privacy: texts('title', 'description', 'eyebrow', 'lead'),
  accessibility: texts('title', 'description', 'eyebrow', 'lead'),
});

// file name (src/data/copy/en/NAME.yaml) → its schema
export const COPY = {
  ui,
  home,
  about,
  services,
  work,
  contact,
  soon,
  'not-found': notFound,
  'text-pages': textPages,
} as const;
export type CopyName = keyof typeof COPY;
export type Copy<N extends CopyName> = z.infer<(typeof COPY)[N]>;

// What each page script reads in the browser: the JSON a page carries in <script type="application/json"> (copy.ts
// writes it; core.js's words() reads it).
export type UiWords = { toast: Copy<'ui'>['toast']; emailError: string };
export type HomeWords = { cloud: Copy<'home'>['cloud']; grow: Pick<Copy<'home'>['grow'], 'play'> };
export type ContactWords = Copy<'contact'>['toast'];
export type SoonWords = Pick<Copy<'soon'>, 'pageTitle' | 'names'>;
