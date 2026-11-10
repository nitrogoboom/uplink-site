# Release and launch

Use this page before a release or the launch only. Day-to-day checks are in CLAUDE.md, "Checking a change"; CI and deploys are in [`ops.md`](ops.md#deploys).

A *release* is the first production launch, and any later change to layout, navigation, or forms, or a new page. A copy fix or a style tweak isn't one. Run the release checklist at least every three months anyway.

## Standards

| Area | Standard | Where it's shown |
| --- | --- | --- |
| Accessibility | **WCAG 2.2 Level AA** (includes WCAG 2.0 AA, Ontario's level). | `/accessibility` (`src/data/accessibility.md`) gives a feedback route. |
| Privacy | PIPEDA, and CASL for the newsletter | `/privacy` (`src/data/privacy.md`); [`security.md`](security.md#privacy) |
| Security | HTTPS and HSTS, strict CSP with hashes, Trusted Types, the protective headers, a security contact, secrets never in the repository | [`security.md`](security.md) |
| Browsers | Current Chrome, Edge, Firefox, and Safari, plus iOS Safari and Android Chrome. Older browsers get a working page without the extras. | The support list is still to write (`notes.md`). |
| Performance | PageSpeed 100 on Home, phone and desktop | `npm run pagespeed -- ADDRESS` |
| Language | English (Canada), `lang="en-CA"`; a French page gets `lang="fr-CA"` | `src/layouts/Base.astro` |

**Ontario's website rule** ([O. Reg. 191/11](https://www.ontario.ca/laws/regulation/110191), s. 14): organizations with 50 or more employees in Ontario must meet WCAG 2.0 AA on public websites, except live captions (1.2.4) and pre-recorded audio description (1.2.5).

## What the machines prove

Don't repeat these by hand: what the site checks ([`site-checks.md`](site-checks.md); each test's name says what it holds), `npm test`, and `npm run smoke` already cover.

> **Important:** axe finds only a third to a half of WCAG problems, and CI runs it only in Chromium. The release audit and the checks by hand cover the rest.

## Ship a release

1. Merge the change as usual (CLAUDE.md, "Branches, pushes, previews"). Before you merge, add the `full-checks` label, and read the run summary's "Screenshot changes": make sure you meant each one (pictures in the `visual-diff` artifact).
2. Read the deploy job's summary: it names the version that went live, or says why nothing did. A failed live check rolls back on its own; for anything else, see [Roll back a bad deploy](ops.md#roll-back-a-bad-deploy).
3. Run the [release checklist](#release-checklist) and save the record.
4. Tag the release, replacing `YYYY.MM.DD`, `COMMIT` (the merge commit), and `SUMMARY`:

   ```bash
   git tag -a vYYYY.MM.DD COMMIT -m "SUMMARY"
   git push origin vYYYY.MM.DD
   gh release create vYYYY.MM.DD
   ```

   Give the release a few lines and a link to the record, as `v2026.11.03` does.

## Release checklist

Run it on the pull request's preview or the live site. Copy this section to `docs/history/releases/YYYY-MM-DD.md` and fill it in there; that file is the proof. It takes about 25 minutes: 10 for the machine, 15 for you.

**Release:** date `____` · commit `____` · checked by `____`

### A. Build and hosting (5 minutes)

- [ ] CI passed on the commit that's live. Proof: a link to the Actions run.
- [ ] `npx wrangler deployments list` shows that commit's version live.
- [ ] `curl -sI ADDRESS` shows HSTS, the CSP, and `X-Content-Type-Options`. Proof: paste the lines.
- [ ] `npm run smoke -- ADDRESS` passes.
- [ ] A made-up address shows the 404 page with a 404 status.
- [ ] Workers logs since the last release (Cloudflare > Workers > uplink-site > Logs, search `report`): each real script error or CSP block is fixed or has a line in `notes.md`.

### B. Release audit (machine, about 10 minutes)

1. Run `npm run build`, then `npm run serve`.
2. In a second terminal, run `RELEASE=1 npm run verify -- --all` and `npm run release-audit`.
3. Paste `out/audit/report.md` and the last line of the other (the count of passed tests) into the record.

A clean run ticks every box here; a failure names the page and the problem.

- [ ] **Browsers:** every page in Chromium, Firefox, and WebKit at 1440px, and on an emulated iPhone and Android phone: no script errors, no CSP blocks, no sideways scroll (`out/audit/shots/`).
- [ ] **Keyboard (2.1.1, 2.1.2, 2.4.3, 2.4.7):** Tab through every page. Focus is visible, never off screen, never stuck; each dialog opens from the keyboard, Esc closes it, focus returns (`out/audit/keyboard/`).
- [ ] **Screen reader (1.1.1, 1.3.1, 2.4.4, 4.1.2):** every page read by a virtual screen reader. It fails on a link whose parts run together, or one link name going to two pages (`out/audit/reader/`).
- [ ] **WCAG 2.1 and 2.2 by hand, phone and desktop:** works turned sideways (1.3.4); name and email fields carry `autocomplete` (1.3.5); control borders, focus rings, and dots are 3:1 (1.4.11); with text spacing raised (line height 1.5, letter 0.12em, word 0.16em, paragraphs 2em) nothing is cut (1.4.12); content shown on hover or focus covers no words, stays while the pointer is on it, and Esc hides it (1.4.13); the site has no single-key shortcut (2.1.4); no path, two-finger, drag, or shake gesture (2.5.1, 2.5.4, 2.5.7); actions fire on release (2.5.2); each name contains its visible words (2.5.3); targets 24px or spaced (2.5.8); a focused item is never fully hidden under the header, bottom bar, or a toast (2.4.11); help sits in the same order on every page (3.2.6); no form asks twice (3.3.7) and no login puzzle (3.3.8); messages are announced without moving focus (4.1.3).
- [ ] **axe on every page, phone and desktop (1.4.3 and the rest):** `npm run verify -- --all` finds nothing serious, critical, or off the allow-list.
- [ ] **Zoom and reflow (1.4.4, 1.4.10):** the zoom check passes with `--all`. It runs Chromium only: zoom to 200% by hand once in Firefox and Safari, in a phone-size and a desktop window.
- [ ] **Motion (2.2.2, 2.3.1):** with Reduce motion on, nothing moves. With it off, the pause button stops every loop, and nothing flashes more than three times a second.
- [ ] **Forms (3.3.1, 3.3.2, 3.3.3):** each form sent empty and with a bad email. Every problem field has its message in words, tied to the field, and focus goes to the first one.
- [ ] **HTML (4.1.1):** Home passes the W3C validator. When a release changes other pages' markup, run `npm run release-audit -- --html-all`. The report lists CSS the validator doesn't know yet once and doesn't count it.

> **Caution:** The W3C validator limits requests per address ("429 Too Many Requests"). While you fix things, rerun without `html` (`npm run release-audit -- --only browsers,keyboard,reader,motion,forms`) and run `html` once at the end.

### C. By hand (15 minutes)

**Real phones** (the pull request's preview link)

- [ ] iPhone, Safari: Home, one service page, and Contact. The bottom bar and the notch area, nothing under the address bar, Grow plays and its card sits under the picture. Also the footer (tiles on Safari 18.4+).
- [ ] Android, Chrome: the same three pages.
- [ ] Firefox (ESR 140 gets the footer's rows on every screen, no map).

**Listen** (NVDA on Windows, Narrator, or VoiceOver on iPhone; 5 minutes)

- [ ] Read one changed page top to bottom, then jump by heading (H in NVDA). It should match the transcript in `out/audit/reader/`: no missing pauses, no "dot", nothing read twice. Home's recorded read-out is in [`history/screen-reader-home.md`](history/screen-reader-home.md).

**Look and judge**

- [ ] Each link's words, read alone in the transcript, say where it goes (2.4.4).
- [ ] Headings and labels say what follows (2.4.6). Each page's tab title is clear (2.4.2) [`title` in each file in `src/data/copy/en/`].
- [ ] Colour is never the only way to show meaning (1.4.1).
- [ ] Any new colour pair passes a check in axe DevTools or WAVE (1.4.3) [tokens in `tokens.css`].
- [ ] Pictures hold no words that aren't also real text (1.4.5).
- [ ] The page reads in a sensible order with styles off, and no instruction relies only on shape, size, or position (1.3.2, 1.3.3).
- [ ] Nothing changes on its own when a field gets focus or a value is picked (3.2.1, 3.2.2).
- [ ] The header, bottom bar, and footer are the same on every page (3.2.3, 3.2.4), and the menu and footer reach every page (2.4.5). The 404 page has no footer on purpose.
- [ ] New video or audio has captions and a text version (1.2.1–1.2.3); other-language text has `lang` (3.1.2); a form that commits money can be reviewed first (3.3.4); auto-playing audio can be stopped (1.4.2); a time limit can be turned off (2.2.1). The site has none of these today.

Proof for B and C: one line per failure, with the page, the problem, and the WCAG number. An empty list means it passed.

### D. Content and legal (5 minutes)

- [ ] No link goes to `/soon` that shouldn't.
- [ ] A terms page exists, if the release goes to the real domain or turns forms on.
- [ ] `noindex` is still on until launch, and off after it (`public/_headers`).
- [ ] Before the first launch: [Before launch](#before-launch) is done, or each open line has a date.
- [ ] The privacy and accessibility pages are still true for what this release changed.

### E. Sign-off

- [ ] Everything above is ticked, or each failure has a line in `notes.md` with a date.
- Result: `pass` / `pass with notes` / `fail` · signed `____`
- [ ] Tagged and released ([Ship a release](#ship-a-release), step 4).

Free tools for one page by hand: WAVE, axe DevTools, Accessibility Insights, ARC Toolkit, IBM Equal Access, Lighthouse, NVDA, VoiceOver, and Narrator.

## Watch the live site

- **Errors and CSP blocks:** in the Workers logs (3 days on the free plan), one line per `/api/report`. Look after each deploy and at each release.
- **Speed and visits:** Cloudflare Web Analytics, no cookies.
- **Up or down:** an outside uptime check is still to set up (`notes.md`).
- **Dependencies:** Dependabot, monthly. Merge each once CI passes.

When CI starts checking something new, take it off the checklist. If a checklist item fails twice in a row, add a line to `notes.md` to automate it.

## Before launch

What's left before the real domain, beyond the checklist. Tick a line with its date and proof. **(you)** needs a person or a sign-in, **(domain)** waits for the domain, **(content)** for real copy.

- [ ] Narrow the Trusted Types policy (review J6): `html()` in `core.js` passes every string; accept only the site's own drawings (an `<svg` string from a same-origin `/assets/img/` fetch) and icons.
- [ ] One cached stylesheet instead of the CSS inlined in every page (review L4): about 10 KB compressed a page now, re-downloaded each time; drops the CSP style hashes.
- [ ] Hashed drawing file names (review L5), so drawings can be cached for a year instead of a day.
- [ ] Review PR #38's form routes (`/api/contact`, `/api/book`, `/api/newsletter`) as `/api/report` was: Turnstile, honeypot, rate limit, what reaches the email, header injection in subject and reply-to.
- [ ] **(domain)** SSL Labs (A or A+), securityheaders.com, and Mozilla Observatory again on the real domain.
- [ ] **(domain)** Registrar lock, auto-renew, and 2FA on the registrar account.
- [ ] **(content)** Social links (`footer.json`, `follow.socials`) go to `/soon#social`: point each at the real page, or drop the card.
- [ ] **(content)** The 20 to 22 links a page sends to `/soon`: each gets a page or no link. Add `Français` back with a real French page.
- [ ] **(you)** A lawyer reads `/privacy` and the terms page (still to write).
- [ ] The two Ontario lines for `/accessibility` (`notes.md`, "Privacy and accessibility").
- [ ] If the company has a site today, map its old addresses to the new ones (redirects).
- [ ] **(you)** PageSpeed on every page: `npm run pagespeed -- https://uplink-site.johnoreilly.workers.dev --strict` (needs `PSI_API_KEY`).
- [ ] One WebPageTest run from Toronto on a slow phone profile, Home and Contact.
- [ ] Decide: a performance budget in CI (Lighthouse CI).
- [ ] **(domain)** Traffic against the free plan's 100,000 Worker requests a day: fine while the Worker runs only for `/api/*`, `/404`, and missing addresses; option B below puts it on every request.
- [ ] **(you)** Practise one rollback ([Practise the rollback](#practise-the-rollback)).
- [ ] **(you)** Alerts, not just logs: a Cloudflare notification or a daily summary of `/api/report` lines, plus the uptime check.
- [ ] **(content)** Proofread every page by someone who didn't write it.
- [ ] **(you)** Real phones beyond the checklist: Samsung Internet, Firefox on Android, an iPhone two iOS versions back. A short outside review by a screen-reader user, if the budget allows.
- [ ] **(you)** The owner's sign-off, in the release record.
- [ ] Check one version preview address's headers (`curl -sI`): if Cloudflare adds `X-Robots-Tag: noindex` there, the deploy's `--preview --launch` smoke run fails and blocks every deploy (review H3). If it does, leave the `noindex` check to the live run.

## Launch day

`DOMAIN` stands for the real domain (the code uses `uplinkit.ca` as a placeholder; confirm it first). The **owner** does anything that needs a sign-in (registrar, Cloudflare, GitHub settings); **Claude** makes the code changes and runs the checks. Pick a quiet weekday morning, not a Friday.

### Choose how to retire `workers.dev`

Either way, keep preview URLs on: every deploy checks the new version at its own preview address first (`scripts/deploy.mjs`).

| Option | What happens | What it costs |
| --- | --- | --- |
| **A. Turn `workers.dev` off** | The old address stops answering. | No code change. Old links break; CI's screenshot comparison must stop using it. |
| **B. Redirect `workers.dev` to `DOMAIN`** | A `301` to the same page on `DOMAIN`. | `run_worker_first` becomes `true`, so every request counts against the free plan, and `worker/index.js` needs a host redirect (not written yet). |

### The day before

1. **Owner:** lower the TTL on the current DNS records to 300 seconds, if the domain has a live site.
2. **Owner:** list the old site's addresses for redirects, if there is one.
3. **Claude:** on a branch named `launch`, make the launch changes. Don't merge yet.
   - `public/_headers`: delete the `X-Robots-Tag: noindex` line. The `.md` copies keep their own `noindex` and canonical (`scripts/headers.mjs`).
   - `src/pages/robots.txt.ts`: add the `Sitemap:` line back (its comment says how).
   - `SITE_URL`: `https://DOMAIN`, as the default in `astro.config.mjs` or in CI's environment.
   - `wrangler.jsonc`: add `routes` with the custom domain.
   - `.github/workflows/site.yml`: the screenshot comparison's live address becomes `DOMAIN`, and the deploy step becomes `node scripts/deploy.mjs https://DOMAIN --launch`. Change the example address in the comment at the top of `scripts/ci.mjs` too.
   - `SECURITY.md`: point the `security.txt` link at `DOMAIN`.
   - `src/data/privacy.md`: if Bot Fight Mode goes on, change "The site sets no cookies" (it sets `__cf_bm`; item 17 in [`history/privacy-and-accessibility-2026-11-03.md`](history/privacy-and-accessibility-2026-11-03.md)). Turn it on only with a rule that lets the user agents `uplink-deploy` and `uplink-smoke-test` through, or the deploy's live check fails and rolls back.
   - Option A: nothing in `wrangler.jsonc` or `worker/index.js`; keep `run_worker_first` as `["/api/*", "/404"]`, `not_found_handling` as `"none"`, and the `http://` redirect lines.
   - Option B: `run_worker_first: true`, `not_found_handling` stays `"none"`. Add a `301` for exactly the host `uplink-site.johnoreilly.workers.dev`, never anything ending in `workers.dev`: preview addresses are `workers.dev` hosts too, and redirecting them would stop every deploy.
4. **Claude:** open the pull request and let CI pass. Don't merge yet.
5. **Both:** read the pull request's preview once, end to end.

### Launch

It takes about an hour.

1. **Owner:** add `DOMAIN` as a Cloudflare zone (free plan) and change the nameservers at the registrar. Wait until the zone is Active.
2. **Owner:** zone settings: SSL/TLS **Full (strict)** and **Always Use HTTPS**; minimum TLS 1.2, HTTP/3, and Early Hints on; Auto Minify and Rocket Loader off (they break the CSP hashes); make sure the Browser Integrity Check doesn't block agents reading `llms.txt` and the `.md` copies; DNSSEC on, then the DS record at the registrar.
3. **Owner:** attach `DOMAIN` before the merge. CI's `wrangler versions deploy` doesn't apply `routes`, so from the `launch` branch, signed in, run:

   ```bash
   npx wrangler triggers deploy
   ```

   Before the merge, run `curl -sI` on a page at the `launch` pull request's preview: any `X-Robots-Tag` there comes from Cloudflare (see the last line of [Before launch](#before-launch)).
4. **Owner:** in Workers > uplink-site > Settings, check the custom domain is Active, with a certificate.
5. **Claude:** merge the `launch` pull request, then read the deploy job's summary. A failed live check rolls back.
6. **Claude:** run `npm run smoke -- https://DOMAIN --launch`. Every line must pass. Check that the Early Hints 103 arrives with `curl -I --http2`.
7. **Owner and Claude:** retire the old address.
   - Option A: Workers > uplink-site > Settings > Domains & Routes: turn `workers.dev` off and leave Preview URLs on. Check the old address no longer answers, then open a test pull request and check its preview still works.
   - Option B: `npm run smoke -- https://DOMAIN --launch --old https://uplink-site.johnoreilly.workers.dev`.
8. **Owner:** add the no-mail DNS records: CAA for Cloudflare's certificate authorities, SPF `v=spf1 -all`, DMARC `_dmarc` with `p=reject`, and a null MX (`0 .`). Replace them when Email Service starts sending.
9. **Owner:** add `DOMAIN` to the Web Analytics site, or make a new site and give Claude the token for `core.js`. Drop the "old pages.dev host" remarks in `core.js` and `security.md`.
10. **Claude:** run `npm run verify -- --base https://DOMAIN`, then open Home, one service page, and Contact in a real browser and watch the console.

### Straight after launch

- **Owner:** Google Search Console and Bing Webmaster Tools: verify by DNS, submit `https://DOMAIN/sitemap.xml`. (`FAQPage` markup gives no rich result: Google shows it only for government and health sites.)
- **Owner:** point the uptime check at `DOMAIN`.
- **Both:** SSL Labs, Mozilla Observatory, Google's Rich Results Test (Home, one service, one project), and the LinkedIn and Facebook share previews.
- **Claude:** tick what the launch closed on this page and in `notes.md`, and tag the release.
- **Owner, after a week of clean HTTPS:** add `includeSubDomains; preload` to HSTS and submit at [hstspreload.org](https://hstspreload.org/). Preloading is hard to undo.
- **Owner:** set the DNS TTL back to Auto.

### Back out

| What broke | How to undo it | How long |
| --- | --- | --- |
| A bad deploy | If the smoke check caught it, CI already rolled back. Otherwise `npx wrangler rollback`, then fix on a branch. | Seconds |
| The domain or certificate fails | Remove the custom domain from the Worker; `workers.dev` still works (with option A, turn it back on first). | Minutes |
| The nameserver move went wrong | Put the old nameservers back at the registrar. | Up to the old TTL |
| Pages indexed too early | Put `X-Robots-Tag: noindex` back and deploy; Search Console > Removals for urgent ones. | One deploy |

### Practise the rollback

Do this once before launch, on a quiet day. It briefly puts the previous version live.

1. Note the current version ID: `npx wrangler deployments list`.
2. Put the previous version live and check it: `npx wrangler rollback`, then `npm run smoke -- https://uplink-site.johnoreilly.workers.dev`.
3. Go back, replacing `VERSION_ID` with the ID from step 1: `npx wrangler rollback VERSION_ID`, then run the smoke check again.
4. Tick the line in [Before launch](#before-launch) with the date and how long it took.
