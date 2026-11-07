# Source code map

*Last updated: November 5, 2026*

This page maps the `src/` folder: where each page, component, content file, stylesheet, and script lives, and how they fit together. For how to run and build the site, see the [project README](../README.md).

`src/` is an Astro 7 project. `npm run dev` serves it at http://localhost:4321, and `npm run build` writes the site to `dist/`.

## Pages

Each file in `pages/` is one address. Most pages are a stack of sections, with one component per section in `components/PAGE/`.

| File | Address | Sections |
| --- | --- | --- |
| `index.astro` | `/` | Hero (with the office drawing), Services, Grow (with the world drawing), Work, and Proof |
| `services.astro` | `/services` | Overview and Faq |
| `services/[slug].astro` | `/services/SLUG` | One page per service, from `content/services/SLUG.json` |
| `work.astro` | `/work` | Projects |
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

The seven static pages take their title and description from `PAGES` in `lib/site.ts`: the five in the menu, plus privacy and accessibility. The sitemap and `llms.txt` read the same list.

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
| `Footer.astro` | The footer's tiles, panels, and campus map, from `data/footer.json` and the services collection. |
| `BookDialog.astro`, `SettingsDialog.astro` | The two pop-ups. Settings holds the text size and the keyboard-shortcuts switch. |
| `ServiceOptions.astro` | The service `<option>` items for both "What do you need?" lists. |
| `TextPage.astro` | Renders the privacy and accessibility Markdown and fills in the contact placeholders from `data/footer.json`. |
| `HoldButton.astro` | A pause button for animations. Every pause button on the page shares one state (see `core.js`). |
| `Pause.astro` | A pause for screen readers between two parts of one link, so the title doesn't run into the next words. Nothing shows on screen. |
| `Sep.astro` | The " · " between two short phrases. Screen readers hear a comma instead of "dot". |
| `Icon.astro` | Every inline icon, by name. Add new icons here. |

### Section components

Section components live in `components/PAGE/`. Each section's CSS sits beside it and is imported at the top of the component, for example `hero.css` next to `Hero.astro`. `services/ServiceCard.astro` and `work/ProjectCase.astro` render one service or project in full on its own page.

`components/home/hero-flows.svg` and `components/home/grow-world.svg` are drawings, inlined as components. `tools/gen_office.py` and `tools/gen_grow.py` write them. Don't edit them by hand.

## Content

The content types are defined in `content.config.ts`.

| File | What it holds |
| --- | --- |
| `content/services/SLUG.json` | One service. The slug is its address. Fields: `order`, `title`, `chip`, `tag`, `icon`, `image` (the drawing's name in `public/assets/img/`), `alt`, `lead`, `card`, `features` (three), `bestFor`, and `page`, which is the longer copy only the service's own page shows. Optional: `featured`, `footerLabel`, and `optionLabel`. |
| `content/projects/SLUG.json` | One project. Fields: `order`, `name`, `tag`, `client`, `clientShort`, `services` (service slugs), `result`, `image`, `alt`, `story`, and `page` (the case study). |
| `data/faq.json`, `data/team.json`, `data/footer.json`, `data/grow.json` | The smaller lists. They keep their file order through `byOrder`; the content store would otherwise sort them by ID. |
| `data/privacy.md`, `data/accessibility.md` | The privacy and accessibility pages. Contact details are placeholders such as `{privacy}` and `{phone}`, filled from `data/footer.json`. Don't type an email address or phone number into them. |
| `data/index.md`, `data/agents.md` | Hand-written Markdown for AI agents: Home's Markdown copy and the agents' guide. Their endpoints fill in `{site}`, and on Home also `{services}` and `{grow}`. |

Every other page's Markdown copy is generated at build time from its `<main>` (`scripts/markdown.mjs`). An element with `data-md-skip` is left out.

## Styles

`styles/global.css` imports the shared stylesheets in cascade order. Order matters: when two rules tie, the later file wins. The order is:

1. Foundations: `tokens.css`, `fonts.css`, `base.css`, `layout.css`, and `type.css`.
2. Shared parts: the header, key hints, buttons, surfaces, forms, dialogs, toasts, footer, and phone tab bar.
3. Layout systems: `shared-blocks.css`, `fold.css` (the desktop one-section-per-screen rules every page shares), `fold-foot.css`, and `compact-cuts.css`.
4. Blocks more than one page uses: `hero.css`, `facts.css`, and `detail-pages.css`.
5. Last: `page-transitions.css`, `motion.css`, and `print.css`.

Each section's desktop layout sits at the end of its own CSS file, so it always comes after that section's phone and tablet rules.

All colours, sizes, and timings are tokens in `styles/tokens.css`. Use the tokens; don't type values in.

### Breakpoints

The screen sizes are named once, in `lib/media.js`. CSS uses the names, such as `@media (--desktop)`, and the build writes the real query back in (`postcss-custom-media`). Page scripts import `MEDIA` from the same file for `matchMedia`.

Every breakpoint is in `em`, in range syntax: `(width < 43.75em)`. In a media query, 1em is the browser's default font size (16 px unless the visitor changed it), not the page's root font size. So a bigger default font, or zoom, counts as a narrower screen. The one-off queries written out in a component's CSS, and the `media` of a `<source>` or `<link>`, follow the same rule. Lint refuses the old `min-width` form (`media-feature-range-notation` in `.stylelintrc.json`).

| Name | Query | At a 16 px default |
| --- | --- | --- |
| `smallPhone` | `width < 37.5em` | Below 600 px. The drawings switch to their phone cut. |
| `phone` | `width < 43.75em` | Below 700 px. |
| `tablet` | `43.75em <= width < 68.75em` | 700 px to 1099 px. |
| `desktop` | `width >= 68.75em` | 1100 px and up. |
| `fold` | `width >= 68.75em` and `height >= 43.75em` | 1100 px and up, and at least 700 px tall. One section per screen, and the root font scales with the screen. |

After you move CSS, prove nothing changed with `npm run verify:styles -- OLD_URL NEW_URL`. It compares every element's computed style between two builds.

## Scripts

Scripts in `scripts/` are ES modules, bundled by Astro.

| Script | Where it runs | What it does |
| --- | --- | --- |
| `core.js` | Every page, from `Base.astro` | Helpers, toasts, pop-ups, forms, keyboard shortcuts, the shared pause state, error reports, pictures that fail to load (`.is-broken`, no broken-image box), and the Trusted Types policy (`html()`). The keyboard map is at the top. |
| `footer.js` | Every page, from `Base.astro` | The footer's tiles and panels, and the campus map, which it fetches when the footer scrolls near. Does nothing on a page without the footer (the 404). |
| `home.js` | Home | The hero: it fetches the drawing cut for the screen (if that fails, the still office from its `<noscript>` stands in), runs the cloud and the phone captions, and drives the phone Services row. It imports `grow.js`. |
| `grow.js` | Home, through `home.js` | Plays the "We grow with you" world, step by step. Two sets of step buttons drive it: the dots under the picture (phones and tablets) and the step list in the left column (desktop). CSS shows one set at each size. |
| `work.js` | Our work | The project filters. |
| `contact.js` | Contact | The copy buttons and the queue card. |
| `soon.js` | Coming soon | Names the page that isn't built yet. |

Every page script imports `core.js`, so `core.js` always runs first.
