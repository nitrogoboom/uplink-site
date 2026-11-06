# How we build, check, and release the site

*Last updated: November 5, 2026*

This page describes how the Uplink site is built, the standards it meets, and the checks that prove it before a release. It's for anyone who changes the site. When a tool, rule, or standard changes, update this page in the same pull request.

The site is checked in two ways:

- **On every pull request and every merge to `main` (automatic).** CI runs fast checks and nobody does anything by hand. See [What CI proves](#what-ci-proves).
- **On every release (by hand, with this checklist).** A longer machine audit runs, covering every page, three browsers, the keyboard, a screen reader, motion, forms, and the HTML. Then a person checks what only a person can judge. It takes about 25 minutes, and you keep a record.

A *release* is the first production launch, and any later change to layout, navigation, or forms, or a new page. A copy fix or a style tweak isn't a release; CI is enough. Run the release checklist at least every three months anyway.

## Stack

| Part | What we use | Where it's set |
| --- | --- | --- |
| Framework | Astro 7, static output. Plain CSS and JavaScript, no UI framework. | `astro.config.mjs`, `package.json` |
| Runtime | Node.js 24 | `.node-version` (CI reads it) |
| Content | Typed JSON and Markdown: services, projects, FAQ, team, footer, Grow | `src/content/`, `src/data/`, `src/content.config.ts` |
| Styles | One token file. Lint enforces the spacing scale. | `src/styles/tokens.css`, `docs/spacing.md` |
| Drawings | Python generators write every SVG. | `tools/gen_*.py`, Python 3.12, `requirements.txt` |
| Hosting | Cloudflare Workers: static files, plus one small Worker. Today the Worker sees every request: it redirects `http://` to `https://`, answers `/api/report` (error and CSP reports), and gives `/404` its status. | `wrangler.jsonc`, `worker/index.js`, `public/_headers` |
| CI/CD | GitHub Actions: check, tests, lint, build, browser check, link check, deploy. On a pull request, also a preview and a screenshot comparison. Actions are pinned to commits. | `.github/workflows/site.yml` |
| Tests | Node's built-in test runner, no extra packages: the build's after-steps and the Worker | `scripts/test/` (`npm test`) |
| Dependencies | Dependabot, weekly: npm, pip, and GitHub Actions | `.github/dependabot.yml` |
| Code checks | TypeScript (`astro check`), ESLint, Stylelint, Prettier (JSON and YAML only) | `eslint.config.js`, `.stylelintrc.json` |
| Browser check | Playwright (Python) and axe-core, in Chromium | `tools/verify_footer.py` |
| Release audit | Playwright in Chromium, Firefox, and WebKit; Guidepup Virtual Screen Reader; the W3C Nu HTML Checker | `tools/audit.py` (`npm run release-audit`) |

## How a change reaches the live site

1. Create a branch from `main`. Keep one topic per branch.
2. Work locally with `npm run dev`.
3. Before you push, run `npm run ci`. It runs the same checks as CI, except the screenshot comparison, the preview, and the deploy.
4. Push the branch and open a pull request. CI runs and posts a preview address, `https://BRANCH-uplink-site.johnoreilly.workers.dev`.
5. Check the preview on a phone.
6. Read the run's summary. "Screenshot changes" lists every page that looks different from the live site. Make sure you meant each change. The pictures are in the run's `visual-diff` artifact.
7. When CI passes, merge. The merge to `main` deploys to the live site.
8. If the live site breaks, roll back with `npx wrangler rollback`, then fix the problem on a branch. The steps are in the [README](../README.md#roll-back-a-bad-deploy).
9. If the change is a release, run the [release checklist](#release-checklist) and save the record.
10. Tag the release, replacing `YYYY.MM.DD` with the date and `COMMIT` with the merge commit:

    ```bash
    git tag -a vYYYY.MM.DD COMMIT -m "SUMMARY"
    git push origin vYYYY.MM.DD
    gh release create vYYYY.MM.DD
    ```

    Give the release a few lines and a link to the record, as `v2026.11.03` does.

> **Note:** A change that touches only root `*.md` files, `docs/`, or `knowledge/` runs no CI and deploys nothing. A branch push without a pull request also runs nothing.

## Standards we meet

| Area | Standard | Where it's shown |
| --- | --- | --- |
| Accessibility | **WCAG 2.0 Level AA.** This is our own choice: Ontario requires it only from 50 staff, and we're under 50 (decided November 3, 2026). We aim for WCAG 2.2 AA where it costs little. A public statement gives a feedback route. | Ontario AODA, IASR O. Reg. 191/11. `/accessibility` (`src/data/accessibility.md`); `knowledge/Ontario Website Accessibility Rules.md` |
| Privacy | PIPEDA (Canada), and CASL for the newsletter. The privacy page says what the site collects, who handles it and where, for how long, and your rights. | `/privacy` (`src/data/privacy.md`); sources in `docs/privacy-and-accessibility-2026-11-03.md` |
| Security | HTTPS only and HSTS. A strict CSP with no `'unsafe-inline'`: the few inline scripts and styles run only by hash, and the CSP reports what it blocks. Trusted Types, `nosniff`, Referrer-Policy, Permissions-Policy, and the cross-origin policies. A security contact. Secrets are listed and never in the repository. | `public/_headers` (the build adds the hashes); `/.well-known/security.txt`, `SECURITY.md`; `docs/secrets.md` |
| Browsers | Current Chrome, Edge, Firefox, and Safari, plus iOS Safari and Android Chrome. Older browsers get a working page without the extras. | The support list is still to write (`notes.md`). |
| Performance | PageSpeed 100 on Home, on phone and desktop. | `python tools/pagespeed.py ADDRESS` |
| Language | English (Canada), `lang="en-CA"`. A French page gets `lang="fr-CA"`. | `src/layouts/Base.astro` |

## What CI proves

Don't repeat these by hand. CI fails the build if any of them break:

- Types and Astro errors (`astro check`), and lint on JavaScript, TypeScript, Astro, CSS, JSON, and YAML.
- The tests for the build's after-steps and the Worker (`npm test`): the CSP hashes, the refusal of `style=""`, the Markdown copies, the SVGO settings, and the report endpoint.
- No `style=""` attributes, and every inline script and style is hashed into the CSP (`scripts/headers.mjs`).
- No script errors and no CSP blocks on any page.
- No sideways scroll on any page at phone size, or on Home at four sizes. The header fits at every width from 320 px to 3440 px, at normal and 200% text.
- The hero, the Grow section, and the footer work. The footer is one screen tall at 1440×900.
- Every link, picture, script, and preload on every page answers, and every `#section` link finds its id (`tools/check_links.py`).
- **axe-core finds nothing serious or critical on any page:** Home on phone and desktop, every other page on phone. The release audit adds every size (`--all`).

On a pull request, CI also compares every page with the live site at three sizes (`tools/visual_diff.py`). That check reports and never fails: a person decides whether each change was meant.

> **Important:** axe finds only a third to a half of WCAG problems, and CI runs it only in Chromium. The release audit and the checks by hand cover the rest.

## Release checklist

Run it on the pull request's preview or on the live site. Copy this section to `docs/releases/YYYY-MM-DD.md` and fill it in there; that file is the proof. Tick each box, and write a short note where it asks for proof. It takes about 25 minutes: 10 for the machine and 15 for you.

**Release:** date `____` · commit `____` · checked by `____`

### A. Build and hosting (5 minutes)

- [ ] CI passed on the commit that's live. Proof: a link to the Actions run.
- [ ] `npx wrangler deployments list` shows that commit's version live.
- [ ] The response headers are present. Run `curl -sI ADDRESS` and look for HSTS, the CSP, and `X-Content-Type-Options`. Proof: paste the header lines.
- [ ] `python tools/smoke.py ADDRESS` passes: every page, the headers, the redirects, and the 404 status.
- [ ] A made-up address shows the 404 page with a 404 status.
- [ ] Workers logs since the last release (Cloudflare > Workers > uplink-site > Logs, search for `report`): each script error or CSP block from a real visitor is fixed or has a line in `notes.md`.

### B. Release audit (machine, about 10 minutes)

1. Run `npm run build`, then `npm run serve`.
2. In a second terminal, run `npm run release-audit`, `python tools/verify_footer.py out/ --all`, and `python tools/verify_text.py`.
3. Paste `out/audit/report.md` and the last line of the other two into the record.

A clean run ticks every box here. A failure names the page and the problem.

- [ ] **Browsers:** every page in Chromium, Firefox, and WebKit (Safari's engine) at 1440 px, and on an emulated iPhone and Android phone. No script errors, no CSP blocks, no sideways scroll. Screenshots are in `out/audit/shots/`.
- [ ] **Keyboard (2.1.1, 2.1.2, 2.4.3, 2.4.7):** Tab through every page. Focus is visible on every stop, never off screen, and never stuck. Each dialog opens from the keyboard, Esc closes it, and focus returns. The stops per page are in `out/audit/keyboard/`.
- [ ] **Screen reader (1.1.1, 1.3.1, 2.4.4, 4.1.2):** every page read top to bottom with a virtual screen reader. It fails on a link whose parts run together with no pause, or one link name that goes to two pages. Transcripts are in `out/audit/reader/`.
- [ ] **axe on every page at every size (1.4.3 contrast and the rest):** `verify_footer.py --all` finds nothing serious or critical.
- [ ] **200% text (1.4.4):** `verify_text.py` is all clear.
- [ ] **Motion (2.2.2, 2.3.1):** with Reduce Motion on, nothing moves. With it off, the pause button stops every loop, and nothing flashes more than three times a second.
- [ ] **Forms (3.3.1, 3.3.2, 3.3.3):** each form sent empty and with a bad email address. Every problem field has its message in words, tied to the field, and focus goes to the first one.
- [ ] **HTML (4.1.1):** Home passes the W3C validator with no HTML errors. When a release changes other pages' markup, check every page with `npm run release-audit -- --html-all`. The validator's CSS checker doesn't know some current CSS yet. The report lists those once and doesn't count them.

> **Caution:** The W3C validator is a free service that limits requests per address. A day of repeated full runs got "429 Too Many Requests" on November 3, 2026. While you fix things, rerun only the parts you need, without `html`:
>
> ```bash
> npm run release-audit -- --only browsers,keyboard,reader,motion,forms
> ```
>
> Run `html` once, at the end.

### C. By hand (15 minutes)

These are what a machine can't judge. Where a check points at code, the place is in brackets.

**Real phones** (open the pull request's preview link)

- [ ] iPhone, Safari: Home, one service page, and Contact. Check the bottom bar and the notch area, that nothing hides under the address bar, that the Grow section plays, and that its card sits under the picture.
- [ ] Android, Chrome: the same three pages.

**Listen** (NVDA on Windows, which is free, or VoiceOver on iPhone; 5 minutes)

- [ ] Read one page you changed from top to bottom, then jump by heading (the H key in NVDA). It should sound like the transcript in `out/audit/reader/`: no missing pauses, no "dot", and nothing read twice.

**Look and judge**

- [ ] Each link's words, read alone in the transcript, say where it goes (2.4.4).
- [ ] Headings and labels say what follows (2.4.6). Each page's tab title is clear (2.4.2) [`src/lib/site.ts`].
- [ ] Colour is never the only way to show meaning. Errors, the active tab, and the selected item also change shape, icon, or words (1.4.1).
- [ ] Any new colour pair passes a check with the axe DevTools or WAVE extension (1.4.3) [colours from `tokens.css`].
- [ ] Pictures contain no words that aren't also real text (1.4.5).
- [ ] Nothing changes on its own when a field gets focus or a value is picked (3.2.1, 3.2.2).
- [ ] The header, bottom bar, and footer are the same on every page (3.2.3, 3.2.4). The menu and the footer both reach every page (2.4.5).
- [ ] New video or audio has captions and a text version (1.2.1–1.2.3). Text in another language is marked with `lang` (3.1.2). A form that commits money or a contract can be reviewed before it's sent (3.3.4). The site has none of these today.

Proof for B and C: one line per failure, with the page, the problem, and the WCAG number. An empty list means it passed.

### D. Content and legal (5 minutes)

- [ ] No link goes to `/soon` that shouldn't. Before launch, see "Before going live" in `notes.md`.
- [ ] A terms page exists, if the release goes to the real domain or turns forms on.
- [ ] `noindex` is still on until launch, and off after it (`public/_headers`).
- [ ] Before the first launch on the real domain: `docs/go-live-checklist.md` is done, or each open line has a date.
- [ ] The privacy and accessibility pages are still true. Anything this release changed about what the site collects, who handles it, or its aids and limits is on those pages (`src/data/privacy.md`, `src/data/accessibility.md`).

### E. Sign-off

- [ ] Everything above is ticked, or each failure has a line in `notes.md` with a date to fix it.
- Result: `pass` / `pass with notes` / `fail` · signed `____`
- [ ] Tagged and released (see [How a change reaches the live site](#how-a-change-reaches-the-live-site), step 10).

## Watch the live site

- **Errors and CSP blocks:** real visitors' browsers report them to `/api/report` (`worker/index.js`). They appear in the Workers logs, which the free plan keeps for 3 days. Look after each deploy and at each release.
- **Speed and visits:** Cloudflare Web Analytics, which sets no cookies. Its token still points at the old address (`notes.md`).
- **Up or down:** an outside uptime check is still to set up (`notes.md`).
- **Dependencies:** Dependabot opens pull requests weekly. CI checks each one like any other change. Merge when it passes.

## Keep this page accurate

- When CI starts checking something new, add it to [What CI proves](#what-ci-proves) and remove it from the release checklist.
- If a checklist item fails twice in a row, it probably should be automated. Add a line to `notes.md`.
- The Ontario summary in `knowledge/` was written from memory of the standard, not checked line by line. Have it checked against the W3C text once before the first launch.
