# Source code map

Where things live in `src/`. Setup: [project README](../README.md).

## Pages

One file in `pages/[...locale]/` per address, built once per language (English at `/`, any other at `/<language>/`; `lib/i18n.ts`); sections are components in `components/PAGE/`.

| File | Address | Sections |
| --- | --- | --- |
| `index.astro` | `/` | Hero, Services, Grow, Work, Reviews (Proof, the check-up card, at its foot) |
| `services.astro`, `services/[slug].astro` | `/services`, `/services/SLUG` | Overview, Faq; one page per `content/en/services/SLUG.json` |
| `work.astro`, `work/[slug].astro` | `/work`, `/work/SLUG` | Projects (filters are radios; `workFilterCss()` in `lib/site.ts`); one page per `content/en/projects/SLUG.json` |
| `about.astro`, `contact.astro` | `/about`, `/contact` | Profile, Process, Team; Message, Support |
| `privacy.astro`, `accessibility.astro` | | `content/en/*.md` through `components/TextPage.astro` |
| `soon.astro`; `pages/404.astro`, `pages/[locale]/404.astro` | `/soon`, missing addresses | inline; `components/NotFound.astro` |
| `sitemap.xml.ts`, `robots.txt.ts`, `llms.txt.ts`, `version.txt.ts`, `.well-known/security.txt.ts` (in `pages/`) | those files | from `lib/site.ts` and the collections; `version.txt` is the build's commit; `llms.txt` tells AI tools what the site is and lists its pages |

`layouts/Base.astro` is the shared head, header, footer, phone tab bar, pop-ups and toasts. Props: `title`, `description`, `page` (current tab), `path`, `robots`, `ogType`, `type` (schema.org), `ldPage`, `ldGraph`, `footer` (`false` on the 404). `PAGES` in `lib/site.ts` lists each static page's address; its name is `pages` in `ui.yaml` (`pageName('NAME')`), its title and description come from `pageMeta('NAME')`.

## Components

| Component | What |
| --- | --- |
| `Header.astro`, `BottomNav.astro` | Header and phone tab bar |
| `Footer.astro` | Five `<details name="footer">` sections; data `content/en/footer.json` (import via `lib/footer.ts`), CSS `styles/footer.css`, map `tools/gen_campus.py`. Desktop: panel + map + tiles; tablet: map, panel, tiles; below 700px: rows, no map |
| `BookDialog.astro`, `SettingsDialog.astro` | Pop-ups; Settings has theme and Reduce motion |
| `Drawing.astro` | A drawing in both themes (`NAME.svg`, `NAME-light.svg`) |
| `TextPage.astro` | Privacy and accessibility Markdown, placeholders filled |
| `HoldButton.astro`, `Pause.astro`, `Sep.astro` | Shared pause button; screen-reader pause; " · " heard as a comma |
| `Icon.astro`, `icons.ts` | Icons by name; add to `ICONS` |
| `ServiceOptions.astro`, `Words.astro` | Service `<option>`s; a page script's words as JSON |

Section CSS sits beside its component (`hero.css` by `Hero.astro`). A card in a list is `<div class="card">` with `<h2 class="card-title {fit(title)}"><a class="card-link">`; the link's `::after` covers the card. `components/home/hero/*.svg` (the hero's layers), `hero-crop.css` and `grow-world.svg` are generated: don't edit.

## Content and copy

- Everything a visitor reads is in `content/en/` (a language a folder; `fr/` beside it would be French, falling back to English). Collections: `content.config.ts` (strict). Lists: `faq.json`, `team.json`, `grow.json`, `reviews.json`, `footer.json`.
- Words in components and scripts: `content/en/copy/*.yaml` (`ui.yaml` shared, one per page, `text-pages.yaml`), with no schema: to add a string, add it to the YAML and read it. Read with `await copy('home', Astro.currentLocale)` (a key the YAML lacks stops the build); templates with `fill()`. Scripts get words via `<Words>` and `words()`.

