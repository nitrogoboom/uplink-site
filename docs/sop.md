# SOP: how we build, check and release the site

The standard way of working on the Uplink site: what it's built with, the standards it meets, and the checklist that proves it before a release. Written 3 Nov 2026. When a tool, rule or standard changes, change this file in the same PR.

Two kinds of checking:

- **Every build (automatic, CI):** fast checks that run on every push. Nobody does anything by hand. See "What CI already proves".
- **Every release (by hand, this checklist):** the things a machine can't judge, done once per release and recorded. About 45 minutes. A release is the first production launch and any later change to layout, navigation, forms or a new page. A copy fix or a style tweak doesn't need it; CI is enough. Do it at least every three months anyway.

## 1. Stack

| Part | What we use | Where it's set |
| --- | --- | --- |
| Framework | Astro 7, static output. Plain CSS and JS, no UI framework | `astro.config.mjs`, `package.json` |
| Runtime | Node 24 | `.node-version` (CI reads it) |
| Content | Typed JSON (services, projects, FAQ, team, footer) | `src/content/`, `src/data/`, `src/content.config.ts` |
| Styles | One token file; spacing scale enforced by lint | `src/styles/tokens.css`, `docs/spacing.md` |
| Drawings | Python generators write every SVG | `tools/gen_*.py`, Python 3.12, `requirements.txt` |
| Hosting | Cloudflare Workers, static assets (no server code yet) | `wrangler.jsonc`, `public/_headers` |
| CI/CD | GitHub Actions: check, lint, build, browser check, deploy | `.github/workflows/site.yml` |
| Code checks | TypeScript (`astro check`), ESLint, Stylelint, Prettier (JSON/YAML) | `eslint.config.js`, `.stylelintrc.json` |
| Browser check | Playwright (Python) + axe-core, Chromium | `tools/verify_footer.py` |

## 2. How a change gets to live

1. Branch off `main`. One topic per branch.
2. Work locally: `npm run dev`. Before pushing: `npm run ci` (does everything CI does).
3. Push and open a PR. CI runs and posts a preview link (`https://<branch>-uplink-site.johnoreilly.workers.dev`). Check it on a phone.
4. Merge when CI is green. The push to `main` deploys to live.
5. If live breaks: `npx wrangler rollback` (steps in README, "Hosting"), then fix on a branch.
6. If the change counts as a release (see the top), run the checklist in section 5 on the live site and save the record.

## 3. Standards we meet

| Area | Standard | Why |
| --- | --- | --- |
| Accessibility | **WCAG 2.0 Level AA** (the legal floor). We aim for WCAG 2.2 AA where it costs little. | Ontario AODA / IASR O. Reg. 191/11, for organisations with 50+ staff in Ontario. Details: `knowledge/Ontario Website Accessibility Rules.md` |
| Privacy | PIPEDA (Canada). A privacy page that says what the forms collect and why | Required before any form sends personal data (forms are off today) |
| Security | HTTPS only, HSTS, strict CSP (no inline script or style), Trusted Types, nosniff, Referrer-Policy, Permissions-Policy | `public/_headers`; the build adds the hashes |
| Browsers | Current Chrome, Edge, Firefox, Safari, plus iOS Safari and Android Chrome. Older browsers get a working page without the extras | Support list still to write (`notes.md`) |
| Performance | PageSpeed 100 on Home, phone and desktop | `python tools/pagespeed.py <address>` |
| Language | English (Canada), `lang="en-CA"`. A French page gets `lang="fr-CA"` | `src/layouts/Base.astro` |

## 4. What CI already proves (don't repeat it by hand)

On every push, the build fails if any of these break:

- Types and Astro errors (`astro check`); lint on JS, TS, Astro, CSS and JSON/YAML.
- No `style=""` attributes, and every inline script and style is hashed into the CSP (`scripts/headers.mjs`).
- No script errors and no CSP blocks on any page.
- No sideways scroll from 320px to 3440px, at normal and 200% text.
- Hero, tower and footer work; the footer is one screen tall at 1440×900.
- **axe-core finds nothing serious or critical** (Home at phone and desktop, every other page at phone).

axe catches only a third to a half of WCAG problems, and only in Chromium. Everything else is in the checklist below.

## 5. Release checklist

Do it on the live site (or the PR preview for a first launch). Tick each box, and write a short note where it asks for proof. Copy this section to `docs/releases/YYYY-MM-DD.md` and fill it in there; that file is the proof.

**Release:** date `____` · commit `____` · checked by `____`

### A. Build and hosting (5 min)

- [ ] CI green on the commit that's live. Proof: link to the Actions run.
- [ ] `npx wrangler deployments list` shows that commit's version live.
- [ ] Response headers present (`curl -sI <address>`: HSTS, CSP, X-Content-Type-Options). Proof: paste the header lines.
- [ ] 404 page shows for a made-up address, with a 404 status.

