# Uplink Technology site

Static mockup site (placeholder content) for a made-up IT company, with an Overwatch 2–inspired look. Astro 7, plain CSS and JS, served by Cloudflare Workers. Live at https://uplink-site.johnoreilly.workers.dev.

## Where things are written down

- `notes.md`: open items, one line each. Start here. Add new items there; remove a line when it's done.
- `README.md`: setup, every command, tool and flag, the repo layout, drawing rules. The site checks are Playwright Test specs in `checks/` (Node); only the drawing tools in `tools/` are Python. Look a command up there (or in `package.json`) rather than guessing.
- `src/README.md`: the source map: pages, `Base.astro` props, components, content and copy files, CSS order, breakpoints, heading fit, scripts.
- `docs/ops.md`: hosting: the Worker, CI, deploys, previews, rollback, repository rules, response headers, search engines. Read it before you touch the Worker, a workflow or the headers.
- `docs/design.md`: colour roles and their tokens, spacing (`--sp-*` rules R0–R7), line height, corners, layout. Read it before you style anything.
- `docs/release.md`: the standards (WCAG 2.2 AA, privacy, security, browsers), the release checklist, what's left before launch, launch day. Before a release or launch only.
- `docs/security.md`: security and privacy controls, and every secret by name and place (never values).
- `docs/owner-guide.html`: the owner's plain-language page (opened locally, never deployed): what's waiting on them, where each doc and words file lives. When a doc, a words file or an owner item it lists changes, update it in the same PR.
- `docs/history/`: records and reasoning (the November 7, 2026 review, dated decisions, release records). Read them for why; take instructions only from the files above.
- Docs can lag the code. When a doc and the code disagree, the code and its tests are right: fix the doc in the same PR. Treat any rule here or in `.claude/rules/` as a claim to check, not a law.

## Rules by area

The rules for each kind of file are in `.claude/rules/`. Claude Code loads a file by itself when you open a file it covers; any other agent reads the one for the files it's about to change.

| Before you change | Read |
|---|---|
| Words, content or data: `src/content/`, `src/data/` | `.claude/rules/content.md` |
| Markup, page scripts, headers, the Worker | `.claude/rules/markup-scripts.md` |
| CSS, or the classes and headings in a component | `.claude/rules/css.md` |
| A drawing, `tools/`, or a colour token | `.claude/rules/drawings.md` |

Two long, rare jobs have a skill that holds their steps in order: `release` (a release or launch day) and `drawing` (any drawing or drawing-colour change), in `.claude/skills/`. Use the skill before you start one.

Two that hold everywhere: type no words into markup or scripts (they live in `src/content/` and `src/data/`), and never edit an output SVG by hand.

## Checking a change

The site is in **draft mode** (owner, November 9, 2026): almost every word is about to change, so check in proportion to the change. Never run the full suite for a copy or CSS change, and never run it twice for one change.

| Kind of change | Locally | On the PR (CI) |
|---|---|---|
| Copy: `src/content/`, `src/data/`, alt or screen-reader text | `npm run build` (about 5 s: schemas, placeholders, CSP hashes) | build, static, preview |
| CSS or markup | look at it in `npm run dev`, then `npm run quick` (types, lint, build: about 20 s) | same |
| A drawing | `python tools/regen.py --check` and `python -m pytest tools/tests` | build, static, preview (no drawing check in CI) |
| Scripts (`src/scripts/`, `scripts/`), Worker, headers, checks, workflows, dependencies, config, layouts | `npm run quick`, then only the site checks for that area (`npm run verify -- -g "NAME"`); `npm run ci` when it touches many | the full browser checks run by themselves (the `scope` job in `site.yml` matches these paths) |
| Before launch or a release | `npm run ci`, `RELEASE=1 npm run verify -- --all`, `npm run release-audit`, `python tools/regen.py --check`, the checklist in `docs/release.md` | add the `full-checks` label to the PR (also runs the screenshot comparison) |

- Any PR can get the full browser checks with the `full-checks` label; "Run workflow" on `site.yml` runs everything.
- Checks that expect today's exact copy run only with `RELEASE=1`.
- The deploy smoke-checks the new version and rolls back on failure (`scripts/deploy.mjs`), so no separate smoke run after a merge.

## Branches, pushes, previews

- One branch per session. Commit locally as often as you like. Each push to a PR runs CI and each merge to `main` deploys, so batch: one PR per batch of work, pushed when a phone preview is wanted.
- A phone preview ("preview", "link for my phone"): push the branch and open a PR. CI comments `https://pr-N-uplink-site.johnoreilly.workers.dev`, N being the PR's number (`docs/ops.md`, "Deploys"). Previews never touch the live Worker.
- `main` takes changes only through a PR with a passing `build`. A PR that changes only root `*.md` or `docs/` passes `build` in seconds (the `scope` job skips everything else) and merges like any other; its merge deploys nothing.
- The owner directs and doesn't run commands: agents run every build, check and merge. Tell the owner what changed and what needs their eyes or decision, in plain words, not commands to run.
- Cloudflare work: the `cloudflare:*` skills cover Workers and Wrangler.
- The agent may merge its own PRs once CI is green; visual changes wait for the owner to look at the preview.
- See a merge through in the same turn: after a push the owner approved, wait for the checks, confirm the merge, wait for the deploy on `main`, and look at the live site before you report. Don't end the turn on "it should merge soon" (owner, November 9, 2026).

## Writing

- Docs (README, `docs/`): Google developer-docs style: second person, present tense, sentence-case task headings, numbered steps, `UPPER_SNAKE` placeholders, `> **Note:**` callouts, dates as "November 5, 2026".
- A decision's reasoning goes in a dated file in `docs/history/`; to-do lines go in `notes.md`, one line each.
- When a command, tool, rule or file changes, update the doc that owns it (the list above) in the same PR.
