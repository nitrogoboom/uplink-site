# Uplink Technology site

The website for Uplink Technology, a made-up IT company, with placeholder content. Astro 7, plain CSS, and plain JavaScript, built by `astro build` alone; Cloudflare serves the result as static files.

- **Content is data.** Every service, project, and list is a typed JSON, YAML, or Markdown file. Pages, cards, menus, the sitemap, and the structured data read from those files.
- **Drawings are code.** A Python script writes every illustration. Never edit an output SVG by hand.

## Related documents

| Document | What it covers |
| --- | --- |
| [`CLAUDE.md`](CLAUDE.md) | The rules for every change, and which checks to run. |
| [`.claude/skills/`](.claude/skills), [`.claude/rules/`](.claude/rules) | Step lists for a release and a drawing change; the rules for each kind of file. Claude's edits are formatted by Prettier as they're made (`.claude/hooks/format.mjs`). |
| [`notes.md`](notes.md) | Open items. Start here. |
| [`parked.md`](parked.md) | Open items on hold until the owner asks. |
| [`src/README.md`](src/README.md) | A map of the source code. |
| [`docs/drawing-tools.md`](docs/drawing-tools.md) | The drawing rules, generators, and checks. |
| [`docs/ops.md`](docs/ops.md) | Hosting: what Astro does and what Cloudflare does, deploys, previews, rollback. |
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

The development server doesn't apply the response headers, the Content Security Policy, or the redirects. To see the site as Cloudflare serves it, run `npm run build` and then `npm run serve`, and open http://localhost:8787.

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
| `npm run build` | Builds the site into `dist/` (Astro). Nothing runs after it: `dist/` is what ships. |
| `npm run serve` | Serves `dist/` the way Cloudflare does, at http://localhost:8787 (`wrangler dev`). Restart it after a rebuild. |
| `npm run preview` | Astro's own preview server. No headers or redirects: use `npm run serve`. |
| `npm run check` | Type check and Astro's diagnostics. |
| `npm run lint` | ESLint, Stylelint, and Prettier. |
| `npm run format` | Fixes what the linters can, then formats with Prettier. `astroCompressHTML` in `.prettierrc.json` matches `compressHTML` in `astro.config.mjs`: change the two together. A commit that only reformats goes in `.git-blame-ignore-revs`. |
| `npm run quick` | Type check, lint, and build (about 30 seconds). |
| `npm run deploy` | Builds, then deploys the checked-out branch by hand (`wrangler deploy`). CI deploys on a push to `main`, so you rarely need it; run it from `main` ([Deploys](docs/ops.md#deploys)). |

## How the repository is organized

| Path | What it holds |
| --- | --- |
| `src/` | The site. [`src/README.md`](src/README.md) maps it. |
| `public/` | Files served as they are: `_headers`, `speculation-rules.json`, the fonts' licence (the fonts are in `src/assets/fonts/`), `og.png`, and the favicons. The drawings are in `src/assets/img/` (Astro gives each a hashed address). `favicon.ico` is made from `favicon.svg` by `node tools/favicon-ico.mjs`; rerun it when the icon changes. |
| `tools/` | The drawing generators and their checks, in Python. [`docs/drawing-tools.md`](docs/drawing-tools.md). |
| `astro.config.mjs` | The site's settings: address, languages, CSS inlining, Content Security Policy, fonts. |
| `wrangler.jsonc` | The Cloudflare configuration: serve `dist/` as static files. |
| `.github/workflows/site.yml` | CI and deploys. |
| `docs/` | The docs above. |

### Links and addresses

Addresses have no `.html`: `/services`, `/contact#message`. Cloudflare redirects `/services.html` and `/services/` to the clean address. In a component a link is written as in English and passed through `to()` (`linker()` in `src/lib/i18n.ts`), which gives the page's language its own address.

The site's public address is `SITE_URL`: set it in the environment, or change the default in `astro.config.mjs`. At launch, set it to the real domain.

### Languages

English today, built the Astro way so French is an addition, not a rewrite:

- `astro.config.mjs` lists the languages (`i18n`). English is at `/`; any other is at `/<language>/`.
- Each page is one file in `src/pages/[...locale]/`, built once per language. A page knows its language from `Astro.currentLocale`.
- Everything a visitor reads is in `src/content/en/`.

To add French: add `'fr'` to `locales` in `astro.config.mjs`, copy what is translated into `src/content/fr/` (same file names), and import its `footer.json` in `src/lib/footer.ts`. Anything `fr/` lacks shows in English. A language switch link is still to add (`notes.md`).

### Content works without script

Every service and project is in the page's HTML in full. Every page reads and works with script turned off.

## Add a service

1. Copy a file in `src/content/en/services/` to `SLUG.json`. The slug becomes the address, `/services/SLUG`. The fields are typed in `src/content.config.ts`.
2. Copy `tools/gen_voip.py` to `tools/gen_NAME.py` and change the scene. It writes `src/assets/img/NAME.svg`, `NAME-compact.svg`, and `NAME-card.svg`. Set `image` in the JSON to `NAME`.
3. Run the generator and its checks ([Check a drawing](docs/drawing-tools.md#check-a-drawing)).
4. Run `npm run build`.

Everything else comes from the JSON file.

### Add a project

The same, with `src/content/en/projects/SLUG.json` and `/work/SLUG`. `services` lists service slugs. Each `tag` a project uses gets a filter on `/work`, in the order the projects first use it.

The smaller lists are the other JSON files in `src/content/en/`.

### Change the site's words

Every other word is in `src/content/en/copy/`: one YAML file a page, and `ui.yaml` for the shared parts. Edit the YAML and rebuild. To add a string, see [Copy](src/README.md#content-and-copy).

## Drawing rules

See [`docs/drawing-tools.md`](docs/drawing-tools.md#drawing-rules).

## Tools

The drawing tools (Python, `tools/`) are in [`docs/drawing-tools.md`](docs/drawing-tools.md): the projection, Generators, Shared drawing code, and Check a drawing. Every tool runs from the project root.

## Browsers

Chrome, Edge, Firefox and Safari (Mac and iPhone), every version from the last year, plus Firefox ESR (owner, November 13, 2026; in that order of priority). `browserslist` in `package.json` says the same for any tool that reads it. A newer feature is fine when those browsers have it, or when one without it still shows a working page (`text-wrap: pretty` wraps normally; the footer's rows open at once without `::details-content`; Settings opens by script without `commandfor`).

## Hosting

Cloudflare Workers, static assets only (no Worker script), live at https://jodesign.ca. See [`docs/ops.md`](docs/ops.md).
