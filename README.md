# Uplink Technology site

*Last updated: November 9, 2026*

This repository holds the website for Uplink Technology, a made-up IT company. The content is placeholder text, and the look is inspired by the Overwatch 2 menus. This page explains how to run the site, how it's organized, and how to use the tools that build and check it.

The site is built with Astro 7, plain CSS, and plain JavaScript, with no UI framework. Cloudflare Workers serves it as static files. Two ideas shape the code:

- **Content is data.** Every service, project, and list is a typed JSON or Markdown file. Pages, cards, menus, the sitemap, and the structured data all read from those files.
- **Drawings are code.** Every illustration is written by a Python script. You change the numbers in the script and run it again; you never edit an output SVG by hand. The one SVG you do edit by hand is a part, not an output: `tools/office_parts/hero_cloud.svg`, which `gen_office.py` fills in and copies into the hero.

## Related documents

| Document | What it covers |
| --- | --- |
| [`CLAUDE.md`](CLAUDE.md) | The rules for every change, and which checks to run for which change. |
| [`.claude/skills/`](.claude/skills) | Step lists for the two long, rare jobs: a release, and a drawing change. |
| [`.claude/rules/`](.claude/rules) | The rules for one kind of file each: content, markup and scripts, CSS, drawings. Claude Code loads each one when it opens a matching file. |
| [`notes.md`](notes.md) | Open items, one line each. Start here. |
| [`src/README.md`](src/README.md) | A map of the source code: pages, components (the footer included), content, copy, styles, and scripts. |
| [`docs/ops.md`](docs/ops.md) | Hosting: the Worker, CI and deploys, previews, repository rules, rollback, response headers, search engines, and the password lock. |
| [`docs/design.md`](docs/design.md) | Colour roles and tokens, spacing, line height, corners, and layout. |
| [`docs/release.md`](docs/release.md) | The standards the site meets, the release checklist, what's left before launch, and launch day. |
| [`docs/security.md`](docs/security.md) | Security and privacy controls, how to check them, and every secret by name and place. |
| [`SECURITY.md`](SECURITY.md) | How to report a security problem. |
| [`docs/history/`](docs/history/) | Records and reasoning. Read them to learn why, not as instructions. |

## Before you begin

You need Node.js 24 (the exact version is in `.node-version`, which CI reads too). For the drawing tools only, you also need Python 3.12 or later; the site's checks need only Node.

## Run the site locally

1. Install the dependencies and start the development server:

   ```bash
   npm install
   npm run dev
   ```

2. Open http://localhost:4321.

The development server doesn't apply the response headers, the 404 page, or the redirects. To see the site as Cloudflare serves it, run `npm run build` and then `npm run serve`, and open http://localhost:8787.

### Install the browsers for the checks

The site checks need Playwright's Chromium; the release audit also needs Firefox and WebKit:

```bash
npx playwright install chromium
npx playwright install firefox webkit
```

> **Note:** Claude Code's sandbox on Windows can't start Firefox from `%LOCALAPPDATA%\ms-playwright` (Windows refuses its `mozglue` library there), so Claude's sessions keep their browsers in `%USERPROFILE%\.cache\ms-playwright`, set by `PLAYWRIGHT_BROWSERS_PATH` in `.claude/settings.local.json` (that machine only, not in git).

### Install the Python drawing tools

You need them only to change a drawing. Python's Chromium is used only by `gen_og.py`, which screenshots the share picture.

```bash
pip install -r requirements.txt
python -m playwright install chromium
```

`requirements.txt` is locked with hashes, so `pip` installs exactly what CI installs. Change `requirements.in`, then lock it again:

