# Source code map

Where each page, component, content file, stylesheet, and script in `src/` lives. To run and build the site, see the [project README](../README.md).

## Pages

Each file in `pages/` is one address. Most pages are a stack of sections, one component per section in `components/PAGE/`.

| File | Address | Sections |
| --- | --- | --- |
| `index.astro` | `/` | Hero, Services, Grow, Work, Reviews, and Proof |
| `services.astro` | `/services` | Overview and Faq |
| `services/[slug].astro` | `/services/SLUG` | One page per service, from `content/services/SLUG.json` |
| `work.astro` | `/work` | Projects. No page script: the filters are radios, and `workFilterCss()` in `lib/site.ts` writes the CSS that hides the other cards into its `<head>` |
| `work/[slug].astro` | `/work/SLUG` | One page per project, from `content/projects/SLUG.json` |
| `about.astro` | `/about` | Profile, Process, and Team |
| `contact.astro` | `/contact` | Message and Support |
| `privacy.astro`, `accessibility.astro` | `/privacy`, `/accessibility` | `data/privacy.md` or `data/accessibility.md`, rendered by `components/TextPage.astro` |
| `soon.astro`, `404.astro` | `/soon`, and any missing address | One section each, written inline |
| `sitemap.xml.ts`, `robots.txt.ts`, `llms.txt.ts`, `index.md.ts`, `agents.md.ts`, `.well-known/security.txt.ts` | Those files | Built from `lib/site.ts`, the content collections, and `data/*.md` |

### The shared layout

Every page is `<Base …>` with its sections inside. `layouts/Base.astro` holds the shared `<head>`, the header, the footer, the phone tab bar, the pop-ups, and the toast region. Its props:

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
| `footer` | `false` leaves the footer out (the 404). Default `true`. With the footer comes a contact block that shows only on paper (`.print-contact`). |

