# Uplink Technology site

Static mockup site (placeholder content) for a made-up IT company. Astro 7, plain CSS and JS, served by Cloudflare Workers. Live at https://uplink-site.johnoreilly.workers.dev.

## Goal

The Overwatch 2–inspired design, on Home. Secure. Tuned for Cloudflare. A clean GitHub repo. Easy for AI agents in Claude Code to edit. Great page speed and web scores. AI friendly.

**Only Home, the setup and the code base matter for now** (owner, November 10, 2026). Don't change another page's content or look unless the owner asks. Shared code may change; the other pages must still build and pass.

## Spend little

Tokens are the budget. The owner wants hours of work for a few percent of it.

- Read this file, then only the one doc the job needs (the table below). Don't read a doc for background.
- Never read `docs/history/` unless the owner asks. It's a record, not instructions.
- Do the work yourself, in this session. No worker agents and no second review pass unless the owner asks for one.
- Prove a change once, with the check its row names below. Compare `dist/` before and after only when you change the build itself.
- Don't write reports, status sections or history files. A decision is one line in the PR's description.
- Update a doc only when a command, path or rule it states is now wrong. `notes.md` is the to-do list: add a line, or remove a done one, and nothing more. Never cut or reword the owner's lines without asking.
- Docs can lag the code. When they disagree, the code and its tests are right.

## Read only what the job needs

| The job | Read |
|---|---|
| What to do next | `notes.md` |
| Setup, a command, the repo layout | `README.md` |
| Where a page, component, style or script lives | `src/README.md` |
| Styling: colours, spacing, corners, layout | `docs/design.md`, `.claude/rules/css.md` |
| Words, content or data: `src/content/`, `src/data/` | `.claude/rules/content.md` |
| Markup, page scripts, headers, the Worker | `.claude/rules/markup-scripts.md` |
| A drawing, `tools/`, or a colour token | the `drawing` skill, `.claude/rules/drawings.md` |
| A drawing tool's flags, the drawing rules | `docs/drawing-tools.md` |
| A site check's flags, the smoke check | `docs/site-checks.md` |
| The Worker, CI, deploys, previews, rollback, headers | `docs/ops.md` |
| Security controls, secrets (names and places only) | `docs/security.md` |
| A release or launch day | the `release` skill, `docs/release.md` |

Claude Code loads a file in `.claude/rules/` by itself when you open a file it covers. `docs/owner-guide.html` is frozen: don't update it.

Two rules hold everywhere: type no words into markup or scripts (they live in `src/content/` and `src/data/`), and never edit an output SVG by hand.

## Checking a change

The site is in **draft mode**: check in proportion to the change. Never run the full suite for a copy or CSS change, and never run it twice for one change.

| Kind of change | Locally | On the PR (CI) |
|---|---|---|
| Docs only: root `*.md`, `docs/`, `.claude/`, any `README.md` | nothing | `build` passes in seconds; the merge deploys nothing |
| Copy: `src/content/`, `src/data/`, alt or screen-reader text | `npm run build` (about 5 s) | build, static, core, preview |
| CSS or markup | look at it in `npm run dev`, then `npm run quick` (about 20 s) | same |
| A drawing | `python tools/regen.py --check` and `python -m pytest tools/tests` | same (no drawing check in CI) |
| Scripts, Worker, headers, checks, workflows, dependencies, config, layouts | `npm run quick`, then only the site check for that area: `npm run verify -- -- -g "NAME"` | the full browser checks run by themselves |
| Before launch or a release | the `release` skill | add the `full-checks` label |

- `core` is nine browser tests (`npm run verify:core`, tagged `@core` in `checks/site.spec.mjs`). CI runs it on a PR that doesn't get the full checks, which include the same tests. It takes about 4 minutes there.
- Tests that pinned today's layout are parked in `checks/parked/`. Nothing runs them.
- The deploy smoke-checks the new version and rolls back on failure, so run no smoke check after a merge.

## Branches, pushes, previews

- One branch per session. Each push to a PR runs CI and each merge to `main` deploys, so batch: one PR per batch of work.
- `main` takes changes only through a PR with a passing `build`.
- A phone preview: push the branch and open a PR. CI comments `https://pr-N-uplink-site.johnoreilly.workers.dev`, N being the PR's number.
- The owner directs and doesn't run commands. Tell them what changed and what needs their eyes, in plain words.
- Merge your own PR once CI is green. A visual change waits for the owner to look at the preview.
- See a merge through in the same turn: wait for the checks, confirm the merge on GitHub, wait for the deploy on `main`, and see the live site answer. Say "merged" or "deployed" only after you've seen it.
- Cloudflare work: the `cloudflare:*` skills cover Workers and Wrangler.

## Writing

Docs use Google developer-docs style: second person, present tense, sentence-case headings, numbered steps, dates as "November 5, 2026". Keep each doc to its one job, and short.
