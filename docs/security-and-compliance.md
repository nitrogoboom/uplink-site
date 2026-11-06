# Security and compliance: what we built, how to review it, how to reproduce it

This is how the Uplink site handles security, privacy, accessibility and operations. Each control says what it is, the rule it answers to, how we built it, how to check it, and how to do the same on another site.

It leaves out the look and the code style; those are in README, `docs/spacing.md` and `CLAUDE.md`.

This is reference, not a to-do list. The release checklist is `docs/sop.md`; open items are `notes.md` and `docs/go-live-checklist.md`. When a control changes, change its entry here in the same PR. Written 5 Nov 2026.

## How to review the site

About 30 minutes for a full review. To review one change, do only the steps its area touches.

1. **Run the machine checks** against a local build:

   ```
   npm run build
   npm run serve
   ```

   Then in a second window:

   ```
   npm run ci
   python tools/verify_footer.py out/ --all
   python tools/verify_text.py
   ```

   Each must end clean. Together they cover types, lint, the build steps, the Worker's tests, script errors and CSP blocks, sideways scroll, axe on every page, broken links, and text at 200%.
2. **Check the live site from outside:**

   ```
   python tools/smoke.py <address>
   ```

   Then run Mozilla Observatory on the address (developer.mozilla.org/en-US/observatory). It should be A+, 12 of 12.
3. **For a release, run the release audit:** `npm run release-audit`. It covers three browser engines, keyboard, screen-reader transcripts, motion, forms and the W3C HTML check. Then do the hand checks in `docs/sop.md`, section 5C.
4. **Walk the controls below.** For each, run its "Check it" line, and confirm "How we built it" still holds.
5. **Write down each finding:** the control, the page or file, what's wrong, and the rule number.

## Standards we answer to

| Area | Standard | Our level |
| --- | --- | --- |
| Accessibility | WCAG 2.0 AA (AODA, O. Reg. 191/11) | Required of us only from 50 staff; we hold it anyway. 2.1 and 2.2 AA rules met where cheap (marked below). Public statement at `/accessibility`. |
| Privacy | PIPEDA; CASL for email marketing | `/privacy` says what's collected, by whom, where, how long, and your rights. No cookies. |
| Security | OWASP secure headers; Mozilla Observatory | A+, 130/130 (5 Nov 2026). Strict CSP with Trusted Types. |
| Disclosure | RFC 9116 (security.txt) | `/.well-known/security.txt`, `SECURITY.md` |

---

## Security

### HTTPS everywhere, with HSTS

- **What:** every request is HTTPS. Browsers are told never to use plain HTTP for a year.
- **Why:** it stops anyone on the network reading or changing pages.
- **How we built it:**
  - `worker/index.js` sends any `http://` request to the same `https://` address with a 308. `run_worker_first: true` in `wrangler.jsonc` makes every request pass through it, because a `workers.dev` zone has no "Always Use HTTPS" switch.
  - `public/_headers` sends `Strict-Transport-Security: max-age=31536000`.
- **Check it:** `curl -sI http://<host>/services` gives a 308 to `https://`. `curl -sI https://<host>/` shows the HSTS line. `smoke.py` checks both.
- **To reproduce:**
  1. On your own domain, turn on Always Use HTTPS at the CDN, plus TLS 1.2 minimum.
  2. Send HSTS for a year.
  3. Add `includeSubDomains; preload` only once every subdomain is HTTPS for good, then submit at hstspreload.org.
  4. For us, steps 1 and 3 come at launch (`docs/launch-runbook.md`).

### Content Security Policy, strict

- **What:** the browser runs only the scripts and styles we named. No inline script or style runs unless its exact hash is listed.
- **Why:** it's the main defence against cross-site scripting. Even if an attacker got markup into a page, their script wouldn't run.
- **How we built it:**
  - `public/_headers` holds the policy as a template:
    - `default-src 'self'`
    - scripts from our own site, plus Cloudflare's analytics beacon
    - styles from our own site
    - `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`
  - At build, `scripts/headers.mjs` finds every inline `<script>` and `<style>` in the built pages and drawings and writes their SHA-256 hashes into the policy. Nobody pastes a hash by hand.
  - There is no `'unsafe-inline'` for styles. The build refuses any `style=""` attribute; scripts set styles through `el.style`; generated drawings put timings in classes.
- **Check it:**
  - `curl -sI https://<host>/ | grep -i content-security`
  - `verify_footer.py` fails on any CSP block in any page
  - `npm test` covers the hashing and the `style=""` refusal (`scripts/test/build-scripts.test.mjs`)
