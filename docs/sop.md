# SOP: how we build, check and release the site

The standard way of working on the Uplink site: what it's built with, the standards it meets, and the checklist that proves it before a release. Written 3 Nov 2026. When a tool, rule or standard changes, change this file in the same PR.

Two kinds of checking:

- **Every build (automatic, CI):** fast checks that run on every push. Nobody does anything by hand. See "What CI already proves".
- **Every release (this checklist):** a longer machine audit (every page, three browsers, keyboard, screen reader, motion, forms, HTML), then the few things only a person can judge. About 25 minutes, recorded. A release is the first production launch and any later change to layout, navigation, forms or a new page. A copy fix or a style tweak doesn't need it; CI is enough. Do it at least every three months anyway.

## 1. Stack

| Part | What we use | Where it's set |
| --- | --- | --- |
| Framework | Astro 7, static output. Plain CSS and JS, no UI framework | `astro.config.mjs`, `package.json` |
| Runtime | Node 24 | `.node-version` (CI reads it) |
| Content | Typed JSON (services, projects, FAQ, team, footer) | `src/content/`, `src/data/`, `src/content.config.ts` |
| Styles | One token file; spacing scale enforced by lint | `src/styles/tokens.css`, `docs/spacing.md` |
| Drawings | Python generators write every SVG | `tools/gen_*.py`, Python 3.12, `requirements.txt` |
| Hosting | Cloudflare Workers: static assets, plus one small Worker for `/api/*` (error and CSP reports today) | `wrangler.jsonc`, `worker/index.js`, `public/_headers` |
| CI/CD | GitHub Actions: check, tests, lint, build, browser check, link check, deploy; on a PR also a preview and a screenshot comparison. Actions pinned to commits. | `.github/workflows/site.yml` |
| Tests | Node's test runner, no extra packages: the build's after-steps and the Worker | `scripts/test/` (`npm test`) |
| Dependencies | Dependabot, weekly: npm, pip and GitHub Actions | `.github/dependabot.yml` |
| Code checks | TypeScript (`astro check`), ESLint, Stylelint, Prettier (JSON/YAML) | `eslint.config.js`, `.stylelintrc.json` |
| Browser check | Playwright (Python) + axe-core, Chromium | `tools/verify_footer.py` |
| Release audit | Playwright in Chromium, Firefox and WebKit; Guidepup Virtual Screen Reader; the W3C Nu validator | `tools/audit.py` (`npm run release-audit`) |

## 2. How a change gets to live

1. Branch off `main`. One topic per branch.
2. Work locally: `npm run dev`. Before pushing: `npm run ci` (does everything CI does).
3. Push and open a PR. CI runs and posts a preview link (`https://<branch>-uplink-site.johnoreilly.workers.dev`). Check it on a phone. Read the run's summary: "Screenshot changes" lists every page that looks different from live. Each change on it should be one you meant (the pictures are in the run's `visual-diff` artifact).
4. Merge when CI is green. The push to `main` deploys to live.
5. If live breaks: `npx wrangler rollback` (steps in README, "Hosting"), then fix on a branch.
6. If the change counts as a release (see the top), run the checklist in section 5 and save the record. Then tag it: `git tag -a vYYYY.MM.DD <merge commit> -m "…"`, `git push origin vYYYY.MM.DD`, and `gh release create vYYYY.MM.DD` with a few lines and a link to the record (as `v2026.11.03` does).

## 3. Standards we meet

| Area | Standard | Why |
| --- | --- | --- |
| Accessibility | **WCAG 2.0 Level AA**, our own standard: Ontario requires it only from 50 staff, and we're under 50 (decided 3 Nov 2026). We aim for WCAG 2.2 AA where it costs little. A public statement with a feedback route and other formats on request. | Ontario AODA / IASR O. Reg. 191/11, for organisations with 50+ staff in Ontario. `/accessibility` (`src/data/accessibility.md`); `knowledge/Ontario Website Accessibility Rules.md` |
| Privacy | PIPEDA (Canada); CASL for the newsletter. The site's privacy page: what it collects, who handles it and where, how long, your rights | `/privacy` (`src/data/privacy.md`); sources in `docs/privacy-and-accessibility-2026-11-03.md` |
| Security | HTTPS only, HSTS, strict CSP (no inline script or style) that reports its blocks, Trusted Types, nosniff, Referrer-Policy, Permissions-Policy. A security contact. Secrets listed, never in the repo. | `public/_headers` (the build adds the hashes); `/.well-known/security.txt`, `SECURITY.md`; `docs/secrets.md` |
| Browsers | Current Chrome, Edge, Firefox, Safari, plus iOS Safari and Android Chrome. Older browsers get a working page without the extras | Support list still to write (`notes.md`) |
| Performance | PageSpeed 100 on Home, phone and desktop | `python tools/pagespeed.py <address>` |
| Language | English (Canada), `lang="en-CA"`. A French page gets `lang="fr-CA"` | `src/layouts/Base.astro` |

