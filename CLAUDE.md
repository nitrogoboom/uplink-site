# Uplink Technology site

Static mockup site for a made-up IT company. Astro, plain CSS and JS, served by Cloudflare as static files. Live at https://jodesign.ca (also still at https://uplink-site.johnoreilly.workers.dev).

**Draft mode.** Only Home, the setup and the code base matter (owner, November 10, 2026). Other pages are placeholders: don't change their content or look unless asked. Shared code may change; they must still build.

## How to work

- No tests until launch: see "Tests" below.
- No worker agents for code, and no review passes, reports or history files. An agent may read web docs (official docs, an audit's sources) and hand back what they say.
- Commit messages: one short line, what and why. Code comments say why the code is as it is: no dates, review IDs or the owner's words (git holds the history). Tidy old comments in a file you're already changing.
- Read only the doc the job needs (table below).
- `notes.md` is the to-do list: add or remove a line. Never reword the owner's lines without asking.
- Docs can lag the code; the code wins. Fix a doc only when what it states is now wrong. Keep docs short.

| The job | Read |
|---|---|
| Next task | `notes.md` |
| Setup, commands, layout | `README.md`, `src/README.md` |
| Styling | `docs/design.md` |
| HTML, CSS or a page script | the `modern-web-guidance` skill: search it before writing |
| An Astro question | the Astro Docs server (`.mcp.json`) |
| A drawing | the `drawing` skill |
| Hosting, CI, deploys | `docs/ops.md` |
| Security | `docs/security.md` |
| A site check the owner asks for (browsers, phones, accessibility, print, speed) | the `check` skill |
| Launch or release | the `release` skill |

`.claude/rules/` load by themselves. Rules everywhere:

- **Astro does the build.** `npm run build` is `astro build` and nothing runs after it. Before adding a script that changes `dist/`, look for the Astro or Cloudflare setting that does the job (`docs/ops.md` lists who does what).
- No words typed into markup or scripts: they live in `src/content/en/`.
- Pages take their language from `Astro.currentLocale`; links go through `to()` (`src/lib/i18n.ts`).
- Never hand-edit an output SVG.

**Browser Support:** Chrome, Edge, Firefox and Safari (Mac and iPhone) from the last year, plus Firefox ESR (`README.md`, "Browsers"). A newer feature is fine when a browser without it still shows a working page. No polyfills.

## Tests

None until launch (owner, November 12, 2026). The site changes daily, so a test written today pins yesterday's page and blocks tomorrow's change.

- **A check is a look**, done when the owner asks: the `check` skill. Findings go in your reply, never into a test file, spec or CI job.
- **Set in stone.** Write a test only for something on the list below. Only the owner adds to it, in their own words ("set X in stone"). One small test per item, for that item alone.
- **A test never blocks work.** When a change the owner asked for breaks one, change or delete the test in the same commit and say so in your report. The change wins.
- **Something looks worth guarding?** Add a line to `notes.md` for the owner to decide.
- **At launch** the owner decides what gets a test (`docs/release.md`, "Before launch").

Set in stone: nothing yet.

What runs today: lint, types and the build on this machine (`npm run quick`; the build stops on a missing copy key or content that doesn't match its schema), and the drawing tools' own checks (the `drawing` skill). Nothing is checked after a deploy. The site's own scripts check nothing live: they trust what we build.

## Check, ship

**Work locally. Push nothing until the owner says "push" or "push to main" (or "ship", "deploy", "merge").** No push, pull request or deploy for a change by default (owner, November 12, 2026).

Each change:

1. Make it and check it as the table says.
2. Show the owner: the `astro` dev server (`.claude/launch.json`) in the app's browser pane, at localhost. A cloud session can't reach that pane: it shows screenshots it took of the dev server instead (phone, tablet, desktop; both themes when colour matters), and the live link once shipped.
3. Commit on one local branch (`claude/…`). Later changes go on the same branch until it ships. A `notes.md` line goes in the same commit.

| Change | Check locally |
|---|---|
| Docs only | nothing |
| Copy, CSS, markup | look in `npm run dev`, then `npm run build` |
| Scripts, config, deps | `npm run quick`; a header or the CSP: also `npm run serve` and look at the console |
| A drawing | `python tools/regen.py --check` |
| Launch or release | the `release` skill |

When the owner says push, it goes straight to `main`, with no pull request (owner, November 12, 2026). About a minute:

1. `npm run build` passes here first.
2. `git checkout main`, `git pull --ff-only` (Dependabot merges on GitHub), `git merge --ff-only` the local branch, `git push origin main`, then `git push -u origin` the local branch too (the cloud workspace checks after every reply that the branch is on GitHub). GitHub prints "Bypassed rule violations": expected, the owner's account may.
3. Wait for the deploy run on `main`, in the background (`gh run watch`), then check the live site serves it: `curl -s` the live address's `/version.txt`, which must print the pushed commit (7 characters, as `git log --oneline` shows it). A change a visitor can see gets a look in the browser too; never dig through the hashed `/_astro/` files. Only then say "deployed". A push of only docs (root `*.md`, `docs/`, `.claude/`, any `README.md`) runs nothing on purpose: no deploy to wait for. If a push that changes the site starts no run: `gh workflow run site.yml --ref main`.
4. Nothing checks the site after a deploy. If it is broken: `npx wrangler rollback`, then fix `main` (`docs/ops.md`, "Deploys").

A pull request, with its preview at `https://pr-N-uplink-site.johnoreilly.workers.dev`, only when the owner says "open a PR".

The owner directs and doesn't run commands. Report in a few plain lines: what changed, where to look (localhost, or the link once shipped), anything they must do.

## Agent skills

### Issue tracker

GitHub Issues on nitrogoboom/uplink-site (public), for the specs and tickets the engineering skills write; notes.md stays the owner's to-do list. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default labels, named as the skills name them. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the root, made when first needed. See `docs/agents/domain.md`.
