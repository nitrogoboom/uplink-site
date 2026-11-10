# Source code map

*Last updated: November 9, 2026*

This page maps the `src/` folder: where each page, component, content file, stylesheet, and script lives, and how they fit together. For how to run and build the site, see the [project README](../README.md).

`src/` is an Astro 7 project. `npm run dev` serves it at http://localhost:4321, and `npm run build` writes the site to `dist/`.

## Pages

Each file in `pages/` is one address. Most pages are a stack of sections, with one component per section in `components/PAGE/`.

| File | Address | Sections |
| --- | --- | --- |
| `index.astro` | `/` | Hero (with the office drawing), Services, Grow (with the world drawing), Work, Reviews, and Proof |
| `services.astro` | `/services` | Overview and Faq |
| `services/[slug].astro` | `/services/SLUG` | One page per service, from `content/services/SLUG.json` |
| `work.astro` | `/work` | Projects. No page script: the filters are radios, and the CSS that hides the other cards (`workFilterCss()` in `lib/site.ts`) goes in its `<head>` |
| `work/[slug].astro` | `/work/SLUG` | One page per project, from `content/projects/SLUG.json` |
| `about.astro` | `/about` | Profile, Process, and Team |
| `contact.astro` | `/contact` | Message and Support |
| `privacy.astro`, `accessibility.astro` | `/privacy`, `/accessibility` | The Markdown in `data/privacy.md` or `data/accessibility.md`, rendered by `components/TextPage.astro` |
| `soon.astro`, `404.astro` | `/soon`, and any missing address | One section each, written inline |
| `sitemap.xml.ts`, `robots.txt.ts`, `llms.txt.ts`, `index.md.ts`, `agents.md.ts`, `.well-known/security.txt.ts` | Those files | Built from the data: `lib/site.ts`, the content collections, and `data/*.md` |

### The shared layout

Every page is `<Base …>` with its sections inside. `layouts/Base.astro` holds the shared `<head>`, the header, the footer, the phone tab bar, the pop-ups, and the toast region. It takes these props:

| Prop | What it sets |
| --- | --- |
| `title`, `description` | The page's `<title>` and meta description. |
| `page` | Which header tab is marked current. `soon`, `notfound`, `privacy`, and `accessibility` have no tab. |
| `path` | The page's address, for the canonical link and Open Graph. |
| `robots` | The robots meta tag. |
| `ogType` | `website` (the default) or `article`, which project pages use. |
| `type` | The page's schema.org type, such as `FAQPage` or `AboutPage`. |
| `ldPage` | More fields merged into the page's own JSON-LD node. |
| `ldGraph` | More nodes added to the page's JSON-LD graph. |
| `footer` | `false` leaves the footer out (the 404: one screen, nothing under it). Default `true`. With the footer comes a one-line contact block that shows only on paper (`.print-contact`), since print leaves the footer out. |

