# Uplink Technology site

The website for Uplink Technology, a made-up IT company, with placeholder content. Astro 7, plain CSS, and plain JavaScript; Cloudflare Workers serves it as static files.

- **Content is data.** Every service, project, and list is a typed JSON, YAML, or Markdown file. Pages, cards, menus, the sitemap, and the structured data read from those files.
- **Drawings are code.** A Python script writes every illustration. Never edit an output SVG by hand.

## Related documents

| Document | What it covers |
| --- | --- |
| [`CLAUDE.md`](CLAUDE.md) | The rules for every change, and which checks to run. |
| [`.claude/skills/`](.claude/skills), [`.claude/rules/`](.claude/rules) | Step lists for a release and a drawing change; the rules for each kind of file. |
| [`notes.md`](notes.md) | Open items. Start here. |
| [`src/README.md`](src/README.md) | A map of the source code. |
| [`docs/drawing-tools.md`](docs/drawing-tools.md) | The drawing rules, generators, and checks. |
| [`docs/site-checks.md`](docs/site-checks.md) | The smoke check the deploy runs. Every other check is a look done by hand: the `check` skill. |
| [`docs/ops.md`](docs/ops.md) | The Worker, CI and deploys, previews, rollback, response headers. |
| [`docs/design.md`](docs/design.md) | Colour, spacing, line height, corners, and layout. |
| [`docs/release.md`](docs/release.md) | The release checklist and launch day. |
| [`docs/security.md`](docs/security.md), [`SECURITY.md`](SECURITY.md) | Security controls and secrets; how to report a problem. |

## Before you begin

You need Node.js 24 (the exact version is in `.node-version`). The drawing tools also need Python 3.12 or later.

## Run the site locally

1. Install the dependencies and start the development server:

   ```bash
   npm install
   npm run dev
   ```

2. Open http://localhost:4321.

The development server doesn't apply the response headers, the 404 page, or the redirects. To see the site as Cloudflare serves it, run `npm run build` and then `npm run serve`, and open http://localhost:8787.

### Install Firefox and WebKit for a look

Only for the `check` skill's browser compatibility look, which takes screenshots in Firefox and WebKit. Nothing else needs a browser:

```bash
npx playwright install firefox webkit
```

> **Note:** Claude Code's sandbox on Windows can't start Firefox from `%LOCALAPPDATA%\ms-playwright`, so Claude's sessions keep their browsers in `%USERPROFILE%\.cache\ms-playwright` (`PLAYWRIGHT_BROWSERS_PATH` in `.claude/settings.local.json`, not in git).

### Install the Python drawing tools

