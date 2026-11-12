# Uplink Technology site

Static mockup site for a made-up IT company. Astro, plain CSS and JS, a Cloudflare Worker. Live at https://uplink-site.johnoreilly.workers.dev.

**Draft mode.** Only Home, the setup and the code base matter (owner, November 10, 2026). Other pages are placeholders: don't change their content or look unless asked. Shared code may change; they must still build.

## Work fast

- A check is a look you do when the owner asks, reported in your reply. The repo holds no tests, and gets none: no test files, specs or CI checks (owner, November 12, 2026). The deploy's smoke check is the one script.
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
| A site check the owner asks for (browsers, phones, accessibility, print, speed) | the `check` skill |
| Launch or release | the `release` skill |

`.claude/rules/` load by themselves. Two rules everywhere: no words typed into markup or scripts (they live in `src/content/` and `src/data/`), and never hand-edit an output SVG.

## Check, ship

**Work locally. Push nothing until the owner says "push" or "push to main" (or "ship", "deploy", "merge").** No push, pull request or deploy for a change by default (owner, November 12, 2026).

Each change:

1. Make it and check it as the table says.
2. Show the owner: the `astro` dev server (`.claude/launch.json`) in the app's browser pane, at localhost.
3. Commit on one local branch (`claude/…`). Later changes go on the same branch until it ships. A `notes.md` line goes in the same commit.

| Change | Check locally |
|---|---|
| Docs only | nothing |
| Copy, CSS, markup | look in `npm run dev`, then `npm run build` |
| Scripts, Worker, config, deps | `npm run quick` |
| A drawing | `python tools/regen.py --check` |
| Launch or release | the `release` skill |

When the owner says push, it goes straight to `main`, with no pull request (owner, November 12, 2026). About a minute:

1. `npm run build` passes here first.
2. `git checkout main`, `git merge --ff-only` the local branch, `git push origin main`. GitHub prints "Bypassed rule violations": expected, the owner's account may.
3. Wait for the deploy run on `main`, in the background (`gh run watch`), then check the live site shows the change. Only then say "deployed". If the run never starts: `gh workflow run site.yml --ref main`.
4. The deploy smoke-checks the new version and rolls back by itself; run no smoke check after it.

A pull request, with its preview at `https://pr-N-uplink-site.johnoreilly.workers.dev`, only when the owner says "open a PR".

The owner directs and doesn't run commands. Report in a few plain lines: what changed, where to look (localhost, or the link once shipped), anything they must do.
