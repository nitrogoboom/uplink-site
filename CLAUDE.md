# Uplink Technology site

Static mockup site (placeholder content) for a made-up IT company, with an Overwatch 2–inspired look. Astro 7, plain CSS and JS, served by Cloudflare Workers. Live at https://uplink-site.johnoreilly.workers.dev.

## Where things are written down

- `notes.md`: open items, one line each. Start here. Add new items there; remove a line when it's done.
- `README.md`: setup, every command, tool and flag, the repo layout, drawing rules, the Worker, CI, deploys, rollback, repository rules. The site checks are Playwright Test specs in `checks/` (Node); only the drawing tools in `tools/` are Python. Look a command up there (or in `package.json`) rather than guessing.
- `src/README.md`: the source map: pages, `Base.astro` props, components, content and copy files, CSS order, breakpoints, heading fit, scripts.
- `docs/design.md`: colour roles and their tokens, spacing (`--sp-*` rules R0–R7), line height, corners, layout. Read it before you style anything.
- `docs/release.md`: the standards (WCAG 2.2 AA, privacy, security, browsers), the release checklist, what's left before launch, launch day. Before a release or launch only.
- `docs/security.md`: security and privacy controls, and every secret by name and place (never values).
- `docs/history/`: records and reasoning (the November 7, 2026 review, dated decisions, release records). Read them for why; take instructions only from the files above.
- Docs can lag the code. When a doc and the code disagree, the code and its tests are right: fix the doc in the same PR. Treat any rule below as a claim to check, not a law.

## Content is data