## Styles

`styles/global.css` imports in cascade order: tokens and themes, base and type; shared parts (header, buttons, surfaces, forms, dialogs, footer, tab bar); `shared-blocks.css`, `fold.css`, `compact-cuts.css`; multi-page blocks; `motion.css`, `print.css`. Tokens: `styles/tokens.css` (dark), `theme-light.css`, `theme-drawings.css` (generated).

- Theme: `html[data-theme]`, set before paint by `Base.astro`, kept by `core.js`; dark without script.
- Headings: `min(var(--fs-8|7), var(--fit))` in a `container-type: inline-size` column; `fit(text)` from `lib/fit.js` picks `fit` (a 10+ letter word) or `fit-loose`. Never smaller as zoom grows.
- Reduced motion: plain `prefers-reduced-motion` rules; `postcss.config.mjs` scopes them to the Settings choice. Scripts use `reduceMotion` from `core.js`.
- Forced colours and `prefers-contrast: more`: handled beside each rule and in `tokens.css`.

Breakpoints, named in `lib/media.js` (CSS `@media (--phone)`; the three a script asks about are its `PHONE`, `TABLET_UP` and `SHORT_WINDOW`), in `em`:

| Name | Query | px at 16 |
| --- | --- | --- |
| `tiny` / `notTiny` | `width < 20em` / `>= 20em` | < 320: a phone at 200% text |
| `smallPhone` | `width < 37.5em` | < 600 |
| `phone` | `width < 43.75em` | < 700 |
| `tablet` | `43.75em <= width < 68.75em` | 700–1099 |
| `wide` | `width >= 56.25em` | 900+: text and picture side by side |
| `desktop` | `width >= 68.75em` | 1100+ |
| `fold` | desktop and `height >= 43.75em` | 700+ tall: one section per screen (a fold); Home's space on the fold scale (`docs/design.md`), fit promised from 1280×720 |
| `foldMenu` / `foldMenuShort` | desktop and `height >= 50em` / `50em <= height < 56.5em` | 800+ tall: the Home hero's menu; 800–903: without its sublines |
| `shortWindow` | `height < 33.5em` | under 536 tall: the header slides away while reading (`core.js`) |

Blocks inside the page's column (`main .container`, a query container named `column`) follow its width instead: `@container column (--col-tiny | --col-not-tiny | --col-narrow | --col-medium | --col-wide)`, `COLUMN` in `lib/media.js`. Each switches at the same window width as `tiny`, `phone`, `tabletUp` and `desktop`, because the side margin (`--gutter`) grows evenly with the window. Converted so far: cards, card rows, steps, call-to-action bands, stats (`surfaces.css`, `shared-blocks.css`).

A few sizes stay written out where they are, each measured for one thing: the header's 48.75em, 58.75em and 77.5em (`bottom-nav.css`), Grow's dots at 22.5em, project cards' title at 30em, the footer's 51.25em and the FAQ's 47.5em tall.

## Scripts

ES modules in `scripts/`, bundled into one file the whole site loads (`site.js` imports them all; `Base.astro` has the one `<script>`). Each part starts only where its elements are, so it guards itself: `if (stage) { … }`. Type-checked by JSDoc (`checkJs`); `void` an unawaited promise.

| Script | Runs on | Does |
| --- | --- | --- |
| `core.js` | every page | helpers, toasts, pop-ups, forms, theme, pause state, phone tab bar hide-on-scroll, `html()` (Trusted Types), keyboard map, the dash clock (the drawings' moving dashes) |
| `footer.js` | every page | footer map and open section, rows sliding open and shut (phones), newsletter mockup |
| `home.js`, `grow.js` | Home | the hero's cloud apps and dashes, phone Services row; the Grow world |
| `contact.js`, `soon.js` | Contact, Soon | copy buttons and queue card; names the missing page |
