# Source code map

Where things live in `src/`. Setup: [project README](../README.md).

## Pages

One file in `pages/` per address; sections are components in `components/PAGE/`.

| File | Address | Sections |
| --- | --- | --- |
| `index.astro` | `/` | Hero, Services, Grow, Work, Reviews (Proof, the check-up card, at its foot) |
| `services.astro`, `services/[slug].astro` | `/services`, `/services/SLUG` | Overview, Faq; one page per `content/services/SLUG.json` |
| `work.astro`, `work/[slug].astro` | `/work`, `/work/SLUG` | Projects (filters are radios; `workFilterCss()` in `lib/site.ts`); one page per `content/projects/SLUG.json` |
| `about.astro`, `contact.astro` | `/about`, `/contact` | Profile, Process, Team; Message, Support |
| `privacy.astro`, `accessibility.astro` | | `data/*.md` through `components/TextPage.astro` |
| `soon.astro`, `404.astro` | `/soon`, missing addresses | inline |
| `sitemap.xml.ts`, `robots.txt.ts`, `llms.txt.ts`, `index.md.ts`, `agents.md.ts`, `.well-known/security.txt.ts` | those files | from `lib/site.ts`, the collections, `data/*.md` |

`layouts/Base.astro` is the shared head, header, footer, phone tab bar, pop-ups and toasts. Props: `title`, `description`, `page` (current tab), `path`, `robots`, `ogType`, `type` (schema.org), `ldPage`, `ldGraph`, `footer` (`false` on the 404). `PAGES` in `lib/site.ts` lists each static page's address and menu name; titles and descriptions come from `pageMeta('NAME')`. Dates: `lib/git-dates.mjs`.

## Components

| Component | What |
| --- | --- |
| `Header.astro`, `BottomNav.astro` | Header and phone tab bar |
| `Footer.astro` | Six `<details name="footer">` sections; data `data/footer.json` (import via `lib/footer.ts`), CSS `styles/footer.css`, map `tools/gen_campus.py`. Desktop: panel + map + tiles; tablet: tiles, map, panel; below 700px: rows, no map |
| `BookDialog.astro`, `SettingsDialog.astro` | Pop-ups; Settings has theme and Reduce motion |
| `Drawing.astro` | A drawing in both themes (`NAME.svg`, `NAME-light.svg`) |
| `TextPage.astro` | Privacy and accessibility Markdown, placeholders filled |
| `HoldButton.astro`, `Pause.astro`, `Sep.astro` | Shared pause button; screen-reader pause; " · " heard as a comma |
| `Icon.astro`, `icons.ts` | Icons by name; add to `ICONS` |
| `ServiceOptions.astro`, `Words.astro` | Service `<option>`s; a page script's words as JSON |

Section CSS sits beside its component (`hero.css` by `Hero.astro`). A card in a list is `<div class="card">` with `<h2 class="card-title {fit(title)}"><a class="card-link">`; the link's `::after` covers the card. `components/home/hero-flows.svg` and `grow-world.svg` are generated: don't edit.

## Content and copy

- Collections: `content.config.ts` (strict). Lists: `data/faq.json`, `team.json`, `grow.json`, `reviews.json`, `footer.json`.
- Words in components and scripts: `data/copy/en/*.yaml` (`ui.yaml` shared, one per page, `text-pages.yaml`), schemas in `lib/copy-schema.ts`. Read with `await copy('home')`; templates with `fill()`. Scripts get words via `<Words>` and `words()`.
- `data/index.md`, `data/agents.md`: hand-written Markdown for agents. Other pages' `.md` copies are generated from `<main>` (`scripts/markdown.mjs`; `data-md-skip` leaves a part out).

## Styles

`styles/global.css` imports in cascade order: tokens and themes, base and type; shared parts (header, buttons, surfaces, forms, dialogs, footer, tab bar); `shared-blocks.css`, `fold.css`, `compact-cuts.css`; multi-page blocks; `motion.css`, `print.css`. Tokens: `styles/tokens.css` (dark), `theme-light.css`, `theme-drawings.css` (generated).

- Theme: `html[data-theme]`, set before paint by `Base.astro`, kept by `core.js`; dark without script.
- Headings: `min(var(--fs-8|7), var(--fit))` in a `container-type: inline-size` column; `fit(text)` from `lib/fit.js` picks `fit` (a 10+ letter word) or `fit-loose`. Never smaller as zoom grows.
- Reduced motion: plain `prefers-reduced-motion` rules; `postcss.config.mjs` scopes them to the Settings choice. Scripts use `reduceMotion` from `core.js`.
- Forced colours and `prefers-contrast: more`: handled beside each rule and in `tokens.css`.

Breakpoints, named in `lib/media.js` (CSS `@media (--phone)`, scripts `MEDIA`), in `em`:

| Name | Query | px at 16 |
| --- | --- | --- |
| `smallPhone` | `width < 37.5em` | < 600 |
| `phone` | `width < 43.75em` | < 700 |
| `tablet` | `43.75em <= width < 68.75em` | 700–1099 |
| `desktop` | `width >= 68.75em` | 1100+ |
| `fold` | desktop and `height >= 43.75em` | one section per screen |

## Scripts

ES modules in `scripts/`; each page script imports `core.js` first. Type-checked by JSDoc (`checkJs`); `void` an unawaited promise.

| Script | Runs on | Does |
| --- | --- | --- |
| `core.js` | every page | helpers, toasts, pop-ups, forms, theme, pause state, phone tab bar hide-on-scroll, error reports, `html()` (Trusted Types), keyboard map |
| `footer.js` | every page | footer map and open section, newsletter mockup |
| `home.js`, `grow.js` | Home | hero cut, cloud, captions, phone Services row; the Grow world |
| `contact.js`, `soon.js` | Contact, Soon | copy buttons and queue card; names the missing page |