- A service is `src/content/services/SLUG.json`, a project `src/content/projects/SLUG.json`; the slug is the address. The `page` field holds the copy only that item's own page shows. Smaller lists are `src/data/*.json`, kept in file order through `byOrder`.
- Schemas are strict (`src/content.config.ts`; `footer.json`'s in `src/lib/footer.ts`): an unknown key, an icon not in `src/components/icons.ts` or an `image` with no drawing fails the build. Import footer data from `src/lib/footer.ts`, not the JSON; the JSON holds no HTML.
- Every card, footer link, select option, page, sitemap line and JSON-LD block reads from those files. Change words in the data, once.
- Every other word a component, layout or script shows or announces is in `src/data/copy/*.yaml`: one file a page, `ui.yaml` for shared UI and screen-reader text, each with a strict schema in `src/lib/copy-schema.ts`. Read with `await copy('home')` (`src/lib/copy.ts`; a missing key throws), fill `{n}` templates with `fill()`. To add a string: the key in the YAML and the schema, then use it. A page script gets its words as JSON (`<Words>`, read with `words()` from `core.js`). Type no words into markup or scripts. Details: `src/README.md`, "Copy".
- The seven static pages' `<title>` and description live in `PAGES` in `src/lib/site.ts`.
- Privacy and accessibility are Markdown in `src/data/`, with contact placeholders (`{privacy}`, `{phone}`, `{street}` …) filled from `src/data/footer.json` at render (`src/lib/placeholders.mjs`); a name with no value fails the build. When the site starts collecting something new or a processor changes, update `src/data/privacy.md` in the same PR.
- Home's Markdown copy (`src/data/index.md`) and `src/data/agents.md` are hand-written, with the same placeholders. Every other page's `.md` copy is generated from its `<main>`; `data-md-skip` leaves a decorative part out. Two parts in separate boxes that read as one line get a hidden separator (`<span class="sr-only">, </span>`, or `<Pause />`).

## Markup and scripts

- Links are root-relative: `/services`, `/contact#message`.
- A page's own script goes inside `<Base>`: `<Fragment slot="scripts"><script>import '../scripts/x.js'</script></Fragment>`. Every page script imports `core.js`.
- Icons: `<Icon name="…" />`.
- HTML written by a script goes through `html()` from `core.js` (Trusted Types).
- JavaScript in `src/` is type-checked (`checkJs`): JSDoc types on parameters and lookups (`src/README.md`, "Scripts"). Mark a promise you don't wait for with `void`.
- Styles from script: `el.style.x = …`. Markup carries classes only; the CSP has no `'unsafe-inline'` and the build fails on a `style=""` attribute.
- `public/_headers` is a template; `scripts/headers.mjs` fills in the hashes and Early Hints at build. Never paste a hash.
- A link whose visible parts sit in separate boxes gets `<Pause />` between them. Inside a sideways-scrolling row, a `<Pause />`'s box needs `position: relative`.
- The Worker (`worker/index.js`) runs only for `/api/*`, `/404` and addresses with no file; every other request is a static file (README, "The Worker").

## CSS

- Values come from tokens in `src/styles/tokens.css`: colours, sizes, timings. Lint refuses raw spacing. Colour by role (`docs/design.md`).
- Text sizes are in `rem`; the root has no font size of its own, so zoom and the visitor's font setting work everywhere. The screen (`vw`, `svh`) may size pictures, gaps and page width, never text.
- Order matters: a later file wins a tie; `src/styles/global.css` is the cascade order. A section's CSS sits beside its component, desktop layout at the end; a block more than one page uses lives in `src/styles/`.
- After moving CSS, prove nothing changed: build old and new, then `npm run verify:styles -- OLD_URL NEW_URL`.
- Breakpoints are in `em`, in range syntax (`(width < 43.75em)`): the names in `src/lib/media.js`, one-off queries the same way.
- A box sized to the screen sets a minimum height (`min-height: var(--fold-inner)`), never a fixed one; its picture takes what is left (`flex: 1; min-height: REM_FLOOR`, an absolute `<img>`), so longer words grow the box.
- Headings fit their column (`min(var(--fs-8|7), var(--fit))` against the nearest `container-type: inline-size` box). A heading with a word of 10 letters or more needs `class={fit(text)}` (`src/lib/fit.js`); the site check fails one without it. No heading may get smaller on screen as zoom grows: a `vw` part needs a non-negative rem part, and its column a rem floor. Details: `src/README.md`, "Styles".
- Text size (WCAG 1.4.4) is the browser's zoom and font setting; the site has no text-size option (review C13). The zoom check (`npm run verify:zoom`, also part of `npm run verify`) holds it. New display options (EN/FR) go in Settings, beside the theme.
- Cards have even borders, never a left-side accent.

## Drawings

- Every illustration is written by `tools/gen_*.py`, the hero (`gen_office.py`), Grow (`gen_grow.py`) and the footer map (`gen_campus.py`) included; the SVGs are outputs. Change the numbers in the script and rerun it. The one hand-edited SVG, `tools/office_parts/hero_cloud.svg`, is an input part `gen_office.py` fills in.
- `tools/gen_light.py` makes each `NAME-light.svg` and `src/styles/theme-drawings.css`. Show a picture through `<Drawing src="/assets/img/NAME.svg" … />`, which writes both copies. Colour new CSS from tokens, which `theme-light.css` swaps.
- Timings in a drawing become classes in a `<style>` block (`hoist_styles` in `tools/isogen.py`).
- True isometric, per "Drawing rules" in README. After touching a drawing, run `tools/check.py` and `tools/painter.py` on it (each `rules_NAME.py` gives the command), and look at its `NAME-compact.svg` phone cut.
- `python tools/regen.py --check` reruns every generator and check; CI's `drawings` job fails if a committed SVG differs from its script's output. Commit the SVGs with the script. Tool tests: `python -m pytest tools/tests`.

## Checking a change

The site is in **draft mode** (owner, November 9, 2026): almost every word is about to change, so check in proportion to the change. Never run the full suite for a copy or CSS change, and never run it twice for one change.

| Kind of change | Locally | On the PR (CI) |
|---|---|---|
| Copy: `src/content/`, `src/data/`, alt or screen-reader text | `npm run build` (about 5 s: schemas, placeholders, CSP hashes) | build, static, drawings, preview |
| CSS or markup | look at it in `npm run dev`, then `npm run quick` (types, lint, build: about 20 s) | same |
| A drawing | `python tools/regen.py --check` | the `drawings` job |
| Scripts (`src/scripts/`, `scripts/`), Worker, headers, checks, workflows, dependencies, config, layouts | `npm run quick`, then only the site checks for that area (`npm run verify -- -g "NAME"`); `npm run ci` when it touches many | the full browser checks run by themselves (the `scope` job in `site.yml` matches these paths) |
| Before launch or a release | `npm run ci`, `RELEASE=1 npm run verify -- --all`, `npm run release-audit`, the checklist in `docs/release.md` | add the `full-checks` label to the PR (also runs the screenshot comparison) |

- Any PR can get the full browser checks with the `full-checks` label; "Run workflow" on `site.yml` runs everything.
- Checks that expect today's exact copy run only with `RELEASE=1`.
- The deploy smoke-checks the new version and rolls back on failure (`scripts/deploy.mjs`), so no separate smoke run after a merge.

## Branches, pushes, previews

- One branch per session. Commit locally as often as you like. Each push to a PR runs CI and each merge to `main` deploys, so batch: one PR per batch of work, pushed when a phone preview is wanted.
- A phone preview ("preview", "link for my phone"): push the branch and open a PR. CI comments `https://ALIAS-uplink-site.johnoreilly.workers.dev`; `node scripts/preview-alias.mjs BRANCH` prints the alias (rules: README, "Deploys"). Find it with `gh pr view N --comments`. Previews never touch the live Worker.
- `main` takes changes only through a PR with a passing `build`. A PR that changes only root `*.md` or `docs/` passes `build` in seconds (the `scope` job skips everything else) and merges like any other; its merge deploys nothing.
- The owner directs and doesn't run commands: agents run every build, check and merge. Tell the owner what changed and what needs their eyes or decision, in plain words, not commands to run.
- Cloudflare work: the `cloudflare:*` skills cover Workers and Wrangler.
- The agent may merge its own PRs once CI is green; visual changes wait for the owner to look at the preview.

## Writing

- Copy: short, plain sentences.
- Look: no "AI slop" tells.
- Docs (README, `docs/`): Google developer-docs style: second person, present tense, sentence-case task headings, numbered steps, `UPPER_SNAKE` placeholders, `> **Note:**` callouts, dates as "November 5, 2026".
- A decision's reasoning goes in a dated file in `docs/history/`; to-do lines go in `notes.md`, one line each.
- When a command, tool, rule or file changes, update the doc that owns it (the list above) in the same PR.
