# Uplink Technology site

Static mockup site (placeholder content) for a made-up IT company, with an Overwatch 2–inspired look. Astro 7, plain CSS and JS, served by Cloudflare Workers. Live at https://uplink-site.johnoreilly.workers.dev.

## Where things are written down

- `docs/review-2026-11-07.md`: the current work list from the November 7, 2026 review. Each item has an ID (B1, H4 …), evidence, a fix and a status. Work from it, and tick an item only when its check passes.
- Docs can lag the code. When a doc and the code disagree, the code and its tests are right: fix the doc in the same PR. Treat any rule below as a claim to check, not a law.
- `notes.md`: open items. Start here. Add new items there; remove a line when it's done.
- `README.md`: every command, tool and flag, the repo layout, drawing rules, hosting. The site checks are Playwright Test specs in `checks/` (Node); only the drawing tools in `tools/` are Python. Look a command up there (or in `package.json`) rather than guessing.
- `src/README.md`: the source map: pages, `Base.astro` props, components, content fields, CSS order, breakpoints, scripts.
- `docs/sop.md`: how a change ships, the standards (WCAG 2.0 AA, security, browsers), the release checklist.
- `docs/spacing.md`: which `--sp-*` step goes where. Read it before touching any margin, padding, gap or line height.
- `editing-room/palette/DESIGN.md`: colour roles.
- `docs/secrets.md`: secret names and where they live, never values.
- `docs/launch-runbook.md`, `docs/go-live-checklist.md`: launch day, and what's left before it.
- `docs/history/` and dated `docs/*-YYYY-MM-DD.md` files: records. Read them for why; take instructions only from the files above.

## Content is data

- A service is `src/content/services/SLUG.json`, a project `src/content/projects/SLUG.json`; the slug is the address. The `page` field holds the copy only that item's own page shows. Smaller lists are `src/data/*.json`, kept in file order through `byOrder`.
- Schemas are strict (`src/content.config.ts`; `footer.json`'s in `src/lib/footer.ts`): an unknown key, an icon not in `src/components/icons.ts` or an `image` with no drawing fails the build. Import footer data from `src/lib/footer.ts`, not the JSON; the JSON holds no HTML.
- Every card, footer link, select option, page, sitemap line and JSON-LD block reads from those files. Change words in the data, once.
- The seven static pages' `<title>` and description live in `PAGES` in `src/lib/site.ts`.
- Privacy and accessibility are Markdown in `src/data/`. Contact details there are placeholders (`{privacy}`, `{phone}`, `{street}` …) filled from `src/data/footer.json` while the Markdown renders (`src/lib/placeholders.mjs`, a plugin in `astro.config.mjs`); a name with no value fails the build. When the site starts collecting something new or a processor changes, update `src/data/privacy.md` in the same PR.
- Home's Markdown copy (`src/data/index.md`) and `src/data/agents.md` are hand-written. Every other page's `.md` copy is generated from its `<main>`; `data-md-skip` leaves a decorative part out.

## Markup and scripts

- Links are root-relative: `/services`, `/contact#message`.
- A page's own script goes inside `<Base>`: `<Fragment slot="scripts"><script>import '../scripts/x.js'</script></Fragment>`. Every page script imports `core.js`.
- Icons: `<Icon name="…" />`.
- HTML written by a script goes through `html()` from `core.js` (Trusted Types).
- Styles from script: `el.style.x = …`. Markup carries classes only; the CSP has no `'unsafe-inline'` and the build fails on a `style=""` attribute.
- `public/_headers` is a template; `scripts/headers.mjs` fills in the hashes and Early Hints at build. Hashes are always generated.
- A link whose visible parts sit in separate boxes gets `<Pause />` between them. A `<Pause />` inside a sideways-scrolling row needs `position: relative` on its box (it's absolute, and would widen the page).
- The Worker (`worker/index.js`) runs only for `/api/*`, `/404` and addresses with no file (`run_worker_first` and `not_found_handling: "none"` in `wrangler.jsonc`); every other request is a static file. What it does: README, "The Worker".

## CSS

- Values come from tokens in `src/styles/tokens.css`: colours, sizes, timings. Lint refuses raw spacing.
- Order matters: a later file wins a tie. `src/styles/global.css` is the cascade order. A section's CSS sits beside its component, with its desktop layout at the end of that file; a block more than one page uses lives in `src/styles/`.
- After moving CSS, prove nothing changed: build old and new, then `npm run verify:styles -- OLD_URL NEW_URL`.
- Breakpoints are in `em`, in range syntax (`(width < 43.75em)`): the names in `src/lib/media.js`, and one-off queries the same way. Zoom and a bigger default font then count as a narrower screen.
- A box sized to the screen sets a minimum height (`min-height: var(--fold-inner)`), never a fixed one. The picture inside takes what is left (`flex: 1; min-height: <rem floor>`, and no room of its own: an absolute `<img>`), so words that need more room grow the box instead of being cut.
- Text size (WCAG 1.4.4) is the browser's own zoom; the site has no text-size option (review C13). New display options (light/dark, EN/FR) go in Settings.

## Drawings

- Every illustration is written by `tools/gen_*.py`. Change the numbers in the script and rerun it; the SVGs are outputs. That includes the hero (`gen_office.py`), Grow (`gen_grow.py`) and the footer map (`gen_campus.py`).
- True isometric, per "Drawing rules" in README. After touching a drawing, run `tools/check.py` and `tools/painter.py` on it (each `rules_NAME.py` gives the exact command), and look at its `NAME-compact.svg` phone cut.
- Timings in a drawing become classes in a `<style>` block (`hoist_styles` in `tools/isogen.py`).

## Checking a change

- Local first: `npm run dev`, then `npm run ci` (what CI runs).
- After layout changes: `npm run build && npm run serve`, then `npm run verify`. `npm run verify -- --all` gives every page the full check.
- Before a release: `npm run release-audit` and the checklist in `docs/sop.md`.
- After a deploy: `npm run smoke -- ADDRESS`.

## Branches, pushes, previews

- One branch per session. Commit locally as often as you like. Each push to a PR runs CI (about 3 minutes) and each merge to `main` deploys, so push when a phone preview is wanted and merge when the batch is done.
- A phone preview ("preview", "link for my phone"): push the branch and open a PR. CI comments `https://ALIAS-uplink-site.johnoreilly.workers.dev`; `node scripts/preview-alias.mjs BRANCH` prints the alias (branch lowercased, non-alphanumerics to `-`, repeats and end dashes dropped, `b-` in front if it doesn't start with a letter; over 30 chars, cut to 23 plus `-` and a 6-character hash). Find it with `gh pr view N --comments` or `gh pr checks N`. Previews never touch the live Worker.
- Changes to only root `*.md` or `docs/` run no CI and deploy nothing, so notes can go straight to `main`.
- Cloudflare work: the `cloudflare:*` skills cover Workers and Wrangler.

## Writing

- Copy: short, plain sentences.
- Look: no "AI slop" tells. Cards have even borders, never a left-side accent.
- Docs (README, `docs/`): Google developer-docs style: second person, present tense, sentence-case task headings, numbered steps, `UPPER_SNAKE` placeholders, `> **Note:**` callouts, dates as "November 5, 2026".
- A decision's reasoning goes in a dated file in `docs/`; to-do lines go in `notes.md`.
- When a command, tool, rule or file changes, update the doc that owns it (the list above) in the same PR.