- **To reproduce:**
  1. Start from `default-src 'self'` and add only what breaks, one host at a time.
  2. Hash inline scripts at build time, not by hand.
  3. Ban `style=""` attributes so `style-src` needs no `'unsafe-inline'`.
  4. Run a headless browser over every page in CI and fail on any CSP console error.

### Trusted Types

- **What:** script can write HTML into the page only through one named policy, and load scripts only from one allowed address.
- **Why:** it closes the DOM-based XSS that a CSP alone can't see, such as `innerHTML` with data from somewhere unexpected.
- **How we built it:**
  - The CSP adds `require-trusted-types-for 'script'; trusted-types uplink`.
  - `src/scripts/core.js` creates the `uplink` policy and exports `html()`. Every `innerHTML` in our scripts goes through it.
  - Its `createScriptURL` allows only the analytics beacon and throws on anything else.
- **Check it:** grep `src/scripts/` for `innerHTML`, `insertAdjacentHTML` and `outerHTML`. Each must take `html(...)`. A miss shows up as a console error that `verify_footer.py` catches.
- **To reproduce:** add the two CSP directives, create one policy in your first script, export one helper, and route all HTML writes through it. Browsers without Trusted Types simply skip it.

### Other response headers

- **What we send** (`public/_headers`, every file):
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`, plus `frame-ancestors 'none'` in the CSP
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`
  - `Cross-Origin-Opener-Policy: same-origin`
- **Why:** they stop MIME sniffing, clickjacking, leaking full addresses to other sites, other pages grabbing device features, and cross-window attacks.
- **Check it:** `smoke.py` fails if any of the security headers is missing on any page. Observatory grades them all.
- **To reproduce:** copy the block. Add a feature to `Permissions-Policy` only when the site truly needs it.

### Reporting what the browser blocks

- **What:** visitors' browsers tell us when the CSP blocks something or a script throws an error. We find out about problems without anyone reporting them.
- **How we built it:**
  - Headers: `Reporting-Endpoints: csp="/api/report"`, plus `report-to csp` and `report-uri /api/report` in the CSP (the second for older browsers).
  - `core.js` posts uncaught errors and rejected promises with `navigator.sendBeacon`. At most 5 a page; "Script error." and ResizeObserver notices are skipped.
  - `worker/index.js` `/api/report` turns each report into one JSON line in the Workers logs (Cloudflare > Workers > uplink-site > Logs; kept 3 days on the free plan).
- **Check it:** `npm test` (`scripts/test/worker.test.mjs`). After a deploy, look at the logs for `report` lines.
- **To reproduce:** one small endpoint on your own origin, so no new CSP host is needed. Log a flat, trimmed record. Wire both `report-to` and `report-uri`.

### The one server endpoint, hardened

