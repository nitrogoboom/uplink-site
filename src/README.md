# src/ – the site

An Astro 7 project. `npm run dev` serves it at http://localhost:4321; `npm run build` writes `dist/`.

## Pages: `pages/`

| File | Address | Sections (one component each, in `components/<page>/`) |
|---|---|---|
| `index.astro` | `/` | home: Hero (+ office drawing) · Services · Grow (+ world drawing) · Work · Proof |
| `services.astro` | `/services` | Overview · Faq |
| `services/[slug].astro` | `/services/<slug>` | one page per service, from `content/services/<slug>.json` |
| `work.astro` | `/work` | Projects |
| `work/[slug].astro` | `/work/<slug>` | one page per project, from `content/projects/<slug>.json` |
| `about.astro` | `/about` | Profile · Process · Team |
| `contact.astro` | `/contact` | Message · Support |
| `soon.astro`, `404.astro` | `/soon`, any missing address | one section each, inline |
| `sitemap.xml.ts`, `robots.txt.ts`, `llms.txt.ts`, `index.md.ts`, `agents.md.ts` | those files | built from the data (`lib/site.ts`, the collections, `data/*.md`) |

A page is `<Base …>` with its sections inside. `layouts/Base.astro` is the shared `<head>`, header, footer, bottom bar, pop-ups and toast region; its props are the page's title, description, which tab is current (`page`), its address (`path`, for the canonical and Open Graph), `robots`, its schema.org `type`, and JSON-LD extras: `ldPage` (merged into the page's own node) and `ldGraph` (more nodes). The five static pages take title and description from `lib/site.ts` (`PAGES`).

Each section's desktop layout (`@media (min-width: 1100px) and (min-height: 700px)`) sits at the end of its own CSS file, so it always comes after that section's phone and tablet rules. There is no last-import rule any more.

## Shared parts: `components/`

- `Header.astro`, `BottomNav.astro` – logo, page tabs, the phone tab bar; `current` marks the page's tab
- `Footer.astro` – hero-select roster and campus map, from `data/footer.json` and the services collection
- `BookDialog.astro`, `ShortcutsDialog.astro` – the two pop-ups
- `ServiceOptions.astro` – the service `<option>`s for the two "What do you need?" lists
- `Icon.astro` – every inline icon by name; add new ones there

Section components live in `components/<page>/`, with their CSS beside them (`hero.css` next to `Hero.astro`) and imported at the top of the component. `services/ServiceCard.astro` and `work/ProjectCase.astro` render one service or project in full on its own page.

Drawings: `components/home/hero-flows.svg` and `grow-world.svg` are written by `tools/gen_office.py` and `tools/gen_grow.py` and inlined as components. Don't edit them by hand.

## Content: `content/` and `data/`

Typed in `content.config.ts`.

- `content/services/<slug>.json` – one per service. The slug is its address. Fields: order, title, chip, tag, icon, image (drawing name in `public/assets/img/`), alt, lead, card, features (3), bestFor, page (the longer copy only its own page shows: how it works, questions), and optional featured / footerLabel / optionLabel.
- `content/projects/<slug>.json` – one per project: order, name, tag, client, clientShort, services (service slugs), result, image, alt, story, and page (the case study).
- `data/faq.json`, `team.json`, `footer.json` – the smaller lists. Lists keep file order through `byOrder`.
- `data/index.md`, `data/agents.md` – hand-written Markdown for AI agents; `{site}` and `{services}` are filled in by their endpoints.

## Styles: `styles/`

`global.css` lists the shared files in cascade order (tokens, fonts, base, layout, type, header, …), ending with the blocks more than one page uses (`hero.css`, `facts.css`, `detail-pages.css`), then `page-transitions.css` and `motion.css`. `fold.css` is the desktop one-section-per-screen rules every page shares. Colours, sizes and timings stay in `tokens.css`. `tools/verify_styles.py` compares every element's computed style between two builds: run it after moving CSS.

## Scripts: `scripts/`

ES modules, bundled by Astro. `core.js` (helpers, toasts, pop-ups, forms, shortcuts, Trusted Types) and `footer.js` run on every page from `Base.astro`; `home.js`, `work.js`, `contact.js`, `soon.js` are imported by their page. Every page script imports `core.js`, so it always runs first. The keyboard map is at the top of `core.js`.