See [`docs/drawing-tools.md`](docs/drawing-tools.md#install-the-python-drawing-tools).

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the development server at http://localhost:4321. |
| `npm run build` | Builds the site into `dist/`. Its last step (`astro:build:done` in `astro.config.mjs`) shrinks the drawings, writes a Markdown copy of every page, and writes `dist/_headers` and `dist/_redirects`. |
| `npm run serve` | Serves `dist/` the way Cloudflare does, at http://localhost:8787 (`wrangler dev`). |
| `npm run preview` | Astro's own preview server. No headers or redirects: use `npm run serve`. |
| `npm run check` | Type check and Astro's diagnostics for `src/`. The build scripts and the Worker aren't type-checked. |
| `npm run lint` | ESLint, Stylelint, and Prettier. |
| `npm run format` | Fixes what the linters can, then formats with Prettier. `astroCompressHTML` in `.prettierrc.json` matches `compressHTML` in `astro.config.mjs`: change the two together. A commit that only reformats goes in `.git-blame-ignore-revs`. |
| `npm run quick` | Type check, lint, build (about 20 seconds). |
| `npm run smoke -- ADDRESS` | Checks a deployed site over plain HTTP: [`docs/site-checks.md`](docs/site-checks.md). The deploy runs it. |
| `npm run deploy` | Deploys the checked-out branch to the live Worker by hand, after `npm run quick` passes. One step (`wrangler deploy`): no check of the new version first, and no rollback ([Deploys](docs/ops.md#deploys)). CI deploys on a merge to `main`, so you rarely need it; run it from `main`. |

## How the repository is organized

| Path | What it holds |
| --- | --- |
| `src/` | The site. [`src/README.md`](src/README.md) maps it. |
| `public/` | Files served as they are: the `_headers` template, `speculation-rules.json`, fonts, the drawings in `assets/img/`, `og.png`, and the favicons. `favicon.ico` is made from `favicon.svg` by `node scripts/favicon-ico.mjs`; rerun it when the icon changes. |
| `scripts/` | The build's last steps, in this order: `svgo.mjs` shrinks the drawings (settings in `svgo-config.mjs`, whose `shipped()` hash is the `?v=` on each drawing a page inserts), and stops the build if a drawing's `<style>` names a tag. `markdown.mjs` writes each page's Markdown copy. `headers.mjs` finishes `dist/_headers` and writes `dist/_redirects`. Also: `deploy.mjs`, CI's deploy ([Deploys](docs/ops.md#deploys)); `check-dist.mjs`, wrangler's build step, which refuses an unfinished `dist/`; `check.mjs`, which runs the smoke check. |
| `tools/` | The drawing generators and their checks, in Python. [`docs/drawing-tools.md`](docs/drawing-tools.md). |
| `checks/` | The smoke check (`smoke.spec.mjs`), its arguments (`lib.mjs`), and `playwright.config.mjs`. [`docs/site-checks.md`](docs/site-checks.md). |
| `worker/index.js` | The Worker script ([`docs/ops.md`](docs/ops.md#the-worker)). |
| `wrangler.jsonc` | The Cloudflare Worker configuration. |
| `.github/workflows/site.yml` | CI and deploys. |
| `docs/` | The docs above, and `history/` (records). |

### Links and addresses

Links between pages are root-relative and have no `.html`: `/services`, `/contact#message`. The build writes `dist/_redirects`, which sends `/services.html`, `/services/`, and `/index.html` to the clean address with a `308`.

The site's public address is `SITE_URL`: set it in the environment, or change the default in `astro.config.mjs`. At launch, set it to the real domain.

### Content works without script

Every service and project is in the page's HTML in full. Every page reads and works with script turned off.

## Add a service

1. Copy a file in `src/content/services/` to `SLUG.json`. The slug becomes the address, `/services/SLUG`. The fields are typed in `src/content.config.ts`.
2. Copy `tools/gen_voip.py` to `tools/gen_NAME.py` and change the scene. It writes `public/assets/img/NAME.svg`, `NAME-compact.svg`, and `NAME-card.svg`. Set `image` in the JSON to `NAME`.
3. Run the generator and its checks ([Check a drawing](docs/drawing-tools.md#check-a-drawing)).
4. Run `npm run build`.

Everything else comes from the JSON file.

### Add a project

The same, with `src/content/projects/SLUG.json` and `/work/SLUG`. `services` lists service slugs. Each `tag` a project uses gets a filter on `/work`, in the order the projects first use it.

The smaller lists are in `src/data/*.json`.

### Change the site's words

Every other word is in `src/data/copy/en/`: one YAML file a page, and `ui.yaml` for the shared parts. Edit the YAML and rebuild. To add a string, see [Copy](src/README.md#content-and-copy).

## Drawing rules

See [`docs/drawing-tools.md`](docs/drawing-tools.md#drawing-rules).

## Tools

The drawing tools (Python, `tools/`) are in [`docs/drawing-tools.md`](docs/drawing-tools.md): the projection, Generators, Shared drawing code, and Check a drawing. The smoke check (Node, `checks/`) is in [`docs/site-checks.md`](docs/site-checks.md). Every tool runs from the project root.

## Hosting

Cloudflare Workers with static assets, live at https://uplink-site.johnoreilly.workers.dev. See [`docs/ops.md`](docs/ops.md).