The Worker answers `/api/*` only. Everything else is static files. Its report endpoint:
- accepts POST only (405 otherwise)
- refuses another site's Origin (403)
- drops reports about pages on other sites
- rate-limits each visitor address to 30 posts a minute (a Cloudflare rate-limit binding, `REPORTS` in `wrangler.jsonc`; 429 past it)
- stops reading a body past 8 KB, even without a `Content-Length` (413)
- refuses bodies that aren't JSON (400)
- caps each text field at 300 characters
- strips the query and fragment from every address
- logs line and column only as whole numbers
- never logs form contents or the IP address (Cloudflare's own run log has the IP; the privacy page says so)

- **Check it:** `npm test`; each rule has a test.
- **To reproduce:** for any endpoint that takes input:
  1. Allow only the method you need.
  2. Check the Origin header.
  3. Rate-limit per address.
  4. Cap the body while reading it, not after.
  5. Parse strictly, trim every field, and log only what you need.

### Secrets and the supply chain

- **What:** secrets stay out of the repo, the tools that build the site are pinned, and updates arrive on a schedule.
- **How we built it:**
  - Secrets live in a GitHub environment (`cloudflare`) and Cloudflare. `docs/secrets.md` lists every one by name and place, never its value. `.dev.vars` is gitignored.
  - GitHub Actions are pinned to commit hashes, not tags. Dependabot runs weekly for npm, pip and Actions (`.github/dependabot.yml`).
  - The page loads no third-party code except Cloudflare's analytics beacon. Fonts are self-hosted.
- **Check it:**
  - `npm audit --omit=dev` shows 0 in what the site ships. Today the dev-only tooling has 11 moderate, all one ESLint dependency.
  - `git grep -iE "api[_-]?key|token|secret" -- ':!docs'` finds names only, never values.
- **To reproduce:**
  1. One page listing every secret's name, place, owner and how to rotate it.
  2. Pin Actions to commits.
  3. Run Dependabot.
  4. Self-host fonts.
  5. Treat every outside script as a CSP and privacy change.
- **Still open:** branch protection, secret scanning, 2FA on a company account, rotation dates (`notes.md`, "Production readiness").

### Security contact

- **What:** a published way to report a security problem.
- **How we built it:**
  - `/.well-known/security.txt` is generated at build (`src/pages/.well-known/security.txt.ts`). Its `Contact` comes from `footer.json`, and `Expires` is a year from each build, so it renews itself on every deploy.
  - `SECURITY.md` in the repo.
  - The inbox is still a placeholder (`notes.md`).
- **Check it:** `curl https://<host>/.well-known/security.txt`. The `Expires` date must be in the future, and the `Contact` inbox must be one someone reads.
- **To reproduce:** follow RFC 9116, generate the file at build so it never expires, and point it at a watched inbox.

---

## Privacy

### No cookies, no tracking

- **What:** the site sets no cookies and uses no ad or tracking scripts.
- **How we built it:** analytics is Cloudflare Web Analytics, which uses no cookies. `core.js` loads it after the page has loaded, with its host named in the CSP.
- **Check it:** load any page in a fresh profile; the browser's cookies list for the site is empty.
- **To reproduce:** pick cookieless analytics, and you need no consent banner. If a CDN setting adds a cookie (Bot Fight Mode's `__cf_bm`), the privacy page changes first.

### A privacy page that stays true

- **Why:** PIPEDA requires saying what you collect, why, who processes it and where, how long you keep it, and how to ask about it.
- **How we built it:**
  - `/privacy` is Markdown (`src/data/privacy.md`). The reasoning and the law behind each claim are in `docs/privacy-and-accessibility-2026-11-03.md`.
  - Contact details are placeholders filled from `src/data/footer.json`, so they're never typed twice.
  - The rule: anything that starts collecting data, or changes a processor, changes the privacy page in the same PR.
- **Check it:** for each claim on the page, find the code that makes it true. The error-report fields are in `worker/index.js`, and the analytics in `core.js`.
- **To reproduce:** write each claim with its source beside it in a reasoning doc, and review the page in every PR that touches data.
- **Still open:** a lawyer's read, a named Privacy Officer, real inboxes (`notes.md`).

### Data minimisation in reports

- Error reports carry the page path without its query, the message, the script address without its query, line and column, and the browser name. They never carry form contents or anything typed.
- The privacy page says what the report holds, and that Cloudflare keeps its own record with the IP for 3 days.

---

## Accessibility

Target: WCAG 2.0 AA. The public statement is at `/accessibility` (`src/data/accessibility.md`), with a feedback route.

### What we built

| Area | How | WCAG |
| --- | --- | --- |
| Page structure | One h1, no skipped heading levels, one `main`, header and footer, each `nav` named, no duplicate region names | 1.3.1, 2.4.6 |
| Skip link | First Tab stop, lands in `main` | 2.4.1 |
| Titles and language | Unique `<title>` per page (`src/lib/site.ts`); `lang="en-CA"` | 2.4.2, 3.1.1 |
| Link and button names | From visible words; `<Pause />` between the parts of a two-part link; one name never goes to two places | 2.4.4, 2.5.3 (2.1) |
| Images | Decorative SVG hidden; card images `alt=""`; drawing labels repeated in the page text | 1.1.1, 1.4.5 |
| Keyboard | Everything reachable, nothing trapped; native `<dialog>` with Esc and focus return; amber focus ring on every stop | 2.1.1, 2.1.2, 2.4.3, 2.4.7 |
| Shortcuts | Single keys can be turned off in Settings; never fire while typing or in a pop-up | 2.1.4 (2.1) |
| Contrast | 4.5:1 for text, 3:1 for control edges; all colours from `tokens.css` | 1.4.3, 1.4.11 (2.1) |
| Colour alone | Errors have words and an icon; the current tab changes shape as well as colour | 1.4.1 |
| Text size | Settings scales text to 200% (only text grows); browser zoom to 200% works | 1.4.4 |
| Text spacing | WCAG's spacing applied: nothing clips; screen-tall boxes are floors, centred with `safe center` | 1.4.12 (2.1) |
| Reflow | Every page at 320px wide, no sideways scroll | 1.4.10 (2.1) |
| Targets | 44px minimum (`--tap`); nothing under 24px | 2.5.8 (2.2) |
| Motion | Reduced motion stops everything; each loop has a pause button; nothing flashes more than 3 times a second; loops stop off screen | 2.2.2, 2.3.1 |
| Forms | Visible labels, "(optional)" marked, `autocomplete`, errors in words tied to the field, focus to the first error | 1.3.5 (2.1), 3.3.1, 3.3.2 |
| Status messages | Toasts and filter counts in a polite live region | 4.1.3 (2.1) |
| Valid HTML | W3C validator, no errors | 4.1.1 |

### Display modes

- **No script:** every page reads in full, and controls that need script are hidden rather than dead (the `js` class on `<html>`).
- **Windows contrast themes:**
  - text, borders and focus follow the system colours
  - drawings keep a dark plate so their labels stay readable
  - anything drawn with a background only has a `forced-colors` rule
- **Print:** dark ink on white; navigation, footer and the self-building drawings stay off; cards don't split (`src/styles/print.css`).

### Check it

- **Every push (CI):**
  - axe on Home at phone and desktop, nothing serious or critical
  - no sideways scroll; text at 200% on every page
- **Every release (`npm run release-audit`):**
  - axe on every page, Tab-through stops recorded (`out/audit/keyboard/`), screen-reader transcripts (`out/audit/reader/`)
  - motion, form errors, W3C
- **By hand, each release:**
  - 5 minutes with NVDA or VoiceOver
  - a real iPhone and Android phone
  - the judgement checks in `docs/sop.md` 5C
- **For display modes and text spacing,** the Playwright checks from the go-live review:
  - `emulate_media(forced_colors='active')`
  - `emulate_media(media='print')`
  - `java_script_enabled=False`
  - injected WCAG spacing CSS

### To reproduce

1. Write down the level you hold (2.0 AA, 2.1 AA) and why. Publish a statement with a feedback route.
2. Put axe and a no-sideways-scroll check in CI on every page. They catch about a third of problems.
3. Before each release, run three engines, a keyboard Tab-through and a screen-reader transcript, and listen with a real screen reader for 5 minutes.
4. Test the four modes a person can bring:
   - no script
   - reduced motion
   - contrast themes
   - big text with spacing
5. Keep a one-page record per release (`docs/releases/`).

---

## Search engines and AI agents

- **Test builds stay out of search:**
  - `X-Robots-Tag: noindex` on every response
  - `robots.txt` allows crawling, so the noindex can be read, and names no sitemap
  - Both flip at launch (`docs/launch-runbook.md`).
  - `smoke.py` checks noindex is on now; with `--launch`, that it's gone.
- **Clean signals:**
  - canonical on every page, absolute and pointing at itself
  - unique title and description
  - Open Graph tags
  - JSON-LD built from the content files
  - a sitemap with real `lastmod` dates
- **For AI agents:** every page has a Markdown copy at its address plus `.md`, and `llms.txt` and `agents.md` give the map. Each `.md` copy will carry a canonical `Link` header back to its page at launch.

---

## Operations

### Deploy, preview, undo

- **Deploy:** every push runs CI (check, tests, lint, build, browser check, link check). Only a green push to `main` deploys.
- **Preview:** a PR gets a preview address and a screenshot comparison against live.
- **Undo:** `npx wrangler rollback`, which takes seconds. Practise it once before launch (steps in `docs/launch-runbook.md`).
- **After every deploy:** `python tools/smoke.py <address>` checks:
  - every page answers 200 with its headers
  - `http://` redirects
  - made-up addresses give 404
  - the report endpoint refuses GET
  - noindex is in the right state
  - the sitemap names this host

### Watching the live site

- **Script errors and CSP blocks** from real visitors: Workers logs, `/api/report` lines.
- **Visits and speed:** Cloudflare Web Analytics (no cookies).
- **Still open:** an outside uptime check, and alerts rather than logs alone (`docs/go-live-checklist.md`, section 7).

### Launch

`docs/launch-runbook.md` has the steps in order, who does each, and a back-out table. It covers:
- DNS TTL, then the zone
- TLS and HTTPS settings
- DNSSEC, CAA records, and SPF, DMARC and null MX for a domain that doesn't send mail yet
- noindex off
- the smoke test with `--launch`
- SSL Labs and Observatory on the real domain

---

## Results on record

| Date | Check | Result |
| --- | --- | --- |
| 3 Nov 2026 | Release audit (machine part), W3C on Home | Pass (`docs/releases/2026-11-03.md`) |
| 5 Nov 2026 | Mozilla Observatory, live `workers.dev` | A+, 130, 12/12 |
| 5 Nov 2026 | `npm audit --omit=dev` | 0 vulnerabilities |
| 5 Nov 2026 | Lighthouse, 20 pages × phone and desktop | Accessibility 100, Best practices 100 |
| 5 Nov 2026 | Structure audit, 22 pages | Pass after two fixes |
| 5 Nov 2026 | Contrast themes, print, no script, 320px reflow, text spacing | Pass after fixes |
| 5 Nov 2026 | `verify_footer.py --all`, `verify_text.py` (200% and 100%) | All clear |
| 5 Nov 2026 | `smoke.py`, live | 20 pages, pass |

Add a row each time a check runs for a release.
