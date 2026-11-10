# Fable 5.2 recommendations: framework, workflow, and hosting

November 9, 2026. A review of the whole repository: Astro, the scripts and CSS, the drawings, the checks, GitHub, and Cloudflare. The question was how to take this draft and make it leaner to edit with AI agents and push to Cloudflare.

This is a review only. Nothing in the site, the code, or the settings changed. The sample copy and its numbers were not reviewed.

## How this review was done

- Read the build, Worker, deploy, CI, and layout code directly.
- Ran a fresh build and measured what it ships.
- Read the live site's response headers and timing.
- Ran seven side reviews: five on Sonnet (Astro, Cloudflare, and GitHub research on the web; the drawings; the checks and docs) and two on Opus (the client scripts; the full-screen layout CSS).
- Checked two Cloudflare claims against Cloudflare's own docs before relying on them.

No browser checks were run and no page was looked at. Every layout suggestion below needs your eyes on a preview before it's kept.

## Status

*Last updated: November 9, 2026.* What was done with each recommendation. What's left is in [`notes.md`](../../notes.md), "Fable 5.2 review: what's left". The owner's decisions are in [`decisions-2026-11-09.md`](decisions-2026-11-09.md).

### The ten recommendations

| # | Recommendation | Status |
|---|---|---|
| 1 | Move out of OneDrive, clear the strays | **Done.** Merged branches, stale work folders and 135 old Cloudflare previews removed. The OneDrive move doesn't apply: the owner works on a home PC. |
| 2 | One rule, one place: cut the docs | **Done.** `CLAUDE.md` 90 to 59 lines, rules in `.claude/rules/`, `README.md` 7,100 to 4,400 words with `docs/ops.md` (#131, #133, #134). |
| 3 | Faster previews with `wrangler preview` | **Done** (#135, and #132 starts the preview as soon as the build is done). It removed about 300 lines; it did not make the preview job faster (about 1 minute, as before). The command is an open beta. |
| 4 | Park the checks that pin today's layout | **Open.** Only the wheel-grid lines and the two preview scripts' tests went. |
| 5 | One full-screen section model | **Part done.** Wheel grid removed (#138); only a page's first section is one screen on every size (#139). The shared blocks and the hero's layouts are open. |
| 6 | Move drawing maths out of the page scripts | **Open.** Needs the Python generators to write the numbers. Old-browser fallbacks and two unused exports went (#138). |
| 7 | One way to colour drawings | **Part done.** The colour CSS now ships on Home only (#137). Role classes in `gen_office.py` and `gen_grow.py` are open. |
| 8 | Make the build one step | **Open.** |
| 9 | Decide French | **Decided:** `/fr/` addresses. The move of copy files and of the words still in code is open. |
| 10 | Tighten the Cloudflare and GitHub keys | **Open.** For the owner, before launch. |

### Section by section

**The agent editing loop.** All seven done: 1, 4 and 5 (#131), 2 (#133), 3 and 6 (#134), 7 (#132).

**Astro.**

- Drawing colour CSS only where it's used: **done** (#137). Every page but Home is about 9 KB smaller.
- One-step build; Markdown copies from the data: **open.**
- Generate the copy schema from the YAML: **not planned.** The review says do it only if copy structure keeps changing.

**Page scripts.**

- Old-browser fallbacks and two unused exports: **done** (#138).
- The `?` shortcut, the phone bar hiding on scroll (D4), the wheel grid: **done** (#138). Page script went from 2,184 to 2,043 lines.
- Phone hero captions as HTML: **done** (#141), kept by the owner after three rounds on a phone. The captions keep a line, drawn as the desktop labels draw theirs; `home.js` went from 683 to 588 lines.
- Grow's ring as a CSS animation; Grow's dome orbits as CSS dashes: **open.** Each changes an animation, so each needs the owner's eyes.
- Link paths and camera boxes written by the generators; the footer map camera as generated CSS: **open.** Drawing-generator work.
- Grow's `placeTags` on every frame: **looked at, left.** The camera move changes the drawing's view every frame, so one layout pass a frame happens anyway; caching or a throttle saves nothing.
- `soon.js` as one page per name: **left.** It would move about ten placeholder addresses that go when the real pages exist.
- Newsletter validation into the shared form code; toast icons from a `<template>`: **left.** No change a visitor would notice.

**Full-screen layouts.**

- 1, remove the wheel grid: **done** (#138). A Home fold is exactly one screen at 1440×900 (836px, was 900).
- 2, a fold is a minimum and may grow: **decided.** The two `notes.md` items it closes are gone. The extra height thresholds in the CSS are still there.
- 3, `fold-always` only on a page's first section: **done** (#139). On a tablet, Contact's Support went from 1,116px to 632px.
- 4 to 7 (one "fold with art" block, card grids that fit themselves, Home services as one block, hero layouts six to three): **open.** Each can change the look.

**Drawings.**

- 4, plain pins for the Python tools: **done** (#137). `requirements.txt` went from 736 lines to 23; Dependabot's pip entry is gone.
- 1, 3 and 5: **open.** 2 (stop committing the light copies): **not wanted** for now.

**Checks and tests.** **Open**, including the small core of about eight tests for every pull request.

**GitHub.**

- Delete merged branches automatically: **already on.**
- Dependabot ignores `@types/node` majors: **already done** (#130). The pip entry: **gone** (#137). Whether the Actions group's wildcard skips the cooldown: **not checked.**
- Split the `cloudflare` environment; the smaller items: **open.**

**Cloudflare.** 1, Worker Previews: **done** (#135). 2 to 5: **open**, for launch.

**File structure and cleanup.** Branches, work folders, and `package-lock.json` marked as generated (#137): **done.** Empty folders and `editing-room/`: **done** earlier (#130). `out/` and the older files in `docs/history/`: **left**; `.ignore` keeps history out of searches instead (#131).

## The short version

The site itself is small, fast, and well built. Astro 7 as a static site on Cloudflare Workers is the right choice and the versions are current. There is nothing to upgrade or swap at the framework level.

The weight is in what surrounds the site. For about 11,600 lines of site source there are about 14,000 lines of checks, tests, build scripts, and drawing tools, and about 58,700 words of docs. Much of it guards today's exact layout and copy, and the site is a draft where both are about to change. Every agent session pays to read those rules, and every change pays to keep several copies of them in step.

So the main recommendation is to shrink the scaffolding, not the site.

| # | Recommendation | Why | What it removes | Risk |
|---|---|---|---|---|
| 1 | Move the working folder out of OneDrive and clear the strays | 900 MB of generated files sync to a company cloud; file locks and long paths break tools | 423 MB stale worktree, 60 merged branches, 4 empty folders | None |
| 2 | One rule, one place: cut the docs by about half | The same rule lives in up to four files and must be kept in step by hand | About 150 lines of `CLAUDE.md` and `README.md`; per-task reading drops by more than half | Low |
| 3 | Faster previews with Cloudflare's own preview command | Your wait for a phone link drops from about 2 to 3 minutes to about 1 | About 280 lines and one scheduled workflow | Low |
| 4 | Park the checks that pin today's layout | They will all break when the real content lands | 1,200 to 1,400 lines | Low |
| 5 | One full-screen section model, no scroll script | Three height systems today; most open layout items come from the model | About 400 CSS lines, 50 script lines | Needs your eyes |
| 6 | Move drawing maths out of the page scripts | Scripts should hold state, not geometry | About 320 script lines at low risk; up to 400 more by design choice | Low to medium |
| 7 | One way to colour drawings for the light theme | Two mechanisms today; 11 KB of generated CSS ships on every page | 377 generated CSS lines; optionally 26 files | Medium |
| 8 | Make the build one step | Three scripts chained after `astro build`, plus a guard against skipping them | 25 lines, one rule, one failure mode | Low |
| 9 | Decide French now, as web addresses | It changes where every word lives | Nothing yet; avoids a rewrite later | Decision |
| 10 | Tighten the Cloudflare and GitHub keys before launch | One token can do everything and any pull request can reach it | Nothing; closes a gap | Low |

## What I measured

| Thing | Number |
|---|---|
| Tracked files | 337 |
| Commits | 594 in 15 days (October 26 to November 9, 2026) |
| Pull requests | 129 (113 merged, 13 closed, 3 open) |
| Site source | 2,282 lines of Astro, 7,120 of CSS, 2,184 of page script |
| Checks and tests | 4,354 lines of browser checks, 1,653 of script tests |
| Build and deploy scripts | 2,611 lines |
| Drawing tools | 5,091 lines of Python, 263 of tests |
| Docs | About 58,700 words; 36,700 of them in `docs/history/` |
| Comments in code | 31% of the CSS, 40% of the page scripts, 36% of the workflows |
| Build | 5 seconds, 22 pages, 4.3 MB in 123 files |
| A typical page | 110 to 117 KB of HTML, about 19 KB compressed; 71 to 74 KB of it is CSS |
| Home | 193 KB, about 29 KB compressed |
| All page script | 32 KB, about 12 KB compressed |
| Drawings | 58 files, 1,456 KB after shrinking; the biggest is about 12 KB compressed |
| Light-theme drawing copies | 26 files, 718 KB, 39% of the drawing bytes in git |
| CI, copy or CSS change | 1.75 to 2.8 minutes to a preview link |
| CI, change that runs browser checks | 4 to 5 minutes |
| Merge to live | 2 to 3.3 minutes, with two outliers at 9.5 and 21 minutes |
| Local folder | `node_modules` 471 MB, `.claude/worktrees` 423 MB (19,870 files), `out` 61 MB |

The site is not slow. No recommendation here is about page speed. They're about how much an agent has to read, keep in step, and not break.

## About the 9,000-line file

It's `package-lock.json`: 9,336 lines. It isn't framework code and nobody writes it. npm generates it. It lists the exact version and fingerprint of all 637 packages the tools pull in, so every build, on your machine and in CI, installs the same thing. Leave it in.

It can't shrink in any way that matters. Astro alone needs 142 of those packages, Stylelint 73, the Astro type checker 63, ESLint 42, and Wrangler 28. Dropping the small tools would remove about 20.

What to do instead:

- Mark it as generated in `.gitattributes` (`package-lock.json linguist-generated`), so GitHub folds it away in pull requests.
- `requirements.txt` is the same kind of file for the Python drawing tools: 736 lines, 700 of them fingerprints, for 16 packages that only run on your machine. A plain list of pinned versions would do. See "Drawings".

## The agent editing loop

### What happens today

1. You tell an agent what to change.
2. The agent reads `CLAUDE.md`, then the docs it points to, then edits a data file.
3. It builds locally (5 seconds), pushes, and opens a pull request.
4. CI runs four jobs in a row, then uploads a preview and comments the link: about 2 to 3 minutes.
5. You look on your phone. The agent merges. The live site updates in another 2 to 3 minutes, after a smoke check that rolls back by itself on failure.

The shape is right. Content as data files with strict schemas, a preview per pull request, and a deploy that undoes itself are exactly what make it safe for an agent to merge its own work. Keep all of that.

### What costs time and tokens

- **Reading.** `CLAUDE.md` is 1,751 words and fine. But it sends the agent on to `README.md` (7,121 words), `src/README.md` (3,747), and `docs/design.md` (2,995). A CSS change means about 5,500 words of rules before the first edit.
- **Rules in several places.** The checking policy is written in `CLAUDE.md`, `README.md`, the header of `site.yml`, and `docs/release.md`. The drawings rule is in four files too. `CLAUDE.md` then asks every change to update each doc that mentions it, plus the owner guide. That's the tax: one code change, up to four doc edits.
- **Docs already drift.** `requirements.in` still says CI installs it; CI stopped on November 9, 2026. The signed-off layout plan says remove the phone bar's hide-on-scroll (decision D4); it's still in `core.js`.
- **History in the search path.** `docs/history/` is 63% of all doc words. Agents that search the tree hit old rules there first.
- **Waiting.** The preview waits for lint and type checks to finish, though it never touches the live site.

### What to change

1. **Shrink `CLAUDE.md` to about 60 lines.** Keep: what the site is, where things are, the checking table, the branch rules, "the agent runs everything". Move the CSS, drawing, markup, and content rules into path-scoped files in `.claude/rules/` (`css.md`, `drawings.md`, `content.md`, `scripts.md`). Claude Code loads each one only when the agent touches matching files. A copy edit then stops carrying the drawing rules.
2. **Split `README.md`.** Keep setup and the command table. Move the Worker, deploys, rollback, and headers to one `docs/ops.md`. Where the code already carries a comment that explains itself, delete the README copy and keep the comment. Comments beside the code are the docs agents read most reliably.
3. **Turn prose rules into lint.** Each of these is a rule today that only a careful reader enforces: text size never in `px` or `vw`; no left-side accent border; breakpoints in `em`; line height as a number. Each is one Stylelint line. Once lint enforces a rule, delete its sentence from the docs.
4. **Keep history out of search.** Add a `.ignore` file listing `docs/history/` and `.claude/worktrees/`. The records stay; agents stop tripping on them.
5. **Commit a `.claude/settings.json`.** Allow the check commands (`npm run build`, `npm run quick`, `npm run verify`, the `git` and `gh` commands the loop uses) so desktop and cloud sessions stop asking. Today only an untracked local file exists, so cloud sessions start from nothing.
6. **Use two skills for the two long, rare jobs:** a release and a drawing change. Their steps then load only when needed, and `docs/release.md` stops being required reading.
7. **Let the preview start as soon as the build is done.** In `site.yml` the `preview` job waits for the `build` gate, which waits for lint, types, and tests. Make it wait for `dist` only. The gate still guards the merge. This alone should take close to a minute off.

## Astro

**Verdict: keep Astro 7, static output, no adapter.** Cloudflare has owned the Astro team since January 2026 and treats Astro as a first-class Workers framework. A static site needs no Cloudflare adapter, and this one rightly has none.

### Change

- **Make the build one step.** `npm run build` is `astro build`, then three scripts (`svgo.mjs`, `markdown.mjs`, `headers.mjs`). Because a plain `astro build` would ship a broken security header, `check-dist.mjs` exists to refuse it, with its own rule and test. Put the three steps in a small Astro integration (the `astro:build:done` hook) in `astro.config.mjs`. Then `astro build` can't be half-run and the guard goes.
- **Write the Markdown copies from the data, not from the HTML.** `scripts/markdown.mjs` turns each built page back into Markdown with seven rules keyed to CSS class names (`.chip`, `.label`, `.card-link`, `.feat-d`). Rename a class and the copy silently changes. The content is already data, and Home's copy is already hand-written. A short `.md.ts` page per page type, reading the same files, removes the `turndown` package, the class coupling, the `data-md-skip` attribute, and a release-only test.
- **Ship the drawing colour CSS only where it's used.** `src/styles/theme-drawings.css` (11 KB) is in `global.css`, so all 22 pages carry it. Only Home uses it. Import it from the Hero and Grow components until the drawings change makes it unnecessary (see "Drawings").
- **Adding a word takes three edits:** the YAML, the hand-written schema in `src/lib/copy-schema.ts` (274 lines that mirror the YAML key by key), and the component. Generate the schema from the YAML and it's two. This is a small gain; do it only if copy structure keeps changing.

### Decide: French

`CLAUDE.md` says EN/FR goes in Settings beside the theme. I'd push back. A language is a web address, not a display setting.

| Option | What it means |
|---|---|
| **A. `/fr/…` addresses (my pick)** | Astro's built-in i18n routing. Search engines index both languages, a French link can be shared, it works without script. Copy files become `src/data/copy/en/` and `fr/`. |
| B. A Settings switch | One address, swapped by script. Search engines see English only. Every word ships twice on every page. |

Decide before the real copy is written, because it changes where every word lives. Two things to fix either way: page titles and descriptions sit in `src/lib/site.ts`, and the business description sits in `src/pages/index.astro`. Both are words in code, against the repo's own rule.

### Leave alone

- **Astro's built-in CSP.** It's stable since Astro 6, but by default it writes a `<meta>` tag, which can't carry `frame-ancestors` or report addresses. Your header version is stronger. Keep `headers.mjs`.
- **Astro's Fonts API.** Your hand-tuned fallback fonts already stop text from jumping. No gain.
- **`<ClientRouter />`.** Native page transitions plus the Speculation Rules header are lighter, and Astro's own docs say the router is becoming unnecessary.
- **`@astrojs/sitemap`.** Your sitemap page is 19 lines.
- **Inline CSS.** Every page carries all its CSS, so nothing is cached between pages and each page template adds a fingerprint to the security header (17 now, 1,365 of the 2,000 characters Cloudflare allows). It costs about 13 KB compressed per page view. That's small, and the link prefetch already hides it. Leave it, shrink the CSS first, and measure again on the real domain at launch.

## Page scripts

Every page loads about 4.7 KB of compressed script; Home adds 6.6 KB. That's light. The issue isn't size. It's that the scripts do geometry and animation by hand: three hand-written animation loops, numbers copied from the CSS, and layout read on every frame.

### Low-risk cuts (about 320 lines)

| Change | Lines |
|---|---|
| Remove fallbacks for browsers that no longer exist (no IntersectionObserver, no ResizeObserver) and two unused exports | 25 |
| Grow's ring: use the CSS animation the progress bar already uses; drop the 300 ms count-up | 30 |
| `soon.js`: write one page per name at build instead of reading the `#` in the address | 28 |
| Have `gen_office.py` and `gen_grow.py` write the link paths and camera boxes into the drawings, so the page stops measuring them | 55 |
| Footer map camera: generated CSS with `:has()` instead of a script loop | 45 |
| Grow's dome orbits: CSS dashes instead of rewriting 14 paths every frame | 65 |
| Fold the newsletter's validation into the shared form code; build toast icons from a `<template>` | 30 |

The principle: the Python generators know every coordinate. Let them write it into the drawing. The page script then only flips states, and CSS animates.

One real fragility to fix regardless: Grow's `placeTags` reads layout on every frame of a 1.4-second camera move and on every resize, with no throttle.

### Bigger cuts that are your call

| Option | Lines | My pick |
|---|---|---|
| Phone hero captions as HTML instead of SVG text with measured leader lines | About 300 | Try it on a preview; it's the single biggest block |
| The `?` keyboard shortcut and its on/off switch | About 45, plus copy and two lines in the legal pages | Remove; the gear already opens Settings |
| The phone bar hiding on scroll | About 40 | Remove; you already decided this (D4) |
| The wheel grid | About 30 | Remove; see "Full-screen layouts" |

### Must stay as script

Dialogs (Firefox ESR 140 lacks the script-free way), the saved theme and motion choices, form error messages, the pause button (WCAG 2.2.2), copy to clipboard, error reports, and the services row's dots and arrows (the CSS carousel features are Chromium only).

## Full-screen layouts

### How it works today

A "fold" is a section at least one screen tall. There are three systems for that height:

1. The hero has its own height and six layouts.
2. Home's folds sit on a grid that rounds each one up to a multiple of 100px, with a script that corrects any overflow after the page lays out. That's the "wheel grid": the idea is that mouse-wheel stops land on section edges.
3. Every other page uses a plain minimum height.

The CSS has 140 media queries, 10 width thresholds, and 8 height thresholds. 121 of the 842 declarations inside queries only reset something to `none`, `auto`, or `0`. Several numbers are measured from today's words, such as `100svh − 44.5rem` in `services.css`.

### Why the open layout items keep coming

Most of the "Layout and look" list in `notes.md` comes from the model, not from separate bugs:

- **Text is in `rem` and can't shrink** (correct, for zoom). So a short window can't fit a full section, and each fix is another height threshold.
- **`fold-always` means two things:** "this is the page's first screen" and "this is one screen at every size". That's why Contact's Support and the Services FAQ misbehave.
- **The wheel grid only lines up** for Chrome or Edge on Windows at 100% zoom. It adds up to 99px of empty band under each section, and its script changes heights after layout, which is the one real layout-shift risk on the site.

### What to change

1. **Remove the wheel grid.** One fold model for every page. About 35 CSS lines and 30 script lines go.
2. **Make one policy: a fold is a minimum, and it may grow.** Then 1280×720 running 12 to 99px over is expected, not a bug. Delete the extra height thresholds (about 30 lines). This closes two `notes.md` items by decision.
3. **Use `fold-always` only on each page's first section.** Fixes the Contact and Services item.
4. **One "fold with art" block.** The pattern "section fills the screen, the drawing takes what's left" is written five times. Write it once (about 40 lines saved).
5. **Card grids that fit themselves:** `repeat(auto-fit, minmax(min(100%, Nrem), 1fr))`. No breakpoints, correct at any zoom. About 60 lines and 15 query blocks.
6. **Home services on desktop:** four variants in 125 lines become one block where the drawing flexes above a floor (about 50 lines).
7. **Hero: six layouts down to three** (stacked, two columns, ultrawide). About 60 to 80 lines. This is the riskiest for the look and needs your screenshots.

Total: about 400 hand-written CSS lines.

### Leave alone

Text in `rem`, breakpoints in `em`, minimum heights, and heading fit: these are what make 200% and 400% zoom work. No page scroll snap; it was tried twice and Page Down still jumps. `footer.css` is 1,096 lines because 277 of them style the campus map; a real cut would need the plain link footer you already turned down.

## Drawings

**Verdict: keep the Python generators.** They work, they're tested, and rewriting 5,000 lines buys nothing. The separate phone and card cuts are right too: they aren't crops, their labels are laid out again.

### Change

1. **One way to colour drawings.** There are two today. Drawings shown as pictures come as two files, dark and light, with one hidden. Drawings placed inside the page (the hero, Grow) are recoloured by 377 generated CSS rules that match on colour codes (`[fill='#0e1a27' i]`). The footer map already does it the better way: the generator writes role classes and the theme swaps the roles. Have `gen_office.py` and `gen_grow.py` do the same. `theme-drawings.css` then disappears.
2. **Optional: stop committing the light copies.** A light file differs from its dark twin only in colour codes: the drawings review masked the codes in three pairs and the files matched exactly. The build could write them from one colour map. That takes 26 files and 718 KB out of git and out of every drawing diff. It adds a build step, so do it only if the diffs bother you.
3. **Shrink what's committed.** `scripts/svgo.mjs` shrinks drawings after every build, and `src/lib/site.ts` then has to fingerprint the shrunk file, not the committed one. Run the shrink when a drawing is generated and commit the result. Then what's in git is what ships, and one build step and one cross-file dependency go.
4. **Plain pins for the Python tools.** `requirements.txt` drops from 736 lines to about 16. The tools run only on your machine now, so drop the pip entry from Dependabot too.
5. **Delete `tools/site-lock/`** if the password lock isn't coming back. Fold `gen_campus.py`'s private copies of `box()` and friends into the shared library (50 to 80 lines).

### Leave alone

The hero is about 12 KB on the wire. Rewriting it with shared symbols would save 1 to 3 KB and break its animation hooks.

## Checks and tests

There are about 6,000 lines of checks for about 11,600 lines of site. In draft mode you already skip most of them on purpose. The next step is to stop carrying the ones the redesign will break.

| Group | Action | Lines |
|---|---|---|
| Tests that pin today's layout: the 1440 index test, wheel grid, news cards at 1100 to 1240, header fit, footer map label, queue ring | Delete; write again after the real content lands | About 450 |
| Regression pins a linter or the accessibility scan now also catches | Delete | About 500 |
| Tests of CI plumbing: `preview-alias`, `clean-previews`, `git-dates`, SVGO internals | Delete | About 330 |
| Zoom, forced colours, print, font swap, the release audit, PageSpeed | Keep, release only | 0 |
| Worker, deploy and rollback, headers, placeholders | Keep, always | 0 |

One gap to close while you're there: a pure CSS or markup pull request gets no browser check at all today. Keep a small core of about eight tests that runs on every pull request in under a minute: no script errors, no blocked content, no sideways scroll at 390 and 1280, the accessibility scan on both themes, the no-script path, and dialogs closing. That's fewer lines than today and more protection where the draft changes most.

## GitHub

**Verdict: the workflow is careful and mostly right.** Actions are pinned to commits, permissions are minimal, the workflows are linted, new dependencies are reviewed, and updates wait a week before they're proposed. Keep all of it. Don't move to Cloudflare's Workers Builds: your own deploy script does a health check and rollback that it doesn't.

### Change

1. **Split the `cloudflare` environment** (already in `notes.md`, review H5). Today one environment holds one token, and the preview job on any pull request from a branch in this repository can use it. Make `production` usable from `main` only and give `preview` its own token.
2. **Turn on "Automatically delete head branches".** There are 69 remote branches; 60 are already merged.
3. **Dependabot:** tell it to ignore major versions of `@types/node`. The types should match Node 24, and pull request #118 has sat open proposing 26. Drop the pip entry (see "Drawings"). One report says a wildcard group skips the cooldown; your Actions group uses one, so check that the week's wait still applies there.
4. **Small:** the Playwright cache steps are written twice in `site.yml`; and the build fetches the full git history only to date the sitemap. `src/lib/git-dates.mjs` and its test are 164 lines for that. The build date would do.

## Cloudflare

**Verdict: the hosting model is right.** Static files are free and unlimited on Workers. The Worker runs only for `/api/*`, the 404 page, and missing addresses. I checked the live site: compressed responses, correct headers, a real 404 status.

### Change

1. **Use Worker Previews.** Since September 22, 2026 Cloudflare has a purpose-built command, `wrangler preview`, and its docs say to switch to it from what this repo does (`wrangler versions upload --preview-alias`). The preview is named after the branch, the output is machine-readable, and Cloudflare deletes the oldest preview by itself at 100. That removes `scripts/preview-alias.mjs`, `scripts/clean-previews.mjs`, `clean-previews.yml`, their tests, and the log-scraping in `site.yml`: about 280 lines and a scheduled job. Your Wrangler version already supports it. Keep `preview_urls: true`; the production deploy still checks each version at its own address.
2. **Scope the token to this one Worker.** Possible since September 15, 2026: an account-owned token set to "Specified Workers" with the Editor role. This closes the `notes.md` item that asks for it.
3. **Plan for the paid Workers plan at launch.** Every 404 and every `/api` call counts against the free plan's 100,000 Worker requests a day, and bots scanning for WordPress pages produce 404s. If the count runs out, the contact form stops too. Cloudflare's email sending, which the parked forms work needs, requires the paid plan anyway.
4. **At launch, on your own domain:** turn on Always Use HTTPS, then delete the Worker's own redirect and its list of local addresses (about 20 lines). Check that Early Hints actually fire; they're a zone setting and I could not confirm they work on `workers.dev`.
5. **Decide the report endpoint.** About half the Worker (some 120 lines, plus its share of a 580-line test) collects browser error reports into logs that are kept three days and that nothing watches. Either add an alert at launch or delete it. An unread log is cost without benefit. My pick: keep it and add the alert, since it's built and tested.

### Leave alone

No CMS. Cloudflare's EmDash is database-backed, and your content is files an agent edits; that's the simpler system. Cloudflare's "Markdown for Agents" needs a Pro plan, so keep your own copies. The new `cf` command line is a beta; watch it, don't move.

## File structure and cleanup

All of this is safe to do today.

| Item | Action |
|---|---|
| The whole folder lives in a company OneDrive | Move it to a plain local folder such as `C:\dev\uplink-site`. GitHub is the backup. OneDrive is syncing over 900 MB of generated files, can lock files mid-install, and paths inside the worktree copies can pass Windows' 260-character limit. `.dev.vars`, Wrangler's local secrets file, is syncing too. |
| `.claude/worktrees/affectionate-keller-8d6d55` | A stale copy of the repo from November 3, 2026: 423 MB, 19,870 files. Remove it. |
| `site/`, `knowledge/`, `src/legacy/`, `tools/retired/` | Empty. Delete, and remove them from `tsconfig.json`, `eslint.config.js`, and `.prettierignore`. |
| `editing-room/` | 13 mock-up files, untracked, and also archived on a branch. Move it out of the repo or add it to `.gitignore`. |
| 25 local and 69 remote branches | Prune the merged ones. |
| `out/` | 61 MB of old screenshots. Safe to empty. |
| `docs/history/` | Keep `releases/` and the dated decisions. The superseded plans and reviews could leave the tree; git keeps them. |

## Suggested order

1. **Today, no site change:** the cleanup table above, and the Dependabot and branch settings.
2. **Workflow, one or two sessions:** the docs and rules split, lint for the prose rules, the committed settings file, the earlier preview, Worker Previews.
3. **Before the real content is written:** the French decision, the fold model, the parked checks and the small core, the script cuts, the drawing colour classes, the one-step build.
4. **At launch:** the scoped token and split environments, the paid plan, the domain settings, the report-endpoint decision, measuring inline CSS again, and bringing the release checks back.

## Decisions for you

| Decision | Options | My pick |
|---|---|---|
| Wheel grid on Home | Remove, or keep | Remove |
| French | `/fr/` addresses, or a Settings switch | `/fr/` addresses |
| Phone hero captions | HTML captions without leader lines, or keep the drawn ones | Try HTML on a preview |
| The `?` shortcut | Remove, or keep | Remove |
| Error reports | Keep and add an alert at launch, or delete now | Keep and alert |
| Light drawing copies | Build them, or keep committing them | Keep committing for now |

## What I could not verify

- How any layout or drawing change looks. Nothing was run in a browser.
- Whether Early Hints work on `workers.dev`.
- Whether Astro's built-in CSP can carry the Trusted Types rules. It doesn't matter if you keep `headers.mjs`.
- Whether the hidden theme copy of a drawing is never downloaded in every browser. The code is written so it shouldn't be.
- Exact browser version cut-offs for the script-free alternatives. Each needs a check against Firefox ESR 140 and Safari before it replaces a script.
- The report that a Dependabot wildcard group skips the cooldown. It's from a third-party write-up.
- Run times for the proposed small check core. They're estimates.

## Sources

Checked directly against Cloudflare's docs:

- Worker Previews: https://developers.cloudflare.com/workers/previews/ and https://developers.cloudflare.com/workers/previews/compare-workflows/
- Per-Worker tokens: https://developers.cloudflare.com/changelog/post/2026-09-15-granular-worker-permissions/ and https://developers.cloudflare.com/workers/authorization/workers/

Reported by the research reviews:

- Astro 6 and 7: https://astro.build/blog/astro-6/, https://astro.build/blog/astro-7/, https://docs.astro.build/en/guides/upgrade-to/v7/
- Astro CSP, fonts, i18n, view transitions: https://docs.astro.build/en/reference/configuration-reference/#securitycsp, https://docs.astro.build/en/guides/fonts/, https://docs.astro.build/en/guides/internationalization/, https://docs.astro.build/en/guides/view-transitions/
- Workers static assets, limits, and billing: https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/, https://developers.cloudflare.com/workers/platform/limits/, https://developers.cloudflare.com/workers/static-assets/headers/
- Workers Builds: https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/
- Rollbacks: https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/
- Email sending: https://developers.cloudflare.com/email-service/platform/pricing/
- Markdown for Agents: https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/
- Claude Code rules, settings, and cloud sessions: https://code.claude.com/docs/en/memory, https://code.claude.com/docs/en/best-practices, https://code.claude.com/docs/en/claude-code-on-the-web
- GitHub required checks and rulesets: https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks, https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets
- Dependabot cooldown: https://github.blog/changelog/2025-07-01-dependabot-supports-configuration-of-a-minimum-package-age/
- npm install scripts: https://github.blog/changelog/2026-06-09-upcoming-breaking-changes-for-npm-v12/
