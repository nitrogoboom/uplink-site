# Uplink Technology site

*Last updated: November 6, 2026*

This repository holds the website for Uplink Technology, a made-up IT company. The content is placeholder text, and the look is inspired by the Overwatch 2 menus. This page explains how to run the site, how it's organized, and how to use the tools that build and check it.

The site is built with Astro 7, plain CSS, and plain JavaScript, with no UI framework. Cloudflare Workers serves it as static files. Two ideas shape the code:

- **Content is data.** Every service, project, and list is a typed JSON or Markdown file. Pages, cards, menus, the sitemap, and the structured data all read from those files.
- **Drawings are code.** Every illustration is written by a Python script. You change the numbers in the script and run it again; you never edit the SVG by hand.

## Related documents

| Document | What it covers |
| --- | --- |
| [`notes.md`](notes.md) | Open items: bugs, polish, and decisions still to make. Start here. |
| [`docs/sop.md`](docs/sop.md) | How a change reaches the live site, the standards the site meets, and the release checklist. |
| [`src/README.md`](src/README.md) | A map of the source code: pages, components, content, styles, and scripts. |
| [`docs/spacing.md`](docs/spacing.md) | Spacing and line-height rules. |
| [`docs/security-and-compliance.md`](docs/security-and-compliance.md) | Security, privacy, and accessibility controls, and how to check each one. |
| [`docs/secrets.md`](docs/secrets.md) | Every secret and key the site uses, and where it's kept. Names only, never values. |
| [`docs/go-live-checklist.md`](docs/go-live-checklist.md) and [`docs/launch-runbook.md`](docs/launch-runbook.md) | What's left before the real domain goes live, and the steps for launch day. |
| [`SECURITY.md`](SECURITY.md) | How to report a security problem. |
| [`docs/history/`](docs/history/) | Finished work kept for its reasoning. Read it to learn why something is the way it is, not as instructions. |

## Before you begin

You need the following:

- Node.js 24. The exact version is in `.node-version`, and CI reads the same file.
- For the drawing tools only: Python 3.12. The site's checks, and CI, need only Node.

## Run the site locally

1. Install the dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Open http://localhost:4321.

The development server doesn't apply the response headers, the 404 page, or the redirects. To see the site exactly as Cloudflare serves it, build it and serve the result:

```bash
npm run build
npm run serve
```

Then open http://localhost:8787.

### Install the browsers for the checks

The site checks run in Playwright Test, which `npm install` installs. They need a browser of their own. To install it:

```bash
npx playwright install chromium
```

The release audit also needs Firefox and WebKit:

```bash
npx playwright install firefox webkit
```

Claude Code's sandbox on Windows can't start Firefox from Playwright's usual folder (`%LOCALAPPDATA%\ms-playwright`: Windows refuses to load its `mozglue` library there). So Claude's sessions keep their browsers in `%USERPROFILE%\.cache\ms-playwright` instead, set by `PLAYWRIGHT_BROWSERS_PATH` in `.claude/settings.local.json` (on this machine only, not in git). The install commands above, run from a Claude session, put the browsers there; your own terminal keeps the usual folder.

### Install the Python drawing tools

The drawing generators are Python. You need them only to change a drawing. To install them:

```bash
pip install -r requirements.txt
python -m playwright install chromium
```