```bash
uv pip compile requirements.in --universal --python-version 3.12 --generate-hashes -o requirements.txt
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the development server at http://localhost:4321. |
| `npm run build` | Builds the site into `dist/`. After Astro builds, it shrinks the drawings with SVGO, writes a Markdown copy of every page, and writes `dist/_headers` and `dist/_redirects`. |
| `npm run serve` | Serves `dist/` the way Cloudflare does, at http://localhost:8787: headers, the 404 page, and redirects included. Runs `wrangler dev`. |
| `npm run preview` | Astro's own preview server. It doesn't apply the headers or redirects, so use `npm run serve` instead. |
| `npm run check` | Checks types and runs Astro's diagnostics: the TypeScript, the Astro components, and the JavaScript in `src/` (the page scripts and `src/lib`, typed with JSDoc; `checkJs` in `tsconfig.json`). The site checks, the build scripts, and the Worker aren't type-checked. |
| `npm test` | Tests the build's after-steps and the Worker with Node's built-in test runner (`scripts/test/`). |
| `npm run lint` | Runs ESLint, Stylelint, and Prettier. Prettier checks the format of the code (JS, TS, Astro, CSS) and of JSON and YAML; Markdown, HTML and SVG are left alone (`.prettierignore`). On `src/scripts/` and `src/lib/`, ESLint also runs typescript-eslint's rules that need types (`recommendedTypeCheckedOnly`), such as a promise left floating (`no-floating-promises`) or handed to a listener (`no-misused-promises`). |
| `npm run format` | Fixes what the linters can fix on their own, then formats the code with Prettier (`.prettierrc.json`: 120 characters a line, single quotes). Its `astroCompressHTML` matches `compressHTML` in `astro.config.mjs`, so Prettier never adds or removes whitespace a page renders; change the two together. A commit that only reformats goes in `.git-blame-ignore-revs`, which GitHub's blame skips. |
| `npm run ci` | Runs what CI's full run runs: check, tests, lint, build, the site check, the link check, and the smoke check, independent steps side by side, with each step's time. It starts its own `wrangler dev` on a free port, so a server you already run is never the one checked. Needs Node and Playwright's Chromium, no Python. It skips the screenshot comparison, the workflow lint, the preview, and the deploy. |
| `npm run quick` | Type check, lint, build (about 20 seconds). Which check to run for which change: CLAUDE.md, "Checking a change". |
| `npm run verify` | Runs the site check and the zoom check in a browser. With `RELEASE=1` it also runs the checks that expect today's exact copy. See [Site checks](#site-checks). |
| `npm run verify:zoom`, `verify:links`, `verify:spacing`, `verify:styles`, `visual-diff` | Run the other site checks. See [Site checks](#site-checks). |
| `npm run release-audit` | Runs the release audit. See [Site checks](#site-checks) and [`docs/release.md`](docs/release.md). |
| `npm run smoke`, `npm run pagespeed` | Check a deployed site. See [Live-site checks](#live-site-checks). |
| `npm run deploy` | Deploys to the live Worker by hand. It runs `npm run ci` first, which builds the site and runs every check, and deploys only if they pass. It deploys in one step (`wrangler deploy`), without CI's check of the new version at its own address or its rollback (see [Deploys](docs/ops.md#deploys)). |

> **Note:** CI deploys for you when a change is merged to `main`, so you rarely need `npm run deploy`. It deploys whatever branch you have checked out, so run it from `main`.

## How the repository is organized

| Path | What it holds |
| --- | --- |
| `src/` | The site. [`src/README.md`](src/README.md) maps it. |
| `public/` | Files served as they are: the `_headers` template, the Speculation Rules (`speculation-rules.json`), fonts, the drawings in `assets/img/`, `og.png`, and the favicon (both linked from `Base.astro`: `favicon.ico` for browsers without SVG icons, `favicon.svg` for the rest; `favicon.ico` is made from `favicon.svg` by `node scripts/favicon-ico.mjs`; rerun it when the icon changes). |
| `scripts/` | The build's after-steps. `svgo.mjs` shrinks the drawings in `dist/` (settings in `svgo-config.mjs`), and stops the build if a drawing's own `<style>` names a tag SVGO rewrites, such as `polygon`, which becomes `path`. Style a drawing's parts by class. `svgo-config.mjs` also gives the bytes the site serves for a drawing (`shipped()`), whose hash is the `?v=` on each drawing a page inserts (`src/lib/site.ts`). `markdown.mjs` writes each page's Markdown copy. `headers.mjs` finishes `dist/_headers` with the script and style hashes, the build's ID (`X-Build`), the Early Hints block and the Markdown copies' rules, and writes `dist/_redirects`. `deploy.mjs` is CI's deploy on `main` (see [Deploys](docs/ops.md#deploys)). `check-dist.mjs` is wrangler's build step (`build.command`): it refuses a `dist/` that `headers.mjs` didn't finish. `ci.mjs` is `npm run ci`. `check.mjs` runs one site check with its arguments (the npm check commands). Tests are in `scripts/test/`. |
| `tools/` | The drawing generators and their checks, in Python. Run them from the project root. See [Tools](#tools). |
| `checks/` | The site checks, as Playwright Test specs (`NAME.spec.mjs`), their shared page list and sizes (`lib.mjs`), and their settings (`playwright.config.mjs`). See [Site checks](#site-checks). |
| `worker/index.js` | The Worker script. See [`docs/ops.md`](docs/ops.md#the-worker). |
| `wrangler.jsonc` | The Cloudflare Worker configuration. |
| `.github/workflows/site.yml` | CI and deploys. |
| `.github/workflows/clean-previews.yml` | Deletes old pull request previews from Cloudflare every 3 days (`scripts/clean-previews.mjs`). |
| `docs/` | `design.md`, `release.md`, `security.md`, and `history/` (records). |

### Links and addresses

Links between pages are root-relative and have no `.html`, for example `/services` or `/contact#message`. Cloudflare serves `services.html` at `/services`. The build writes `dist/_redirects`, which sends `/services.html`, `/services/`, and `/index.html` to the clean address with a `308` status. Cloudflare's own handling would use `307`, which isn't permanent.