## 4. What CI already proves (don't repeat it by hand)

On every push, the build fails if any of these break:

- Types and Astro errors (`astro check`); lint on JS, TS, Astro, CSS and JSON/YAML.
- The build's after-steps and the Worker pass their tests (`npm test`): the CSP hashes, the refusal of `style=""`, the Markdown copies, the SVGO settings, the report endpoint.
- No `style=""` attributes, and every inline script and style is hashed into the CSP (`scripts/headers.mjs`).
- No script errors and no CSP blocks on any page.
- No sideways scroll on any page at phone size, and on Home at four sizes. The header fits at every width from 320px to 3440px, at normal and 200% text.
- Hero, tower and footer work; the footer is one screen tall at 1440×900.
- Every link, picture, script and preload on every page answers, and every `#section` link finds its id (`tools/check_links.py`).
- **axe-core finds nothing serious or critical on Home** (phone and desktop). Other pages get axe only with `--all`, which the release audit runs.

On a pull request it also compares every page with the live site at three sizes (`tools/visual_diff.py`). That one reports and never fails: a person says whether each change was meant.

axe catches only a third to a half of WCAG problems, and only in Chromium. The release audit and the hand checks below cover the rest.

## 5. Release checklist

Do it on the PR preview or the live site. Tick each box, and write a short note where it asks for proof. Copy this section to `docs/releases/YYYY-MM-DD.md` and fill it in there; that file is the proof. About 25 minutes: 10 for the machine, 15 for you.

**Release:** date `____` · commit `____` · checked by `____`

### A. Build and hosting (5 min)

- [ ] CI green on the commit that's live. Proof: link to the Actions run.
- [ ] `npx wrangler deployments list` shows that commit's version live.
- [ ] Response headers present (`curl -sI <address>`: HSTS, CSP, X-Content-Type-Options). Proof: paste the header lines.
- [ ] 404 page shows for a made-up address, with a 404 status.
- [ ] Workers logs since the last release (Cloudflare > Workers > uplink-site > Logs, search `report`): each script error or CSP block from a real visitor is fixed or has a line in `notes.md`.

### B. The release audit (machine, about 10 min)

`npm run build`, `npm run serve`, then in a second window `npm run release-audit` (`tools/audit.py`), `python tools/verify_footer.py out/ --all` and `python tools/verify_text.py`. Paste `out/audit/report.md` and the last line of the other two into the record. Every box here is ticked by a clean run; a failure says the page and what.