### B. Browsers and phones (15 min)

Open Home, Services, one service page, Work, one case study, About and Contact in each. Look for broken layout, missing pictures, menus and dialogs that don't open.

- [ ] Chrome or Edge (Windows)
- [ ] Firefox (Windows)
- [ ] Safari (Mac or iPad)
- [ ] iPhone, Safari: also check the bottom bar, the notch area and that nothing hides under the address bar
- [ ] Android, Chrome
- Proof: device and browser version for each, plus a screenshot of anything odd.

### C. Accessibility by hand: WCAG 2.0 AA (25 min)

Where it's built, it's noted in brackets, so you know what you're checking.

**Keyboard** (unplug the mouse; Tab, Shift+Tab, Enter, Space, Esc, arrow keys)
- [ ] First Tab shows "Skip to content", and it jumps to the main content (2.4.1) [`Base.astro`]
- [ ] Every link, button, tab, dialog and form field can be reached and used (2.1.1)
- [ ] Focus never gets stuck; Esc closes every dialog and focus returns to where it was (2.1.2)
- [ ] Tab order follows the page as it reads (2.4.3)
- [ ] You can always see where focus is (2.4.7) [`:focus-visible` in `base.css`]
- [ ] Nothing changes on its own when a field gets focus or a value is picked (3.2.1, 3.2.2)

**Screen reader** (NVDA on Windows, or VoiceOver on iPhone: one page, read top to bottom, then jump by heading)
- [ ] Home reads in the order written in `docs/screen-reader-home.md`; other pages read sensibly (1.3.1, 1.3.2)
- [ ] Each picture has a short description, or is skipped if it's decoration (1.1.1)
- [ ] Buttons, tabs and toggles say what they are and their state, e.g. "selected" or "expanded" (4.1.2)
- [ ] Each link's words say where it goes, out of context (2.4.4)

**Seeing and reading**
- [ ] Text size 200% (Settings in the site, and browser zoom 200%): nothing cut off or overlapping (1.4.4) [Settings dialog; CI checks sideways scroll]
- [ ] Contrast: spot-check any new colours with the axe DevTools or WAVE extension (1.4.3) [colours from `tokens.css`]
- [ ] Meaning never by colour alone: errors, the active tab and the selected item also change shape, icon or words (1.4.1)
- [ ] No text inside pictures that isn't also real text (1.4.5)
- [ ] Each page's tab title is clear and different (2.4.2) [`src/lib/site.ts`]
- [ ] Headings and labels say what follows (2.4.6)

**Motion and time**
- [ ] Moving parts (hero, grow tower, footer map) can be paused or stop on their own within 5 s, and stay still with Reduce Motion on (2.2.2) [`prefers-reduced-motion` in `core.js` and the section CSS]
- [ ] Nothing flashes more than 3 times a second (2.3.1)
- [ ] Pop-up messages (toasts) don't vanish before they can be read: 6 s default, held while hovered or focused, closable (2.2.1) [`toast()` in `core.js`]

**Consistency and finding pages**
- [ ] Header, bottom bar and footer are the same on every page, in the same order, with the same names (3.2.3, 3.2.4)
- [ ] Two ways to reach each page: the menu and the footer links (2.4.5)

**Forms** (contact, book a call, newsletter)
- [ ] Every field has a visible label (3.3.2)
- [ ] Submit with fields empty or wrong: the error is in words, next to the field, and says how to fix it (3.3.1, 3.3.3)
- [ ] The screen reader reads the error out
- [ ] Any form that commits money or a contract can be reviewed and corrected before it's sent (3.3.4). None today.

**Media and code**
- [ ] Any new video or audio has captions and a text version (1.2.1–1.2.3). None on the site today.
- [ ] HTML validates: paste one page of each type into https://validator.w3.org/nu/ (4.1.1)
- [ ] Any text in another language is marked with `lang` (3.1.2). None today.

Proof for section C: one line per failure (page, what, WCAG number). An empty list means it passed.

### D. Content and legal (5 min)

- [ ] No link goes to `/soon` that shouldn't (before launch, see `notes.md`, "Before going live")
- [ ] Privacy, terms and accessibility pages exist, if the release goes to the real domain or turns forms on
- [ ] `noindex` is still on until launch, and off after it (`public/_headers`)

### E. Sign-off

- [ ] Everything above ticked, or each failure has a line in `notes.md` with a date to fix it.
- Result: `pass` / `pass with notes` / `fail` · signed `____`

## 6. Keeping this file honest

- When CI starts checking something new (for example Firefox and WebKit, see `notes.md`), add it to section 4 and drop it from section 5.
- If a checklist item fails twice in a row, it's a sign it should be automated. Add a line to `notes.md`.
- The Ontario summary in `knowledge/` was written from memory of the standard, not checked line by line. Have it checked against the W3C text once before the first launch.
