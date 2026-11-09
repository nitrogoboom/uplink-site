# Docs review, bug fixes, and checks on Node

*November 5–6, 2026*

This record covers one working session: a review of every doc against the code, the bugs that review turned up, and the follow-on work it led to. It records what changed and why. For how things work now, read the docs it links to, not this page.

## Summary

| Area | What changed | Where |
| --- | --- | --- |
| Docs | Every doc fact-checked against the code. Developer docs rewritten in Google developer-docs style; CLAUDE.md rewritten as pointers to the doc that owns each fact. | `bc0dfa8`, `25658e7` |
| Public pages | Privacy and accessibility pages rewritten in plainer words, with every claim checked against the code and no claim beyond what the site does today. | `25658e7`, `2b6fe3e`, `76e4c4c` |
| Ontario rules | `knowledge/Ontario Website Accessibility Rules.md` checked against WCAG 2.0, moved into `docs/sop.md` ("Ontario's website rule"), and deleted. | `25658e7` |
| Bugs | Grow pause, Grow dome rings, hero screen-reader labels, `painter.py` passing on nothing, and others (below). | `bc0dfa8` |
| Footer on phones | No strip of page background above the tab bar; Follow cards show the network name only. | PR #74 |
| Grow on desktop | The six steps as a clickable list in the left column (option C), in place of the dots. | PR #75 |
| Checks | Every browser and live-site check moved from Python to Node (Playwright Test, `checks/`). CI needs no Python. | PR #77 |

## The docs review

Five read-only reviewers checked the docs and code comments in parallel, each against one area of the code. They found about 100 facts that had drifted. The biggest:

- **The Worker.** Docs said it answers `/api/*` only. In fact `run_worker_first` is `true`, so it sees every request: it redirects `http://` to `https://`, answers `/api/report`, and gives `/404` its status.
- **The public security page claimed more than the site does.** It said the site sends "every recommended" OWASP header, that CI runs axe on every page, and that the site "conforms" to WCAG AA while the by-hand review was still open. Each claim was either made true (see below) or scaled down to what's true.
- **The launch runbook's step for retiring `workers.dev`** offered two options that both failed. It now gives two that work; the choice is left to launch day.
- **`docs/spacing.md`** listed 15 spacing problems that were already fixed. The list was removed; it's in git history.

About 60 code comments were also corrected. Comments that described intended behaviour the code didn't have (the pause button) were kept, and the code was fixed instead.

An independent session then reviewed the result without seeing this one. It graded the docs A−, found four more small mismatches (all fixed in `2b6fe3e` and `76e4c4c`), and confirmed the fixes on a second pass.

## Bugs found and fixed

| Bug | Fix |
| --- | --- |
| The site-wide pause button didn't stop Grow's script-driven motion (WCAG 2.2.2). | `grow.js` follows `held` from `core.js`. |
| The Grow dome's turning rings never ran on the live site: SVGO's `removeEmptyContainers` deleted the empty group `grow.js` fills. | Turned off in `scripts/svgo-config.mjs` (+127 bytes on Home). |
| The hero drawing exposed 15 pieces of label text to screen readers. | `gen_office.py` hides the inlined cuts' parts with `aria-hidden`. |
| `painter.py` passed when its rules resolved no box; the voip check had silently checked nothing. | It fails when it checks no box. `rules_voip.py` has the right origin. |
| Two OWASP headers missing. | `Cross-Origin-Resource-Policy` and `X-Permitted-Cross-Domain-Policies` added (`og.png` exempt). |
| CI ran axe on Home only. | Every page gets axe at phone size. |
| `npm run deploy` skipped every check and uploaded whatever was in `dist/`. | It runs `npm run ci` first. |
| Copy: the accessibility description, `security.txt` languages, the privacy page's bot check, the agents page sending agents to forms that don't send. | Each says what's true today. |

Dead code that nothing used was removed. Every drawing and every Markdown copy came out byte for byte the same, except the three hero cuts (one wrapper each).

## Decisions

- **Python stays for drawings only.** Node is required anyway (Astro, Wrangler, SVGO, linters). The checks ran on every change, so they moved to Node. The drawing generators run only when someone redraws a picture and their SVGs are committed, so porting about 4,000 lines of geometry and font code would have been a rewrite for no visible gain.
- **Retiring `workers.dev` is decided on launch day**, not now. Both ways are in `docs/launch-runbook.md`.
- **The Overwatch look-and-feel check is closed.** The owner compared the site side by side with Overwatch 2's screens: same idea, none of its signature shapes, art, colours or font.
- **Content stays sample text** until there's a real client.

## Left open

Every open item is in [`notes.md`](../notes.md). The ones this session found:

- The footer fix (#74) uses an off-scale 88 px bottom padding on phones; the spacing check flags it.
- Home has a W3C error: `pathLength` on the Grow play button's ring.
- The release audit's newer WebKit reports a CSP style block on every page.
- `verify:styles` sometimes misreads one margin at 3440 px (the Python version did too).
- PR #76 (clean up old previews) waits for the owner's merge.