- [ ] **Browsers:** every page in Chromium, Firefox and WebKit (Safari's engine) at 1440, and on an emulated iPhone and Android phone: no script errors, no CSP blocks, no sideways scroll. Screenshots in `out/audit/shots/`.
- [ ] **Keyboard (2.1.1, 2.1.2, 2.4.3, 2.4.7):** Tab through every page: focus visible on every stop, never off screen, never stuck. Each dialog opens from the keyboard, Esc closes it, focus returns. The stops per page are in `out/audit/keyboard/`.
- [ ] **Screen reader (1.1.1, 1.3.1, 2.4.4, 4.1.2):** every page read top to bottom with a virtual screen reader. Fails on a link whose parts run together with no pause, or one link name going to two pages. Transcripts in `out/audit/reader/`.
- [ ] **axe on every page (1.4.3 contrast and the rest):** `verify_footer.py --all`, nothing serious or critical.
- [ ] **200% text (1.4.4):** `verify_text.py`, all clear.
- [ ] **Motion (2.2.2, 2.3.1):** with Reduce Motion on, nothing moves; with it off, the pause button stops every loop, and nothing loops faster than 3 times a second.
- [ ] **Forms (3.3.1, 3.3.2, 3.3.3):** each form sent empty and with a bad email: every problem field has its message in words, tied to the field, and focus goes to the first one.
- [ ] **HTML (4.1.1):** Home through the W3C validator, no HTML errors (every page with `-- --html-all`, when a release changes the other pages' markup). Its CSS checker doesn't know some current CSS yet; the report lists those once and doesn't count them.

Go easy on W3C: it's a free service that limits requests per address, and a day of repeated full runs got "429 Too Many Requests" on 3 Nov 2026. While fixing things, rerun only the parts you need, without html: `npm run release-audit -- --only browsers,keyboard,reader,motion,forms`. Run html once, at the end.

### C. By hand (15 min)

What a machine can't judge. Where it's built, it's in brackets.

**Real phones** (from the PR preview link)
- [ ] iPhone, Safari: Home, one service page, Contact. The bottom bar, the notch area, nothing hidden under the address bar, the grow tower scrolls smoothly.
- [ ] Android, Chrome: the same three pages.

**Listen** (NVDA on Windows, free, or VoiceOver on iPhone; 5 minutes)
- [ ] Read one page you changed top to bottom, then jump by heading (H key in NVDA). It should sound like the transcript in `out/audit/reader/`: no missing pauses, no "dot", nothing read twice.

**Look and judge**
- [ ] Each link's words, read alone in the transcript, say where it goes (2.4.4).
- [ ] Headings and labels say what follows (2.4.6); each page's tab title is clear (2.4.2) [`src/lib/site.ts`].
- [ ] Meaning never by colour alone: errors, the active tab and the selected item also change shape, icon or words (1.4.1).
- [ ] Any new colour pair: check it with the axe DevTools or WAVE extension (1.4.3) [colours from `tokens.css`].
- [ ] No words inside pictures that aren't also real text (1.4.5).
- [ ] Nothing changes on its own when a field gets focus or a value is picked (3.2.1, 3.2.2).
- [ ] Header, bottom bar and footer are the same on every page (3.2.3, 3.2.4); the menu and the footer both reach every page (2.4.5).
- [ ] New video or audio has captions and a text version (1.2.1–1.2.3); text in another language is marked with `lang` (3.1.2); a form that commits money or a contract can be reviewed before it's sent (3.3.4). None of these on the site today.

Proof for B and C: one line per failure (page, what, WCAG number). An empty list means it passed.

### D. Content and legal (5 min)

- [ ] No link goes to `/soon` that shouldn't (before launch, see `notes.md`, "Before going live")
- [ ] A terms page exists, if the release goes to the real domain or turns forms on
- [ ] `noindex` is still on until launch, and off after it (`public/_headers`)
- [ ] Privacy and accessibility pages still true: anything this release changed about what the site collects, who handles it, or its aids and limits is on those pages (`src/data/privacy.md`, `accessibility.md`)

### E. Sign-off

- [ ] Everything above ticked, or each failure has a line in `notes.md` with a date to fix it.
- Result: `pass` / `pass with notes` / `fail` · signed `____`
- [ ] Tagged and released (section 2, step 6).

## 6. Watching the live site

- **Errors and CSP blocks:** real visitors' browsers report them to `/api/report` (`worker/index.js`); they appear in the Workers logs, kept 3 days on the free plan. Look after each deploy and at each release.
- **Speed and visits:** Cloudflare Web Analytics (no cookies). Its token still points at the old address (`notes.md`).
- **Up or down:** an outside uptime check is still to set up (`notes.md`).
- **Dependencies:** Dependabot's weekly PRs. CI checks each one like any other change; merge when green.

## 7. Keeping this file honest

- When CI starts checking something new (for example Firefox and WebKit, see `notes.md`), add it to section 4 and drop it from section 5.
- If a checklist item fails twice in a row, it's a sign it should be automated. Add a line to `notes.md`.
- The Ontario summary in `knowledge/` was written from memory of the standard, not checked line by line. Have it checked against the W3C text once before the first launch.
