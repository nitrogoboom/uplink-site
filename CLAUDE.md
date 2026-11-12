# Uplink Technology site

Static mockup site for a made-up IT company. Astro, plain CSS and JS, a Cloudflare Worker. Live at https://uplink-site.johnoreilly.workers.dev.

**Draft mode.** Only Home, the setup and the code base matter (owner, November 10, 2026). Other pages are placeholders: don't change their content or look unless asked. Shared code may change; they must still build.

## Work fast

- Do the job yourself. No worker agents, review passes, reports or history files.
- Read only the doc the job needs (table below). Never read `docs/history/`.
- `notes.md` is the to-do list: add or remove a line. Never reword the owner's lines without asking.
- Docs can lag the code; the code wins. Fix a doc only when what it states is now wrong. Keep docs short.

| The job | Read |
|---|---|
| Next task | `notes.md` |
| Setup, commands, layout | `README.md`, `src/README.md` |
| Styling | `docs/design.md` |
| A drawing | the `drawing` skill |
| CI, deploys, the Worker | `docs/ops.md` |
| Security | `docs/security.md` |
| Launch or release | the `release` skill |

`.claude/rules/` load by themselves. Two rules everywhere: no words typed into markup or scripts (they live in `src/content/` and `src/data/`), and never hand-edit an output SVG.

## Check, ship

**Work locally. Push nothing until the owner says "push" or "push to main" (or "ship", "deploy", "merge").** No push, pull request or deploy for a change by default (owner, November 12, 2026).

Each change:

1. Make it and check it as the table says.
2. Show the owner: the `astro` dev server (`.claude/launch.json`) in the app's browser pane, at localhost.
3. Commit on one local branch (`claude/…`). Later changes go on the same branch until it ships. A `notes.md` line goes in the same commit.

| Change | Check locally | CI when it ships |
|---|---|---|
| Docs only | nothing | `build` passes in seconds |
| Copy, CSS, markup | look in `npm run dev`, then `npm run build` | build, preview |
| Scripts, Worker, config, deps | `npm run quick` | build, preview |
| A drawing | `python tools/regen.py --check` | build, preview |
| Launch or release | the `release` skill | add the `full-checks` label: static and browser checks |

When the owner says push:

1. One pull request for everything since the last ship.
2. Push, open it, then wait for CI once, in the background (`gh run watch`). The preview is `https://pr-N-uplink-site.johnoreilly.workers.dev`.
3. Merge when `build` is green; the owner has already looked locally.
4. Wait for the deploy on `main`, then check the live site shows the change. Only then say "deployed". If the deploy run never starts, run it again: `gh workflow run site.yml --ref main`.
5. The deploy smoke-checks and rolls back by itself; run no smoke check after a merge.

The owner directs and doesn't run commands. Report in a few plain lines: what changed, where to look (localhost, or the link once shipped), anything they must do.