The seven static pages are listed in `PAGES` in `lib/site.ts`: each one's address and menu name. Each page's `title` and `description` are at the top of its file in `data/copy/en/` (privacy's and accessibility's in `text-pages.yaml`, under the page's key); read them with `await pageMeta('NAME')` from `lib/site.ts`. The sitemap's dates, and a case study's, come from `lib/git-dates.mjs`.

A page adds its own script inside `<Base>`:

```astro
<Fragment slot="scripts"><script>import '../scripts/home.js'</script></Fragment>
```

Put it inside `<Base>`: after `</Base>`, it would come after `</html>`.

## Components

### Shared components

| Component | What it is |
| --- | --- |
| `Header.astro`, `BottomNav.astro` | The logo, page tabs, and buttons; and the phone tab bar. `current` marks the page's tab. |
| `Footer.astro` | The footer. See [The footer](#the-footer). |
| `BookDialog.astro`, `SettingsDialog.astro` | The two pop-ups. Settings holds the theme (System, Light or Dark: `.seg` in `forms.css`) and the Reduce motion switch. |
| `Drawing.astro` | A drawing shown as a picture, in both themes: `NAME.svg` and `NAME-light.svg`, one hidden by `theme-light.css`. Takes `src`, optional `sources` (a `<picture>`'s cuts), and the `<img>`'s own attributes. |
| `ServiceOptions.astro` | The service `<option>` items for both "What do you need?" lists. |
| `TextPage.astro` | Renders the privacy and accessibility Markdown, and fills the contact placeholders (`lib/placeholders.mjs`). |
| `HoldButton.astro` | A pause button for animations. Every pause button on the page shares one state (`core.js`). |
| `Pause.astro` | A pause for screen readers between two parts of one link. Nothing shows on screen. |
| `Sep.astro` | The " · " between two short phrases. Screen readers hear a comma. |
| `Icon.astro`, `icons.ts` | Every inline icon, by name. Add new icons to `ICONS` in `icons.ts`. |
| `Words.astro` | The words a page script shows, as a `<script type="application/json">`. See [Copy](#copy). |

### Section components

Section components live in `components/PAGE/`. Each section's CSS sits beside it and is imported at the top of the component (`hero.css` next to `Hero.astro`). `services/ServiceCard.astro` and `work/ProjectCase.astro` render one service or project in full on its own page.

A card in a list of cards (the services on `/services`, `work/ProjectCard.astro`, Contact's help cards) is a `<div class="card">` whose title is a heading holding the link: `<h2 class="card-title {fit(title)}"><a class="card-link" href="…">`. Use `h2` right under the page's `h1` and `h3` under a section's `h2` (`ProjectCard`'s `level` prop). The link's `::after` covers the card (`styles/surfaces.css`); the rest of the card is plain text, with no `<Pause />`. A chip is never `aria-hidden`.

`components/home/hero-flows.svg` and `components/home/grow-world.svg` are drawings, written by `tools/gen_office.py` and `tools/gen_grow.py`. Don't edit them by hand.

### The footer

Every page has the same footer, except the 404 page (`footer={false}` on `Base`). It's one `<nav aria-label="Footer">` holding six `<details name="footer">` sections: Contact, Services, Company, Support, Resources, and Follow. Each `<summary>` is its tile; the rest is its panel. The browser opens one section at a time, with or without script.

- **Desktop:** a stage (the open panel on the left, the campus map on the right), the tile row, and the base bar. One section is always open on tablet and desktop: `footer.js` opens Contact at load and again when a visitor shuts the one they picked. Without script, CSS shows Contact's panel while nothing is open.
- **Tablet:** the tile row, then the map, then the panel.
- **Below 700 px:** six rows that open in place, with no map.

The lists come from `data/footer.json` (schema in `lib/footer.ts`); the Services panel comes from the services collection. The layout is `styles/footer.css`: the summaries and panels are items of one grid (`.fc-deck`). Each section's `data-map` names a spot on the map. `tools/gen_campus.py` draws the map: `SPOTS` lists the spots and `ORDER` sets the draw order. For `footer.js`, see [Scripts](#scripts).

> **Note:** A browser without `::details-content` (Firefox before 143, Safari before 18.4) shows the six rows on every screen, with no map. Without `<details name>` (Firefox before 130, Safari before 17.2), more than one row can be open. Only Chromium is tested here: check the footer on a real iPhone and in Firefox before a release.

## Content

The content types are defined in `content.config.ts`, and `footer.json`'s in `lib/footer.ts`. Every object is strict: an unknown key, an `icon` that isn't in `components/icons.ts`, or an `image` whose drawings aren't in `public/assets/img/` stops the build. Import the footer data from `lib/footer.ts`, never from the JSON.

| File | What it holds |
| --- | --- |
| `content/services/SLUG.json` | One service. The slug is its address. `page` is the longer copy only the service's own page shows. |
| `content/projects/SLUG.json` | One project. `services` lists service slugs; `page` is the case study. |
| `data/faq.json`, `data/team.json`, `data/grow.json`, `data/reviews.json` | The smaller lists, kept in file order through `byOrder`. In `reviews.json`, the one marked `featured` is the big card; `date` is `YYYY-MM`. |
| `data/footer.json` | The footer's lists, the contact details, and the map's spots. A heading with an emphasized word is `title` plus `accent`; the JSON holds no HTML. |
| `data/privacy.md`, `data/accessibility.md` | The privacy and accessibility pages. Contact details are placeholders such as `{privacy}` and `{phone}`, filled from `data/footer.json` (`PLACEHOLDERS` in `lib/footer.ts`, `lib/placeholders.mjs`). A name with no value stops the build. Don't type an email address or phone number into them. |
| `data/index.md`, `data/agents.md` | Hand-written Markdown for AI agents: Home's Markdown copy and the agents' guide. Their endpoints fill in `{site}`, the contact placeholders, and on Home also `{services}` and `{grow}`. |

Every other page's Markdown copy is generated at build time from its `<main>` (`scripts/markdown.mjs`). An element with `data-md-skip` is left out.

### Copy

The words the components, layouts and scripts show or announce are in `data/copy/en/`, one YAML file a page or area.

| File | What it holds |
| --- | --- |
| `ui.yaml` | Shared UI and screen-reader text: the head, header, phone tab bar, footer chrome, both pop-ups, the pause button, the shared form fields, and the toasts. |
| `home.yaml`, `about.yaml`, `contact.yaml`, `soon.yaml`, `not-found.yaml` | That page's own words, by section. |
| `services.yaml`, `work.yaml` | The `/services` and `/work` pages' own words, and the words every service page or case study shares. |
| `text-pages.yaml` | The eyebrow and lead over the privacy and accessibility pages. |

Each file is a content collection (`copy-NAME` in `content.config.ts`) with a strict schema in `lib/copy-schema.ts`: a missing key, an unknown key, a YAML file with no schema, or a template with the wrong `{names}` stops the build. A component reads a file with `const t = await copy('home')` from `lib/copy.ts`; a key the file doesn't have throws. A template such as `Team of {n}` goes through `fill(t.grow.team, { n })` (`lib/fill.js`).

To add a string, add its key to the YAML file and to the file's schema, then use it in the component. A list (`stats`, `facts`) can take more or fewer items.

A page script gets its words as JSON: the page writes `<Words id="words-page" words={…} />`, and the script reads them with `words('words-page')` from `core.js`, typed by the shapes at the end of `lib/copy-schema.ts`. `core.js` reads `#words-ui` on every page and exports it as `UI`.

Kept out of the copy files: the content collections and `data/*.json` and `data/*.md`, the menu names in `PAGES` and `NAV` in `lib/site.ts`, JSON-LD fields (but Home's `business` in `home.yaml`), the words inside the drawings, and punctuation that only separates parts.

## Styles

`styles/global.css` imports the shared stylesheets in cascade order. When two rules tie, the later file wins:

1. Foundations: `tokens.css`, `theme-light.css`, `fonts.css`, `base.css`, `layout.css`, and `type.css`. (`Hero.astro` imports `theme-drawings.css`, so only Home carries it.)
2. Shared parts: the header, key hints, buttons, surfaces, forms, dialogs, toasts, footer, and phone tab bar.
3. Layout systems: `shared-blocks.css`, `fold.css` (the desktop one-section-per-screen rules, and `.fold-foot`), and `compact-cuts.css`. A one-screen section is one screen as a floor (`min-height: var(--fold-inner)`): its picture takes the height its words leave, down to a floor in rem.
4. Blocks more than one page uses: `hero-section.css` (Home's own hero layout is `components/home/hero.css`), `facts.css`, and `detail-pages.css`.
5. Last: `page-transitions.css` (ends with the reduced-motion switch) and `print.css`.

Each section's desktop layout sits at the end of its own CSS file. All colours, sizes, and timings are tokens in `styles/tokens.css`.

**Themes.** `html[data-theme]` is `light` or `dark`: `Base.astro`'s head script sets it before paint, from the saved choice (`uplink.theme`) or the device's setting, and `core.js` keeps it right. Without script the page is dark. `tokens.css` holds the dark values; `styles/theme-light.css` holds the light values on `:root[data-theme='light']`; `styles/theme-drawings.css` (written by `tools/gen_light.py`) recolours the drawings inside the page. Pictures go through `components/Drawing.astro`. Colour roles: [`docs/design.md`](../docs/design.md#colour).

**Display settings.** With `prefers-contrast: more`, `tokens.css` raises `--c-line` and `--c-line-2` to `--c-edge`. In forced colours, a state shown only by a fill opts out (`forced-color-adjust: none`) and takes system colours (`Highlight` and `HighlightText` for the current one, `GrayText` or `CanvasText` for the rest), in a `@media (forced-colors: active)` block beside the rule it fixes.

**Text sizes** are in `rem`. Only pictures, gaps, and page width may follow the screen (`vw`, `svh`). The zoom check (`checks/zoom.spec.mjs`) holds it.

**Headings fit their column.** `h1` and `h2` are `min(var(--fs-8), var(--fit))` and `min(var(--fs-7), var(--fit))`; `h3` follows the same rule.

- `fit(text)` from `lib/fit.js` gives the class at build time (`TextPage.astro` adds it to the Markdown's `h2`s): `fit` for a word of 10 letters or more (`--fit-long`, 14cqi), `fit-loose` when every word has 6 letters or fewer (30cqi), otherwise `--fit-short` (21cqi).
- A heading's container must be its own column, marked `container-type: inline-size` in `styles/layout.css` (the project page's `.case-title`, Contact's `.form-head`, Home's `.svc-text` for `.svc-title`; stat tiles and Contact's queue ring mark themselves). Mark only a box that takes its width from its parent: a box sized by its content collapses.
- No heading may get smaller on screen as zoom goes up. Keep any `vw` part of a size with a rem part that isn't negative, never let a narrower layout use a smaller size than the wider one before it, and give a heading's column a rem floor. So the service and project pages' title column is at least 30rem, stat numbers are `--fs-7`, and the Home headline is `--fs-hero-phone` below its two-column layout and 16.5cqi of its column in it.

**Reduced motion.** Write plain `@media (prefers-reduced-motion: reduce)` (or `no-preference`) rules. A build step in `postcss.config.mjs` (`motion-choice`) scopes each one to `html[data-motion]`, so the visitor's choice in Settings wins over the device's. Scripts ask `reduceMotion` from `core.js` (`.matches`, and a `change` event), never `matchMedia` directly.

### Breakpoints

The screen sizes are named once, in `lib/media.js`. CSS uses the names, such as `@media (--desktop)` (`postcss-custom-media`). Page scripts import `MEDIA` from the same file for `matchMedia`.

Every breakpoint is in `em`, in range syntax: `(width < 43.75em)`. One-off queries, and the `media` of a `<source>` or `<link>`, follow the same rule.

| Name | Query | At a 16 px default |
| --- | --- | --- |
| `smallPhone` | `width < 37.5em` | Below 600 px. The drawings switch to their phone cut. |
| `phone` | `width < 43.75em` | Below 700 px. |
| `tablet` | `43.75em <= width < 68.75em` | 700 px to 1099 px. |
| `desktop` | `width >= 68.75em` | 1100 px and up. |
| `fold` | `width >= 68.75em` and `height >= 43.75em` | 1100 px and up, and at least 700 px tall. One section per screen. |

After you move CSS, run `npm run verify:styles -- OLD_URL NEW_URL`.

## Scripts

Scripts in `scripts/` are ES modules, bundled by Astro.

| Script | Where it runs | What it does |
| --- | --- | --- |
| `core.js` | Every page, from `Base.astro` | Helpers, toasts, pop-ups, forms, the theme (`theme.ev`), the shared pause state, error reports, pictures that fail to load (`.is-broken`), and the Trusted Types policy (`html()`). The keyboard map is at the top. |
| `footer.js` | Every page, from `Base.astro` | The footer's campus map: fetches it when the footer scrolls near, and on each `toggle` lights the section's spot and flies the camera there. On tablet and up it keeps one section open. Also the newsletter mockup. |
| `home.js` | Home | The hero: fetches the drawing cut for the screen, runs the cloud and the phone captions, and drives the phone Services row. |
| `grow.js` | Home, through `home.js` | Plays the "We grow with you" world. Two sets of step buttons drive it: the dots under the picture (phones and tablets) and the step list (desktop). |
| `contact.js` | Contact | The copy buttons and the queue card. |
| `soon.js` | Coming soon | Names the page that isn't built yet, from `data/copy/en/soon.yaml`. |

Every page script imports `core.js`, so `core.js` always runs first. A script's words come through `words()` (see [Copy](#copy)); type none into a script.

The scripts are type-checked (`npm run check`; `checkJs` in `tsconfig.json`), with JSDoc for the types: `/** @param {number} i */`, `/** @type {HTMLDialogElement | null} */`, and `/** @type {SVGElement} */ (expr)` (the parentheses matter) to say what a lookup finds. `$` and `$$` give an HTML element unless the variable they go in says otherwise. A promise you don't wait for is marked with `void`. `globals.d.ts` holds the browser types TypeScript's library lacks.