Python's Chromium is used only by `gen_og.py`, which screenshots the share picture.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the development server at http://localhost:4321. |
| `npm run build` | Builds the site into `dist/`. After Astro builds, it shrinks the drawings with SVGO, writes a Markdown copy of every page, and writes `dist/_headers` and `dist/_redirects`. |
| `npm run serve` | Serves `dist/` the way Cloudflare does, at http://localhost:8787: headers, the 404 page, and redirects included. Runs `wrangler dev`. |
| `npm run preview` | Astro's own preview server. It doesn't apply the headers or redirects, so use `npm run serve` instead. |
| `npm run check` | Checks types and runs Astro's diagnostics. |
| `npm test` | Tests the build's after-steps and the Worker with Node's built-in test runner (`scripts/test/`). |
| `npm run lint` | Runs ESLint, Stylelint, and Prettier. Prettier checks only JSON and YAML; the code is formatted by hand. |
| `npm run format` | Fixes what the linters can fix on their own. |
| `npm run ci` | Runs what CI runs, in order: check, tests, lint, build, the site check, and the link check. Starts `npm run serve` if it isn't already running. Needs Node and Playwright's Chromium, no Python. It doesn't run the screenshot comparison, the preview upload, or the deploy. |
| `npm run verify` | Runs the site check in a browser. See [Site checks](#site-checks). |
| `npm run verify:links`, `verify:text`, `verify:spacing`, `verify:styles`, `visual-diff` | Run the other site checks. See [Site checks](#site-checks). |
| `npm run release-audit` | Runs the release audit. See [Site checks](#site-checks) and [`docs/sop.md`](docs/sop.md). |
| `npm run smoke`, `npm run pagespeed` | Check a deployed site. See [Live-site checks](#live-site-checks). |
| `npm run deploy` | Deploys to the live Worker by hand. It runs `npm run ci` first, which builds the site and runs every check, and deploys only if they pass. |

> **Note:** CI deploys for you when a change is merged to `main`, so you rarely need `npm run deploy`. It deploys whatever branch you have checked out, so run it from `main`.

## How the repository is organized

| Path | What it holds |
| --- | --- |
| `src/` | The site. [`src/README.md`](src/README.md) maps it. |
| `public/` | Files served as they are: the `_headers` template, fonts, the drawings in `assets/img/`, `og.png`, and the favicon (`favicon.ico` is made from `favicon.svg` by `node scripts/favicon-ico.mjs`; rerun it when the icon changes). |
| `scripts/` | The build's after-steps. `svgo.mjs` shrinks the drawings in `dist/` (settings in `svgo-config.mjs`). `markdown.mjs` writes each page's Markdown copy. `headers.mjs` finishes `dist/_headers` with the script and style hashes and the Early Hints block, and writes `dist/_redirects`. `ci.mjs` is `npm run ci`. `check.mjs` runs one site check with its arguments (the npm check commands). Tests are in `scripts/test/`. |
| `tools/` | The drawing generators and their checks, in Python. Run them from the project root. See [Tools](#tools). |
| `checks/` | The site checks, as Playwright Test specs (`NAME.spec.mjs`), their shared page list and sizes (`lib.mjs`), and their settings (`playwright.config.mjs`). See [Site checks](#site-checks). |
| `worker/index.js` | The Worker script. See [Hosting](#hosting). |
| `wrangler.jsonc` | The Cloudflare Worker configuration. |
| `.github/workflows/site.yml` | CI and deploys. |
| `editing-room/` | Design work that isn't part of the build: mockups, drafts, and the colour work. `editing-room/palette/DESIGN.md` is the live colour spec. See [`editing-room/README.md`](editing-room/README.md). |
| `docs/` | Reference pages, records, and dated decisions. |

### Links and addresses

Links between pages are root-relative and have no `.html`, for example `/services` or `/contact#message`. Cloudflare serves `services.html` at `/services`. The build writes `dist/_redirects`, which sends `/services.html`, `/services/`, and `/index.html` to the clean address with a `308` status. Cloudflare's own handling would use `307`, which isn't permanent.

The site's public address is `SITE_URL`. Set it in the environment, or change the default in `astro.config.mjs`. It's written into canonical links, Open Graph tags, the sitemap, and the JSON-LD. At launch, set it to the real domain.

### Content works without script

Every service and project is in the page's HTML in full. Script only changes how much shows at once. Every page reads and works with script turned off.

## Add a service

1. Copy an existing file in `src/content/services/` and rename it `SLUG.json`. The slug becomes the page's address, `/services/SLUG`. The fields are typed in `src/content.config.ts`.
2. Write the drawing's generator. Copy `tools/gen_voip.py` to `tools/gen_NAME.py` and change the scene. It writes `public/assets/img/NAME.svg`, the phone cut `NAME-compact.svg`, and the card cut `NAME-card.svg`. Set `image` in the JSON to `NAME`.
3. Run the generator and its checks. See [Check a drawing](#check-a-drawing).
4. Run `npm run build`.

Everything else comes from the JSON file: the card on the Services page and Home, the footer link, the options in both "What do you need?" lists, the service's own page, the sitemap, `llms.txt`, and the JSON-LD.

### Add a project

A project works the same way. Its file is `src/content/projects/SLUG.json`, and its page is `/work/SLUG`. The `services` field lists service slugs. The case study links to each one, and each service's page lists the projects that name it.

The smaller lists (FAQ, team, footer, and the Grow section's copy) are in `src/data/*.json`.

## Footer

Every page has the same footer, except the 404 page, which is one screen with nothing under it (`footer={false}` on `Base`). On desktop, the footer is exactly one screen tall. It has three parts:

- **Stage:** the text for the selected section on the left, and a live campus map on the right.
- **Dock:** a row of tiles: Contact, Services, Company, Support, Resources, and Follow. Use the arrow keys or the two key-cap buttons to switch tiles.
- **Base bar:** the brand, legal links, and status. Keyboard shortcuts live in the Settings dialog, which the header's gear opens.

Below 700 px wide, the footer is six rows that open in place, with no map.

The lists come from `src/data/footer.json`, and the Services panel comes from the services collection. The markup is `src/components/Footer.astro`. Each panel has a `data-map` value that names a spot on the map. `tools/gen_campus.py` draws the map: `SPOTS` lists the spots and `ORDER` sets the back-to-front draw order. `src/scripts/footer.js` fetches the map when the footer scrolls near. Without script, every panel shows in a stack and the tiles are hidden.

## Drawing rules

Every drawing follows these rules. The values are measured in the files.

- **True isometric.** One axis runs right and down at 30°, one runs left and down at 30°, and verticals go straight up.
- **Colours by name.** Every colour comes from `tools/palette.py`, which reads `src/styles/tokens.css`. The colour roles come from `editing-room/palette/DESIGN.md`. Scripts use names, never hex values.
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
| `gen_office.py public` | The office floor plan: `office.svg` and `office-card.svg`. The hero: `hero-office.svg`, its tablet cut `hero-office-tablet.svg`, the animated phone cut `office-compact-build.svg` with its dashes `office-compact-flows.svg`, the phone cut as a still `hero-office-phone.svg`, and the hero's moving dashes `src/components/home/hero-flows.svg`. Also writes an animated reference copy, `out/drawings/office-build.svg`, which isn't deployed. The animation CSS and the hand-drawn cloud are in `tools/office_parts/`. |
| `gen_grow.py` | The Home "We grow with you" world, `src/components/home/grow-world.svg`. One business grows in six steps. Every part carries the step it arrives on (`data-s`), and `src/scripts/grow.js` plays them. Given a folder, it also writes the five separate scenes the mockups used (`editing-room/grow-options/`). |
| `gen_campus.py` | The footer's campus map, `public/assets/img/campus.svg`. No phone cut. SVGO leaves this file as written. |
| `gen_og.py public` | The share picture `og.png` (1200×630) and `apple-touch-icon.png` (180×180). Both are screenshots of a small page built from the site's tokens, fonts, and `office-card.svg`. Run it again after you change any of those. |

A generator that runs with nothing changed writes the same file, byte for byte. A `git diff` shows only what you changed.

**Which cut shows where.** The phone cut (`NAME-compact.svg`) is the same scene framed closer, with fewer and bigger labels. Its settings are `COMPACT` in each generator. Pages swap it in with `<picture>` where the drawing shows small: on a service's page below 1200 px, and on About below 1600 px. Cards always use `NAME-card.svg`, which is the phone cut with its labels and their embedded letters removed (`isogen.card()`), at about half the size. On phones, the Home hero plays `office-compact-build.svg`. Its build starts part way, on the furnished room (`PHONE_AHEAD` in `gen_office.py`). With reduced motion, it stands still. Without script, phones show the same scene as a picture, `hero-office-phone.svg`.

When you change a drawing's labels or layout, check its phone cut too.

### Shared drawing code

| Module | What it provides |
| --- | --- |
| `palette.py` | Every drawing colour by name, such as `pal.AMBER`, `pal.EDGE`, and `pal.SCREEN`. Roles are read from `tokens.css`. Shades with no role in `DESIGN.md` are worked out here from the palette. To change a colour, change it in `tokens.css`, then run the generators again. Part files in `tools/office_parts/` write colours as `{{pal:NAME}}`. |
| `iso.py` | The projection, `W(ox, oy, u)`. |
| `isogen.py` | Writing a drawing: the document (`doc(crop=)`), labels (`label(scale=)`; a newline in a subline wraps it), the card cut (`card()`), and `hoist_styles`, which turns inline timings into classes in a `<style>` block. |
| `isoprops.py` | Shared props: office chair, monitor on a stand (with `screen_glass` and `app_window` for its screen), and VoIP desk phone. Also `on_front`, `on_side`, and `on_top`, which draw flat details exactly on a box face. Props sit on a grid (x and y in steps of 0.25, z in steps of 0.125) so their parts can never nearly touch. Keep the scene around them on the same grid. |
| `hero_cloud.py` | The hero's cloud. |
| `svgfont.py` | Embeds the Barlow letters a drawing uses. An SVG loaded with `<img>` can't see the page's fonts, so each drawing carries its own subset. The generators do this for you. The fonts are in `tools/fonts/` (SIL Open Font License). Needs `fonttools` and `brotli`. |

### Check a drawing

After you change a drawing, run both checks on it. Each exits with status 1 on any finding.

- **`check.py FILE.svg`** finds edges that are near an isometric angle but not on it (`ANGLE`), vertices of different shapes that nearly meet (`SNAP`), and vertices that nearly touch another shape's edge (`TJOIN`). It also lists where each leader dot sits (`DOT`); those lines are for reading and don't fail the check. For an SVG inline in an HTML file, add the line range: `check.py FILE START_LINE END_LINE`.
  - It skips leader lines in `.co` groups, `class="mark"` arrowheads, and `class="free"` parts tilted on purpose.
  - `<g class="curve">` holds a curved surface cut into flat strips, such as the side wall of the hero's cloud. Its strips aren't checked against each other.
  - `--step PX` counts vertex pairs exactly one grid step apart along an isometric axis, instead of listing them. Use it for drawings whose props sit on a grid finer than 2 px on screen. For the office: `--step 1.758` (0.0625 × 28.127).
- **`painter.py`** finds boxes drawn in the wrong order or poking into each other. It also fails when it finds no boxes, or when the rules file resolves none of them, which usually means the origin or unit in the command is wrong. Each drawing has a `rules_NAME.py`, and its first lines give the exact command. For Grow:

  ```bash
  python tools/painter.py src/components/home/grow-world.svg 0 0 20 tools/rules_grow.py
  ```

### Site checks

These checks open the built site in a browser. Each is a Playwright Test spec in `checks/`, which `scripts/check.mjs` runs for npm. Start `npm run serve` first.

- Pass a check's arguments after `--`, for example `npm run verify -- --all`.
- To check another address than http://localhost:8787, add `--base URL`.
- Playwright's own options go after a second `--`, for example `npm run verify -- --all -- --headed`.

Each check fails, and exits with status 1, on any finding. Every check reads its pages from the served `sitemap.xml`, then adds `/soon` and an address that gets the 404 page. It fails if the sitemap lists fewer than five pages. The page list and screen sizes are in `checks/lib.mjs` (`pages`, `SIZES`, `MISSING`). A failed check leaves its details in `out/test-results/`.

| Command | What it checks |
| --- | --- |
| `npm run verify [-- --all] [--out DIR]` | The main browser check, which CI runs before every deploy (`checks/site.spec.mjs`). It checks: the hero builds, tiles respond to hover, the Grow section plays, and every footer tab works at 1440×900 (one screen tall below the header, no panel overflow). Home at phone, tablet, 1440×900, and 3440×1440 with no sideways scroll, and an axe pass at phone and desktop. The header's tabs stay 8 px clear of the logo and buttons at every width from 320 to 1440 in 10 px steps, plus 1600, 1920, 2560, and 3440, at normal and 200% text. Every other page once at phone size, with an axe pass. It fails on any script error, crash, CSP or Trusted Types block, a hero or Grow section that doesn't respond, sideways scroll, or a serious or critical axe finding. Home gets the full check because it's the page being worked on (`FOCUS` in the spec). Add `--all` to give every page the full check. Screenshots go to `out/`. |
| `npm run verify:links [-- --external]` | Every link, picture, script, and preload on every page answers, and every `#section` link finds its id. CI runs it. `--external` also checks links to other sites. |
| `npm run verify:text [-- --text N]` | Every page at four sizes with the text at 200% (or `N`×): no clipped, overlapping, or unreachable text, and no sideways scroll. `--text 1` runs it at the default size, where it should come back clear too. |
| `npm run verify:spacing [-- PAGE …]` | Every margin, padding, and gap on screen is a step of the spacing scale. See [`docs/spacing.md`](docs/spacing.md). |
| `npm run verify:styles -- BEFORE_URL AFTER_URL [PAGE …]` | Compares the computed style of every element on every page at four sizes between two builds. Run it after you move CSS to prove nothing changed. |
| `npm run visual-diff -- OLD_URL NEW_URL [--strict]` | Screenshots every page of both sites at phone, tablet, and desktop, with the drawings masked, and lists what looks different (`out/visual/`). CI runs it on each pull request against the live site and puts the list in the run's summary. It reports and never fails, unless you add `--strict`. |
| `npm run release-audit [-- --only PARTS] [--html-all]` | The release audit (`checks/audit.spec.mjs`). It runs every page in Chromium, Firefox, WebKit, and emulated phones, plus a keyboard Tab-through, a screen-reader transcript (Guidepup's Virtual Screen Reader), motion and pause, form errors, and the W3C HTML validator. It takes a few minutes, so run it before a release, not on every build. The report is `out/audit/report.md`. |

### Live-site checks

These checks ask a deployed site over plain HTTP. They need no local server.

| Command | What it checks |
| --- | --- |
| `npm run smoke -- ADDRESS [--launch] [--old OLD_ADDRESS]` | Checks a deployed site: every sitemap page, the security headers, `noindex`, redirects, the 404 status, the report endpoint, `robots.txt`, `llms.txt`, and a Markdown copy. Run it after a deploy. `--launch` expects `noindex` to be gone. `--old` checks that the old address redirects to the new one. |
| `npm run pagespeed -- ADDRESS [--strict] [--min N] [--sample]` | Runs Google PageSpeed Insights on the sitemap's pages, on phone and desktop. It reports whether Home scores 100 in all four categories. `--strict` holds every page to that. Needs `PSI_API_KEY` in `.dev.vars` or the environment. See [`docs/secrets.md`](docs/secrets.md). |

## Hosting

The site runs on Cloudflare Workers with static assets.

- **Code:** the private GitHub repository `nitrogoboom/uplink-site`.
- **Site:** a Worker named `uplink-site` serves `dist/` as static assets (`wrangler.jsonc`). Until the site has its own domain, it's at https://uplink-site.johnoreilly.workers.dev. The old Cloudflare Pages project was deleted on October 28, 2026.

### The Worker

`worker/index.js` is the site's only server code. Today, `run_worker_first` is `true` in `wrangler.jsonc`, so every request reaches the Worker before the static files. The Worker does three things:

- Redirects `http://` to `https://` with a `308`. `workers.dev` belongs to Cloudflare, so its "Always Use HTTPS" setting isn't ours to turn on.
- Answers `POST /api/report`, where visitors' browsers send script errors and CSP blocks. Each report becomes one line in the Workers logs. Any other `/api/*` address gets a 404.
- Gives `/404` itself a 404 status.

Everything else goes on to the static files, with `_headers`, `_redirects`, and the 404 page applied.

> **Note:** Every request counts against the free plan's 100,000 Worker requests a day. At launch, turn on Always Use HTTPS on the real domain's zone and set `run_worker_first` back to `["/api/*", "/404"]`. The steps are in [`docs/launch-runbook.md`](docs/launch-runbook.md).

### Deploys

GitHub Actions deploys the site (`.github/workflows/site.yml`).

- CI runs on every pull request and on every push to `main`. It runs `npm ci`, the type check, the tests, lint, the build, the site check (`npm run verify`), and the link check (`npm run verify:links`) against the built site served by `wrangler dev`. It needs no Python.
- A change that touches only root `*.md` files or `docs/` runs no CI and deploys nothing.
- A push to `main` that passes deploys to the live Worker.
- A pull request also runs the screenshot comparison (`npm run visual-diff`) against the live site, uploads a preview version, and posts its address as a comment. The address comes from the branch name, `https://BRANCH-uplink-site.johnoreilly.workers.dev`, so it stays the same on every push.
- The workflow needs two secrets in a GitHub environment named `cloudflare`: `CLOUDFLARE_API_TOKEN` (with "Workers Scripts: Edit") and `CLOUDFLARE_ACCOUNT_ID`. Without them, the deploy and preview jobs are skipped. The environments `production` (deploys from `main` only) and `preview` are set up to replace it (`notes.md`).

### Repository rules

Two rulesets protect `main` (GitHub > Settings > Rules > Rulesets):

- **main: no force push or delete.** Applies to everyone.
- **main: pull request and build.** A change reaches `main` through a pull request, and the `build` job must pass. Repository admins can bypass it, so a change to only root `*.md` files or `docs/` (which runs no CI) can still go straight to `main`.

Secret scanning with push protection, private vulnerability reporting, CodeQL (default setup), and the dependency graph are on under Settings > Code security.

### Roll back a bad deploy

1. List the recent deploys:

   ```bash
   npx wrangler deployments list
   ```

2. Put the previous version back live:

   ```bash
   npx wrangler rollback
   ```

   For an older version, add its ID: `npx wrangler rollback VERSION_ID`. A rollback takes seconds and needs no build.

3. Fix `main`. The next push to `main` deploys it again.

### Response headers

`public/_headers` sets the security headers on every static file (HSTS, `nosniff`, Referrer-Policy, Permissions-Policy, Cross-Origin-Opener-Policy, Cross-Origin-Resource-Policy, X-Permitted-Cross-Domain-Policies, X-Frame-Options, and the CSP) and the cache rules. Responses the Worker writes itself, such as the `308` redirect and `/api/report`, don't get them.

The file is a template. `npm run build` runs `scripts/headers.mjs`, which writes `dist/_headers` with a hash for every inline `<script>` and `<style>` in the built pages and in the drawings that scripts insert. It also writes an Early Hints `Link` rule for each page. Don't paste a hash in by hand.

Keep these rules in mind:

- **Outside hosts.** Adding an outside host, such as fonts, analytics, or a form service, means adding it to the CSP.
- **Trusted Types.** The CSP requires Trusted Types. A script that writes HTML (`innerHTML`, `insertAdjacentHTML`) must pass the string through `html()` from `core.js`, or the browser blocks it.
- **No `style=""` attributes.** `style-src` has no `'unsafe-inline'`, and the build fails on any `style=""` attribute. Scripts set styles with `el.style.x = …` instead.

### Search engines

The site is open to visitors but kept out of search results. `public/_headers` sends `X-Robots-Tag: noindex` on every response, because the content is placeholder. Remove that line at launch.

### Password lock

The password lock is off. `tools/site-lock/worker.js` puts the whole site behind a browser password prompt. Its header comment explains how to turn it on and set the `SITE_PASSWORD` secret.