The site's public address is `SITE_URL`. Set it in the environment, or change the default in `astro.config.mjs`. It's written into canonical links, Open Graph tags, the sitemap, and the JSON-LD. At launch, set it to the real domain.

### Content works without script

Every service and project is in the page's HTML in full. Script only changes how much shows at once. Every page reads and works with script turned off.

## Add a service

1. Copy an existing file in `src/content/services/` and rename it `SLUG.json`. The slug becomes the page's address, `/services/SLUG`. The fields are typed in `src/content.config.ts`. A key it doesn't name, an `icon` missing from `src/components/icons.ts`, or an `image` without its drawings stops the build.
2. Write the drawing's generator. Copy `tools/gen_voip.py` to `tools/gen_NAME.py` and change the scene. It writes `public/assets/img/NAME.svg`, the phone cut `NAME-compact.svg`, and the card cut `NAME-card.svg`. Set `image` in the JSON to `NAME`.
3. Run the generator and its checks. See [Check a drawing](#check-a-drawing).
4. Run `npm run build`.

Everything else comes from the JSON file: the card on the Services page and Home, the footer link, the options in both "What do you need?" lists, the service's own page, the sitemap, `llms.txt`, and the JSON-LD.

### Add a project

A project works the same way. Its file is `src/content/projects/SLUG.json`, and its page is `/work/SLUG`. The `services` field lists service slugs. The case study links to each one, and each service's page lists the projects that name it. The `tag` field gives the filters on `/work`: each tag that a project uses gets a filter, with its count, in the order the projects first use it.

The smaller lists (FAQ, team, footer, and the Grow section's copy) are in `src/data/*.json`.

### Change the site's words

Every other word the pages show or announce (headings, buttons, labels, hidden screen-reader text, toasts) is in `src/data/copy/`: one YAML file a page, and `ui.yaml` for the parts every page shares. Edit the YAML and rebuild. A missing or misspelled key stops the build and names the file and key. To add a new string, see "Copy" in [src/README.md](src/README.md#copy).

## Drawing rules

Every drawing follows these rules. The values are measured in the files.

- **True isometric.** One axis runs right and down at 30°, one runs left and down at 30°, and verticals go straight up.
- **Colours by name.** Every colour comes from `tools/palette.py`, which reads `src/styles/tokens.css`. The colour roles are in [`docs/design.md`](docs/design.md#drawing-colours). Scripts use names, never hex values.
- **Box faces.** Every box has a top of `pal.TOP` (#4D5863), a left side of `pal.LEFT` (#37424E), and a right side of `pal.RIGHT` (#222E3A). The top is lightest and the right is darkest. Edges are `pal.EDGE` (#E6ECF2), width 1, opacity 0.3.
- **Highlight faces:** `pal.HI_TOP`, `pal.HI_LEFT`, and `pal.HI_RIGHT` (#FFCD9B, #FFAD51, #C37600).
- **Accents:** `pal.AMBER` (#FFAD51) and `pal.SKY` (#97C8EA).
- **Labels.** A thin leader line (width 1.2, opacity 0.55) ends in a dot of radius 3 with a 1.5 ring of `pal.PAGE` (#0E1A27). The title is capitals at 13px, weight 600. The subline is 11px in `pal.GREY` (#BBC2C9).
- **Windows on walls:** outlined in `pal.SKY`, width 0.9, opacity 0.5.
- **Floor discs** are true isometric circles (height ÷ width = 0.577), with gaps cut around labels.
- **Wi-Fi access points** hang at ceiling height. Their rings are halos at the access point's height, not on the floor.

## Tools

The drawing tools are Python, in `tools/`. The site checks are Node, in `checks/`, and run through npm. Every tool runs from the project root.

### The projection

Every drawing maps world coordinates to the screen with the same formula:

```
screen = origin + ((x − y) · cos30° · u,  (x + y) · u/2 − z · u)
```

`tools/iso.py` provides `W(ox, oy, u)` for this. Each generator sets its own origin and unit near the top of the file.

### Generators

| Tool | What it writes |
| --- | --- |
| `gen_NAME.py public/assets/img/NAME.svg` | One scene from a world-space description. Scenes: `hq`, `strategy`, `backup`, `helpdesk`, `network`, `security`, `cloud`, and `voip`. Also writes the phone cut `NAME-compact.svg` and the card cut `NAME-card.svg`. |
| `gen_office.py public` | The office floor plan: `office.svg` and `office-card.svg`. The hero: `hero-office.svg`, its tablet cut `hero-office-tablet.svg`, the animated phone cut `office-compact-build.svg` with its dashes `office-compact-flows.svg`, the phone cut as a still `hero-office-phone.svg`, and the hero's moving dashes `src/components/home/hero-flows.svg`. The animation CSS and the cloud's frame are in `tools/office_parts/`; the cloud's shapes come from `hero_cloud.py`. |
| `gen_grow.py` | The Home "We grow with you" world, `src/components/home/grow-world.svg`. One business grows in six steps. Every part carries the step it arrives on (`data-s`), and `src/scripts/grow.js` plays them. Given a folder, it also writes the five separate scenes the mockups used (`editing-room/grow-options/` on the `archive/editing-room` branch). |
| `gen_campus.py` | The footer's campus map, `public/assets/img/campus.svg`. No phone cut. `src/styles/footer.css` styles its parts by class (SVGO writes its polygons and lines as paths). The map is decoration, so it has `aria-hidden="true"` and no role or label: screen readers skip it, and the footer's own words say what it shows (`tools/tests/test_campus.py`). |
| `gen_light.py` | The light theme's drawings, from the dark ones with their colours swapped by role (`docs/design.md`, "Drawing colours"). Pictures: `NAME-light.svg` beside each `NAME.svg` (`src/components/Drawing.astro` shows one or the other). Drawings inside the page (the Home hero, its dashes, Grow): `src/styles/theme-drawings.css`, which recolours them with CSS. It follows the dark drawings: `regen.py` runs it last. `--check` fails if an output is out of date. |
| `gen_og.py public` | The share picture `og.png` (1200×630) and `apple-touch-icon.png` (180×180). Both are screenshots of a small page built from the site's tokens, fonts, and `office-card.svg`. Run it again after you change any of those. |

A generator that runs with nothing changed writes the same file, byte for byte, on any machine. A `git diff` shows only what you changed.

To run every generator at once (all but `gen_og.py`, whose screenshots depend on the machine):

```bash
python tools/regen.py
```

CI doesn't run the generators: only you and the agent change drawings, locally, and the site serves the committed SVGs as they are. So whoever changes a drawing runs `python tools/regen.py --check` before committing, and commits the SVGs with the script. A `git diff` after it that shows a drawing you didn't mean to change is a hand edit, or a script changed without its output.

**Which cut shows where.** The phone cut (`NAME-compact.svg`) is the same scene framed closer, with fewer and bigger labels. Its settings are `COMPACT` in each generator. Pages swap it in with `<picture>` where the drawing shows small: on a service's page below 1200 px, and on About below 1600 px. Cards always use `NAME-card.svg`, which is the phone cut with its labels and their embedded letters removed (`isogen.card()`), at about half the size. On phones, the Home hero plays `office-compact-build.svg`. Its build starts part way, on the furnished room (`PHONE_AHEAD` in `gen_office.py`). With reduced motion, it stands still. Without script, phones show the same scene as a picture, `hero-office-phone.svg`.

When you change a drawing's labels or layout, check its phone cut too.

### Shared drawing code

| Module | What it provides |
| --- | --- |
| `palette.py` | Every drawing colour by name, such as `pal.AMBER`, `pal.EDGE`, and `pal.SCREEN`. Roles are read from `tokens.css`. Shades with no role in `docs/design.md` are worked out here from the palette (`navy(L)`, `tone(hue, L, C)`). To change a colour, change it in `tokens.css`, then run the generators again. Part files in `tools/office_parts/` write colours as `{{pal:NAME}}`. |
| `iso.py` | The projection, `W(ox, oy, u)`. |
| `isogen.py` | Writing a drawing: boxes (`box()`, the one box writer, which can log each box to the generator's `BOXES`), the document (`doc(crop=)`), labels (`label(scale=)`; a newline in a title or subline wraps it) and the floor gaps round their words (`label_text_gaps()`), the card cut (`card()`), `esc()` for any words written into a drawing, and `hoist_styles`, which turns inline timings into classes in a `<style>` block. |
| `isoprops.py` | Shared props: office chair, monitor on a stand (with `screen_glass` and `app_window` for its screen), and VoIP desk phone. Also `on_front`, `on_side`, and `on_top`, which draw flat details exactly on a box face. Props sit on a grid (x and y in steps of 0.25, z in steps of 0.125) so their parts can never nearly touch. Keep the scene around them on the same grid. |
| `hero_cloud.py` | The hero's cloud. |
| `svgfont.py` | Embeds the Barlow letters a drawing uses. An SVG loaded with `<img>` can't see the page's fonts, so each drawing carries its own subset. The generators do this for you. The fonts are in `tools/fonts/` (SIL Open Font License). Needs `fonttools` and `brotli`. |

### Check a drawing

After you change a drawing, run both checks on it. Each exits with status 1 on any finding.

- **`check.py FILE.svg`** finds edges that are near an isometric angle but not on it (`ANGLE`), vertices of different shapes that nearly meet (`SNAP`), and vertices that nearly touch another shape's edge (`TJOIN`). It also lists where each leader dot sits (`DOT`); those lines are for reading and don't fail the check. For an SVG inline in an HTML file, add the line range: `check.py FILE START_LINE END_LINE`.
  - It skips leader lines in `.co` groups and `class="mark"` parts (arrowheads, the map's routes), which cross the drawing on purpose, and the floor grid (`class="floor"` on a line or its group). `class="free"` parts, tilted on purpose, skip only `ANGLE`.
  - A near-miss that a later opaque face covers can't be seen, so it isn't reported.
  - `<g class="curve">` holds a curved surface cut into flat strips, such as the side wall of the hero's cloud. Its strips aren't checked against each other.
  - `--step PX` counts vertex pairs exactly one grid step apart along an isometric axis, instead of listing them. Use it for drawings whose props sit on a grid finer than 2 px on screen. For the office: `--step 1.758` (0.0625 × 28.127).
- A drawing's CSS, its own `<style>` or the site's, styles parts by class, never by tag: SVGO writes `<polygon>`, `<line>` and `<rect>` as `<path>` in the shipped file. `npm run build` stops on a drawing whose `<style>` breaks this rule.
- **`painter.py`** finds boxes drawn in the wrong order or poking into each other. It also fails when it finds no boxes, or when the rules file resolves none of them, which usually means the origin or unit in the command is wrong. Each drawing has a `rules_NAME.py`. Its first lines give the exact commands for both checks, on every cut. For Grow:

  ```bash
  python tools/painter.py src/components/home/grow-world.svg 0 0 20 tools/rules_grow.py
  python tools/check.py src/components/home/grow-world.svg
  ```

- **Every check at once:** `python tools/regen.py --check` regenerates the drawings, then runs every command the rules files list. `--checks-only` skips the generators.
- **The tools' own tests:** `python -m pytest tools/tests`. They cover the projection, the palette, `isogen`, `check.py` on small hand-made drawings, and depth order straight from each generator's `BOXES` (the check `painter.py` does on the SVG).

### Site checks

These checks open the built site in a browser. Each is a Playwright Test spec in `checks/`, which `scripts/check.mjs` runs for npm. Start `npm run serve` first.

- Pass a check's arguments after `--`, for example `npm run verify -- --all`.
- To check another address than http://localhost:8787, add `--base URL`.
- Playwright's own options go after a second `--`, for example `npm run verify -- --all -- --headed`.

Each check fails, and exits with status 1, on any finding. Every check takes its pages from the build: each `.html` file in `dist/` (another folder with `--dist DIR`), with the 404 page asked for at an address that doesn't exist. It also reads the served `sitemap.xml` and fails unless the sitemap lists exactly those pages, apart from `/soon` and the 404 page. So build before you check, and check the build you're serving. The page list and screen sizes are in `checks/lib.mjs` (`pages`, `SIZES`, `MISSING`). A failed check leaves its details in `out/test-results/`.

Each test's name says what it holds, often with the WCAG number or the review item it guards; read them in the spec files rather than a list here.

- **`npm run verify [-- --all] [--out DIR]`**: the main browser check (`checks/site.spec.mjs`), then the zoom check. On every page: no script error or CSP block while it loads, its timers run on (Playwright's clock), the screen turns, and each of its buttons is pressed; one `h1` and no skipped heading level; JSON-LD parses; no sideways scroll from 320 to 1280 px; each pop-up shows, passes axe, closes on Esc, and gives focus back; card titles are headings holding their link; no word in a heading or stat breaks across lines; and an axe pass (WCAG 2.2 A and AA plus best practices), which fails on anything serious or critical, or moderate unless `AXE_ALLOW` names the rule and why. On Home it also checks the hero, Grow, the services row, the footer at 1440×900, the header's room at every width, the 100 px wheel grid, forced colours, 1.4.11 and 1.4.13, print, and the pages with script blocked. Everything runs twice, as is and with the site's pause on. Home runs at phone, tablet, 1440×900 and 3440×1440 (`FOCUS`), every other page at phone size; `--all` gives every page the full check. A known bug is an expected failure (`KNOWN`, naming its review item), so the mark comes out with the fix. Screenshots go to `out/`.
- **`npm run verify:zoom [-- --all]`**: text at browser zoom and at a bigger default font (WCAG 1.4.4, 1.4.10; `checks/zoom.spec.mjs`), emulated as the browser does it: 200% and 400% zoom, and 20, 24 and 32 px default fonts, on phone to 2560×1440 screens, never under 20em wide. It fails if the root font size isn't the default, body text doesn't grow by the zoom, text is clipped, overlapped, or out of reach, or the page scrolls sideways; and if any `h1`, `h2`, stat number or footer heading gets smaller on screen from one zoom step (110 to 200%) to the next. It prints how much they grow at 200%.
- **`npm run verify:links [-- --external]`**: every link, picture, script, and preload on every page answers (the 404 page's too), every `#section` finds its id, and Chromium prefetches a page on hover but never `/api/` or `.md` links. `--external` also checks links to other sites.
- **`npm run verify:spacing [-- PAGE …]`**: every margin, padding, and gap on screen is a step of the spacing scale ([`docs/design.md`](docs/design.md#spacing)).
- **`npm run verify:styles -- BEFORE_URL AFTER_URL [PAGE …]`**: compares every element's computed style at four sizes between two builds. Run it after you move CSS.
- **`npm run visual-diff -- OLD_URL NEW_URL [--strict] [--wide]`**: screenshots every page of both sites at phone, tablet, and desktop, drawings masked, and lists what looks different (`out/visual/`). CI runs it against the live site on a pull request with the `full-checks` label. It never fails unless you add `--strict`; `--wide` adds 1280×720 and 2560×1440.
- **`npm run release-audit [-- --only PARTS] [--html-all]`**: the release audit (`checks/audit.spec.mjs`): every page in Chromium, Firefox, WebKit, and emulated phones, a keyboard Tab-through, a screen-reader transcript (Guidepup's Virtual Screen Reader), motion and pause, form errors, and the W3C HTML validator. A few minutes; run it before a release ([`docs/release.md`](docs/release.md)). The report is `out/audit/report.md`.

### Live-site checks

These checks ask a deployed site over plain HTTP. They need no local server.

| Command | What it checks |
| --- | --- |
| `npm run smoke -- ADDRESS [--launch] [--preview] [--old OLD_ADDRESS]` | Checks a deployed site: every sitemap page, the security headers (and that `X-Permitted-Cross-Domain-Policies` is gone), `noindex`, redirects (the other spellings of an address, and `http://`), the 404 page (its status, asked again with `If-None-Match`, and for a missing `.md`, `.txt`, script, font, or drawing, with the pages' headers), the Worker's own headers, the report endpoint, the Speculation Rules, `robots.txt`, `llms.txt`, and the Markdown copies of `/services` and Home (`noindex` and a canonical `Link` to the page, with `--launch` too). Run it after a deploy. `--launch` expects `noindex` to be gone from the pages, and a page asked for over `http://` to redirect. `--preview` checks a version at its own preview address, before it takes traffic: the sitemap, `robots.txt`, and the canonicals name the live address, and the `http://` redirect is left for the live run. `--old` checks that the old address redirects to the new one. CI also runs it against the local build (`npm run smoke -- http://localhost:8787`); on `localhost` it leaves out the `http://` redirect and the sitemap's host, which only a deployed site has. |
| `npm run pagespeed -- ADDRESS [--strict] [--min N] [--sample]` | Runs Google PageSpeed Insights on the sitemap's pages, on phone and desktop. It reports whether Home scores 100 in all four categories. `--strict` holds every page to that. Needs `PSI_API_KEY` in `.dev.vars` or the environment. See [`docs/security.md`](docs/security.md#secrets). |

## Hosting

The site runs on Cloudflare Workers with static assets, live at https://uplink-site.johnoreilly.workers.dev. The Worker, CI and deploys, previews, repository rules, rollback, response headers, search engines, and the password lock are in [`docs/ops.md`](docs/ops.md).