The seven static pages (the five in the menu, plus privacy and accessibility) are listed in `PAGES` in `lib/site.ts`: each one's address and menu name. Each page's `<title>` and description are copy: `title` and `description` at the top of its file in `data/copy/en/` (privacy's and accessibility's in `text-pages.yaml`, under the page's key). Read them with `await pageMeta('NAME')` from `lib/site.ts`; the page, the sitemap and `llms.txt` all do. The sitemap's dates, and a case study's, come from `lib/git-dates.mjs`: one function for both, scoped to the entry's own file.

A page adds its own script inside `<Base>`, like this:

```astro
<Fragment slot="scripts"><script>import '../scripts/home.js'</script></Fragment>
```

The script lands at the end of `<body>`. Put it inside `<Base>`: after `</Base>`, it would come after `</html>`.

## Components

### Shared components

| Component | What it is |
| --- | --- |
| `Header.astro`, `BottomNav.astro` | The logo, page tabs, and buttons; and the phone tab bar. `current` marks the page's tab. |
| `Footer.astro` | The footer. See [The footer](#the-footer). |
| `BookDialog.astro`, `SettingsDialog.astro` | The two pop-ups. Settings holds the theme (System, Light or Dark: radios in a fieldset, `.seg` in `forms.css`), and the Reduce motion switch. Text size is the browser's own zoom. |
| `Drawing.astro` | A drawing shown as a picture, in both themes: the dark `NAME.svg` and the light `NAME-light.svg`, one hidden by `theme-light.css`. Takes `src`, optional `sources` (a `<picture>`'s cuts), and the `<img>`'s own attributes. |
| `ServiceOptions.astro` | The service `<option>` items for both "What do you need?" lists. |
| `TextPage.astro` | Renders the privacy and accessibility Markdown. The contact placeholders are filled as it renders (`lib/placeholders.mjs`); TextPage stops the build if one is left. |
| `HoldButton.astro` | A pause button for animations. Every pause button on the page shares one state (see `core.js`). |
| `Pause.astro` | A pause for screen readers between two parts of one link, so the title doesn't run into the next words. Nothing shows on screen. |
| `Sep.astro` | The " · " between two short phrases. Screen readers hear a comma instead of "dot". |
| `Icon.astro`, `icons.ts` | Every inline icon, by name. Add new icons to `ICONS` in `icons.ts`; the content schemas accept only those names. |
| `Words.astro` | The words a page script shows, as a `<script type="application/json">` (`#words-ui` in `Base.astro`, `#words-page` for a page's own script). See [Copy](#copy). |

### Section components

Section components live in `components/PAGE/`. Each section's CSS sits beside it and is imported at the top of the component, for example `hero.css` next to `Hero.astro`. `services/ServiceCard.astro` and `work/ProjectCase.astro` render one service or project in full on its own page.

A card in a list of cards (the services on `/services`, `work/ProjectCard.astro`, Contact's help cards) is a `<div class="card">` whose title is a heading holding the link: `<h2 class="card-title {fit(title)}"><a class="card-link" href="…">`. Use `h2` when the cards sit right under the page's `h1` and `h3` under a section's `h2` (`ProjectCard`'s `level` prop). The link's `::after` covers the card, so a click anywhere opens it and the focus ring goes round the card (`styles/surfaces.css`); the rest of the card, chip included, is read as plain text, with no `<Pause />`. The Markdown copy makes each one line, "[Title](address): text". A chip is never `aria-hidden`: it tells which group a card is in (review M3, M10).

`components/home/hero-flows.svg` and `components/home/grow-world.svg` are drawings, inlined as components. `tools/gen_office.py` and `tools/gen_grow.py` write them. Don't edit them by hand.

### The footer

Every page has the same footer, except the 404 page, which is one screen with nothing under it (`footer={false}` on `Base`). The footer is one `<nav aria-label="Footer">` holding six `<details name="footer">` sections: Contact, Services, Company, Support, Resources, and Follow. Each section's `<summary>` is its tile, and the rest is its panel. The browser opens one section at a time, so the footer works the same with or without script. Tab reaches each tile, and Enter or Space opens it.

On desktop, the footer is at least one screen tall. It has three parts:

- **Stage:** the open section's panel on the left, and a live campus map on the right. One section is always open on tablet and desktop: `footer.js` opens Contact at load and again when a visitor shuts the one they picked. Without script, CSS shows Contact's panel while nothing is open.
- **Tile row:** the six summaries.
- **Base bar:** the brand, legal links, and status. The header's gear opens Settings.

On a tablet, the tile row comes first, then the map, then the panel. Below 700 px wide, the sections are six rows that open in place, with no map. A row grows open and shrinks shut where the browser can animate to `auto` (`interpolate-size`), and opens at once elsewhere and with reduced motion. The browser's own scroll anchoring keeps a tapped row in place while the one above it shuts.

The lists come from `data/footer.json`, checked by its schema in `lib/footer.ts`, and the Services panel comes from the services collection. The layout is `styles/footer.css`: the summaries and panels are items of one grid (`.fc-deck`), so CSS alone places the tile row and the open panel. Each section has a `data-map` value that names a spot on the map. The map's label holds all six spots' words, and CSS shows the open section's. `tools/gen_campus.py` draws the map: `SPOTS` lists the spots and `ORDER` sets the back-to-front draw order. For what `footer.js` does, see [Scripts](#scripts).

> **Note:** A browser that can't place a `<details>` panel (no `::details-content`: Firefox before 143, Safari before 18.4) shows the six rows on every screen, with no map. Without `<details name>` (Firefox before 130, Safari before 17.2), more than one row can be open at once. Firefox ESR 140 gets the rows; Safari and Chrome get the tiles. Only Chromium is tested here: check the footer on a real iPhone and in Firefox before a release.

## Content

The content types are defined in `content.config.ts`, and `footer.json`'s in `lib/footer.ts`. Every object is strict: a key the schema doesn't name stops the build, as do an `icon` that isn't in `components/icons.ts` and an `image` whose drawings aren't in `public/assets/img/`. Import the footer data from `lib/footer.ts`, never from the JSON.

| File | What it holds |
| --- | --- |
| `content/services/SLUG.json` | One service. The slug is its address. Fields: `order`, `title`, `chip`, `tag`, `icon`, `image` (the drawing's name in `public/assets/img/`), `alt`, `lead`, `card`, `features` (three), `bestFor`, and `page`, which is the longer copy only the service's own page shows. Optional: `featured`, `footerLabel`, and `optionLabel`. |
| `content/projects/SLUG.json` | One project. Fields: `order`, `name`, `tag`, `client`, `clientShort`, `services` (service slugs), `result`, `image`, `alt`, `story`, and `page` (the case study). |
| `data/faq.json`, `data/team.json`, `data/grow.json`, `data/reviews.json` | The smaller lists. `reviews.json` is Home's client reviews (sample ones for now): the one marked `featured` is the big card; `date` is `YYYY-MM`. They keep their file order through `byOrder`; the content store would otherwise sort them by ID. |
| `data/footer.json` | The footer's lists, the contact details, and the map's spots. `lib/footer.ts` checks it against its schema and exports it typed. A heading with an emphasized word is `title` plus `accent` ("Reach" + "us"); the JSON holds no HTML. |
| `data/privacy.md`, `data/accessibility.md` | The privacy and accessibility pages. Contact details are placeholders such as `{privacy}` and `{phone}`, filled from `data/footer.json` (`PLACEHOLDERS` in `lib/footer.ts`) by a Markdown plugin (`lib/placeholders.mjs`), so each value is escaped as text. A name with no value stops the build. Don't type an email address or phone number into them. |
| `data/index.md`, `data/agents.md` | Hand-written Markdown for AI agents: Home's Markdown copy and the agents' guide. Their endpoints fill in `{site}`, the contact placeholders (`{phone}`, `{email}`, `{street}` …, as in the privacy page), and on Home also `{services}` and `{grow}`. Type no contact details into them. |

Every other page's Markdown copy is generated at build time from its `<main>` (`scripts/markdown.mjs`). An element with `data-md-skip` is left out.

### Copy

The words the components, layouts and scripts show or announce (headings, buttons, labels, `aria-label`s, hidden text, `alt`, `title`, placeholders, toasts) are in `data/copy/en/`, one YAML file a page or area. Each file says at its top which page it feeds. `en/` is the English copy and, for now, the only one: the French copy will go in its own folder beside it.

| File | What it holds |
| --- | --- |
| `ui.yaml` | Shared UI and screen-reader text: the head, header, phone tab bar, footer chrome, both pop-ups, the pause button, the form fields both forms share, and the toasts `core.js` and `footer.js` show. |
| `home.yaml`, `about.yaml`, `contact.yaml`, `soon.yaml`, `not-found.yaml` | That page's own words, by section. |
| `services.yaml`, `work.yaml` | The `/services` and `/work` pages' own words, and the words every service page or case study shares around its own copy. |
| `text-pages.yaml` | The eyebrow and lead over the privacy and accessibility pages. |

Each file is a content collection (`copy-NAME` in `content.config.ts`) checked against its schema in `lib/copy-schema.ts`: a missing key, an unknown key, a YAML file with no schema, or a template whose `{names}` aren't the ones its schema lists stops the build. A component reads a file with `const t = await copy('home')` from `lib/copy.ts`; the object it gives throws on a key the file doesn't have, so a typo in a component stops the build too. A template such as `Team of {n}` goes through `fill(t.grow.team, { n })` (`lib/fill.js`, shared with the scripts).

To add a string, add its key to the YAML file and to the file's schema, then use it in the component. A list (`stats`, `facts`) can take more or fewer items.

A page script gets its words as JSON: the page writes `<Words id="words-page" words={…} />` with the parts its script needs, and the script reads them with `words('words-page')` from `core.js`, typed by the shapes at the end of `lib/copy-schema.ts` (`HomeWords`, `ContactWords`, `SoonWords`). `core.js` reads `#words-ui` (`UiWords`) on every page and exports it as `UI`. The block runs nothing, so the CSP needs no hash for it, and it sits outside `<main>`, so the Markdown copy leaves it out.

Kept out of the copy files on purpose: the content collections and `data/*.json` and `data/*.md` (already data), the menu names in `PAGES` and `NAV` in `lib/site.ts`, JSON-LD fields (but Home's business description, `business` in `home.yaml`), the words inside the drawings (`tools/gen_*.py`), and punctuation that only separates parts (`Sep.astro`, `Pause.astro`, the hidden `, ` between a name and a role).

## Styles

`styles/global.css` imports the shared stylesheets in cascade order. Order matters: when two rules tie, the later file wins. The order is:

1. Foundations: `tokens.css`, the light theme (`theme-light.css`; `theme-drawings.css`, the drawings' light colours, is imported by `Hero.astro` so only Home carries it), `fonts.css`, `base.css`, `layout.css`, and `type.css`.
2. Shared parts: the header, key hints, buttons, surfaces, forms, dialogs, toasts, footer, and phone tab bar.
3. Layout systems: `shared-blocks.css`, `fold.css` (the desktop one-section-per-screen rules every page shares, and `.fold-foot` for content after a section's main block), and `compact-cuts.css`. A one-screen section is one screen as a floor (`min-height: var(--fold-inner)`): its picture takes the height its words leave, down to a floor in rem, and longer words make the section taller.
4. Blocks more than one page uses: `hero-section.css` (the `.hero` section: Home's hero, the service and case-study pages; Home's own hero layout is `components/home/hero.css`), `facts.css`, and `detail-pages.css`.
5. Last: `page-transitions.css` (ends with the reduced-motion switch) and `print.css`.

Each section's desktop layout sits at the end of its own CSS file, so it always comes after that section's phone and tablet rules.

All colours, sizes, and timings are tokens in `styles/tokens.css`. Use the tokens; don't type values in.

The site has a light and a dark theme (Settings: System, Light or Dark). `html[data-theme]` is `light` or `dark`: `Base.astro`'s head script sets it before the page paints, from the saved choice (`uplink.theme`) or the device's setting, and `core.js` keeps it right after that (a choice, a change of device setting, another tab, the back/forward cache). Without script the page is dark. `tokens.css` holds the dark values (the drawings read them, `tools/palette.py`). `styles/theme-light.css` holds the light values of the same tokens on `:root[data-theme='light']`, the few rules a token swap alone doesn't cover, and the rule that shows a picture's theme copy. `styles/theme-drawings.css` recolours the drawings inside the page (the Home hero and Grow); `tools/gen_light.py` writes it. Pictures go through `components/Drawing.astro`. The colour roles and their tokens: [`docs/design.md`](../docs/design.md#colour); why each light value differs: `docs/history/light-theme-2026-11-08.md`.

The visitor's display settings: with "increase contrast" on (`prefers-contrast: more`), `tokens.css` raises the faint lines (`--c-line`, `--c-line-2`) to `--c-edge` (3:1). In forced colours (Windows contrast themes), the theme paints fills away, so a state shown only by a fill (a current dot, step, tab or pressed icon) opts out of the forcing (`forced-color-adjust: none`) and takes the theme's system colours (`Highlight` and `HighlightText` for the current one, `GrayText` or `CanvasText` for the rest). Each sits in a `@media (forced-colors: active)` block beside the rule it fixes; the site check tests them (B4).

Text sizes are in `rem`, and `html` has no font size of its own, so 1rem is the visitor's own font size (16 px unless they changed it) on every screen. Browser zoom and the browser's font setting then grow every text, and the zoom check (`checks/zoom.spec.mjs`) holds it. Only pictures, gaps, and page width may follow the screen (`vw`, `svh`).

Headings and big numbers fit their column. `h1` and `h2` are `min(var(--fs-8), var(--fit))` and `min(var(--fs-7), var(--fit))`, where `cqi` is 1% of the nearest container's width. A heading whose longest word has 10 letters or more ("Cybersecurity", "Everything") carries the class `fit`, which components add at build time with `fit(text)` from `lib/fit.js` (`TextPage.astro` adds it to the Markdown's `h2`s): its `--fit` is `--fit-long` (14cqi), so a 13-letter word fits on one line. Every other heading gets `--fit-short` (21cqi), which keeps its size step except with big text in a narrow column; `fit(text)` gives a heading whose words all have 6 letters or fewer the class `fit-loose` (30cqi). `h3` follows the same rule. A heading's container must be its own column: the project page's title has a box of its own (`.case-title`), and Contact's form heading measures `.form-head`. Home's service tile titles (`.svc-title`, not headings) follow the same rule against their text box (`.svc-text`). A process step puts its title under the number when the step is narrower than 12rem. The columns are marked `container-type: inline-size` in `styles/layout.css` (stat tiles and Contact's queue ring mark themselves). Mark only a box that takes its width from its parent: a box sized by its content collapses to nothing. No heading may get smaller on screen as zoom goes up (the zoom check measures it). Zoom narrows the window in CSS pixels, so a size that is a share of the window or of a column stays the same on screen at best: keep any `vw` part of a size with a rem part that isn't negative (`--fs-7` and `--fs-8` grow only between 27rem and 45rem wide, so 200% zoom on a 1440 window still doubles them), never let a narrower layout use a smaller size than the wider one before it, and give a heading's column a rem floor. So the service and project pages' title column is at least 30rem, stat numbers are `--fs-7` (38cqi only stops them outgrowing a tile; About's tiles go from four in a row to two when they can't hold 44px), and the Home headline is `--fs-hero-phone` below its two-column layout (40px on phones, a share of the window up to `--fs-8` wider) and 16.5cqi of its column in it, so it keeps two lines.

Reduced motion: write plain `@media (prefers-reduced-motion: reduce)` (or `no-preference`) rules. A build step in `postcss.config.mjs` (`motion-choice`) scopes each one to `html[data-motion]` and gives it a copy, so the visitor's choice in Settings (Reduce motion: `reduce` or `full`) wins over the device's. `Base.astro`'s head script and `core.js` set the attribute. Scripts ask `reduceMotion` from `core.js` (`.matches`, and a `change` event), never `matchMedia` directly. The record: `docs/history/motion-setting-2026-11-08.md`.

### Breakpoints

The screen sizes are named once, in `lib/media.js`. CSS uses the names, such as `@media (--desktop)`, and the build writes the real query back in (`postcss-custom-media`). Page scripts import `MEDIA` from the same file for `matchMedia`.

Every breakpoint is in `em`, in range syntax: `(width < 43.75em)`. In a media query, 1em is the browser's default font size (16 px unless the visitor changed it), not the page's root font size. So a bigger default font, or zoom, counts as a narrower screen. The one-off queries written out in a component's CSS, and the `media` of a `<source>` or `<link>`, follow the same rule. Lint refuses the old `min-width` form (`media-feature-range-notation` in `.stylelintrc.json`).

| Name | Query | At a 16 px default |
| --- | --- | --- |
| `smallPhone` | `width < 37.5em` | Below 600 px. The drawings switch to their phone cut. |
| `phone` | `width < 43.75em` | Below 700 px. |
| `tablet` | `43.75em <= width < 68.75em` | 700 px to 1099 px. |
| `desktop` | `width >= 68.75em` | 1100 px and up. |
| `fold` | `width >= 68.75em` and `height >= 43.75em` | 1100 px and up, and at least 700 px tall. One section per screen. Text keeps the visitor's size; the centred block (`--container`, 85% of a screen wider than 1,600 px), the section padding (`--fold-pad`) and the pictures (`--hero-max`, `--grow-stage-max`) follow the screen. |

After you move CSS, prove nothing changed with `npm run verify:styles -- OLD_URL NEW_URL`. It compares every element's computed style between two builds.

## Scripts

Scripts in `scripts/` are ES modules, bundled by Astro.

| Script | Where it runs | What it does |
| --- | --- | --- |
| `core.js` | Every page, from `Base.astro` | Helpers, toasts, pop-ups, forms, the theme (`theme.ev` says when it changes), the shared pause state, error reports, pictures that fail to load (`.is-broken`, no broken-image box), and the Trusted Types policy (`html()`). The keyboard map is at the top. |
| `footer.js` | Every page, from `Base.astro` | The footer's campus map: fetches it when the footer scrolls near, and on each `toggle` of a section lights its spot and flies the camera there. On tablet and up it keeps one section open (Contact unless another is picked), so the panel on screen is always the open one; phones start with every row shut. Also the newsletter mockup. The sections open and shut without it. Does nothing on a page without the footer (the 404). |
| `home.js` | Home | The hero: it fetches the drawing cut for the screen (if that fails, the still office from its `<noscript>` stands in), runs the cloud and the phone captions, and drives the phone Services row. |
| `grow.js` | Home, through `home.js` | Plays the "We grow with you" world, step by step. Two sets of step buttons drive it: the dots under the picture (phones and tablets) and the step list in the left column (desktop). CSS shows one set at each size. |
| `contact.js` | Contact | The copy buttons and the queue card. |
| `soon.js` | Coming soon | Names the page that isn't built yet, from the names in `data/copy/en/soon.yaml`. |

Every page script imports `core.js`, so `core.js` always runs first. A script's words come from `data/copy/en/` through `words()` (see [Copy](#copy)); type none into a script.

The scripts are type-checked (`npm run check`; `checkJs` in `tsconfig.json`), with JSDoc for the types: `/** @param {number} i */` on a parameter, `/** @type {HTMLDialogElement | null} */` on a variable, and `/** @type {SVGElement} */ (expr)` (the parentheses matter) to say what a lookup finds. `$` and `$$` give an HTML element unless the variable they go in says otherwise. A promise you don't wait for is marked with `void`. `globals.d.ts` holds the browser types TypeScript's library lacks (Trusted Types).
