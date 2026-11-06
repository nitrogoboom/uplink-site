# Notes: open items

Things to fix, polish or decide. Remove a line when it's done; add new ones as they come up.

## Outside review (6 Nov 2026, independent session, 7.5/10)

Get main green first:
- [ ] Spacing check fails since #74: on phones `.fc-base` gets 88px bottom padding (`--botnav-h` + `--sp-5` + safe area, `bottom-nav.css`). Fix: make the sum land on the scale (for example `--botnav-h` + `--sp-6`, if `--botnav-h` is a step), or add a reasoned `SKIP` entry in the spacing check if the tab bar's height has to stay off the scale. Rerun `npm run verify:spacing`.
- [ ] W3C error on Home: `pathLength` on the Grow play ring's `<circle>` (`Grow.astro`, `.grow-ring`). Fix: drop the attribute; set the circle's real circumference as `stroke-dasharray` in `grow.css`, and have `drawRing()` in `grow.js` use that length instead of 100.
- [ ] Release audit, WebKit: "Refused to apply a stylesheet" on every page, and `/api/report` answers its CSP report with 403. Fix: find which stylesheet it means (the report body names the blocked URL); likely a hash WebKit computes differently, or the Origin check rejecting WebKit's report. Fix the cause, not the check.
- [ ] Then protect `main`: PR required, `build` must pass (already in "Production readiness").

Quick, visible:
- [ ] Phone hero opens on a near-empty grey slab for 1 to 2 seconds before the drawing builds. Fix: paint a finished still first (the `render('phone')` still, already a "Drawings" item), then start the animation over it, or start the build further along.
- [ ] Grow "Team of" counter climbs 0 to the step's size over 1.2 s, while the desktop step list shows the final number at once, so for a moment they disagree (a reviewer saw "Team of 2" next to the list). Fix: shorten the climb, or count only when moving to a step that wasn't shown yet; check the list and counter always end on the same number.
- [ ] 404 page runs straight into the full-screen "Reach us" footer, so it reads as two pages stacked. Fix: give the 404 section its own full screen (`fold-always`), or a short footer on that page only.

Design, nice to have:
- [ ] Desktop: the small secondary text under hero items and footer lines is low-contrast (it passes AA). Raise its size a step or its colour toward `--c-text`.
- [ ] Home services row mixes three tall cards with four short tiles; the tall ones are mostly empty. Even out the row, or give the tall cards their drawing.
- [ ] Trusted Types policy passes every string (`createHTML: (s) => s` in `core.js`). Fix: only accept the site's own drawings (for example, a string that starts with `<svg` from a same-origin `/assets/img/` fetch), and say so in the docs.

Rule from now on:
- [ ] Freeze the tooling: no new checks or docs until real content arrives. Spend the time on content, forms (PR #38) and launch steps.

## Production readiness (3 Nov 2026, no domain needed; talk in `conversation-2026-11-03.md`)
- [ ] Browsers: write the support list (`browserslist`), and check `:has()`, `@view-transition` and `text-wrap` fall back cleanly where missing. (Trusted Types already does: `core.js` checks for `window.trustedTypes`.)
- [ ] GitHub: protect `main` (PR required, `build` must pass). Today a push straight to `main` deploys as soon as CI passes, with no review. While there, turn on secret scanning and push protection (Settings > Code security) if the plan offers them.
- [ ] Cloudflare: company account with 2FA; API token scoped to this one Worker.
- [ ] Uptime check from outside Cloudflare, pointed at the `workers.dev` address for now.
- [ ] Secrets: give each one an owner and a rotation date (`docs/secrets.md` lists them all, with where each lives).
- [ ] Finish the baseline in `docs/releases/2026-11-03.md`: the 15-minute hand part (real iPhone and Android, a 5-minute NVDA listen, the judgement checks). The machine part, W3C included, passes.
- [ ] Decide later, on hold: who edits copy. Today it's Claude editing on your behalf about 90% of the time, which suits copy as JSON and Markdown in git (`src/content/`, `src/data/`): every change is reviewed, checked by CI and can be undone. A CMS only earns its place if staff will edit the site themselves.
- [ ] Decide later, on hold: if the real company has a site today, map its old addresses to the new ones (redirects) before the domain moves.

## Privacy and accessibility pages (3 Nov 2026; sources and the full list in `docs/privacy-and-accessibility-2026-11-03.md`)
- [ ] Real inboxes for `privacy@`, `accessibility@` and `security@` (placeholders in `src/data/footer.json`, `inboxes`), and a postal code for the office address.
- [ ] Name the Privacy Officer (the page gives the title only, which PIPEDA allows).
- [ ] Before launch, the accessibility page needs back two short lines Ontario requires (O. Reg. 191/11; cut 3 Nov 2026 as too much for the mockup): what happens after someone sends feedback (s. 80.50(2), e.g. reply times) and that accessible formats are available on request at no cost (s. 12(3)). Sources in `docs/privacy-and-accessibility-2026-11-03.md`.
- [ ] "only a few people at Uplink will be able to open the inbox" (privacy page, "How we protect it") is an assumption: confirm or cut.
- [ ] AODA compliance report: businesses with 20 to 49 employees in Ontario file one every three years; **the next deadline is 31 Dec 2026** (checked on ontario.ca, 5 Nov 2026: "Accessibility rules for businesses and non-profits"). The site says 22 technicians, so it applies to the real company if that's true. Filed through the Accessibility Compliance Reporting Portal.

## Home fixes (review 2 Nov 2026, GPT review checked against the code)
- [ ] Booking toast says "We will email you within one business day" (`core.js`), but nothing is sent. Fixed by PR #38 (shows success only once the server accepts); left as is on `main` to avoid a conflict while forms are paused.

## Code (whole-project review 2 Nov 2026; docs review 5 Nov 2026)
- [ ] W3C validator: Home has an HTML error, `pathLength` on the `<circle>` in the Grow play button's ring (`Grow.astro`, `.grow-ring`). Both the Python and Node audits flag it (5 Nov 2026). Drop the attribute and size the ring's dash in CSS or script, or set it some other valid way.
- [ ] Open PR #76 (clean up old pull request previews on Cloudflare every 3 days): its build passed; it waits for the owner's merge, then a one-preview delete test.
- [ ] Small, left as they are: `box()` is defined twice (`gen_hq.py`, `gen_office.py`), each a little different; `ServiceCard`'s `on`/`first`/`heading` props have one caller.
- [ ] The styles check (`npm run verify:styles`) now and then reports a `div.container`'s side margins as 0 instead of 440px at 3440 on `/` or `/work`, even comparing a build with itself: the Chrome quirk the comment in `service-page.css` describes, on other pages. Seen with the old Python check and the Node one alike (November 6, 2026). Rerun it before you trust such a line.
- [ ] Spacing check fails on `main` since #74 (cbf673c): on phones `.fc-base` has `padding-bottom: calc(var(--botnav-h) + var(--sp-5) + …)` (`bottom-nav.css`), 88px, off the scale. Put it on a step, or add it to `SKIP` in `checks/spacing.spec.mjs` with its reason (November 6, 2026).
- [ ] Release audit, WebKit: Playwright 1.64's WebKit (27.2) logs "Refused to apply a stylesheet … style-src" twice on every page, and the Worker answers its CSP report with 403. The older WebKit (Playwright 1.58) logged neither, and the page's one `<style>` matches its hash. Find what WebKit refuses (an SVG's own `<style>`, reached through `<use>`?), check it in real Safari, and see why `/api/report` refuses WebKit's report (November 6, 2026).

## Page structure
- [ ] Plans or pricing section: dropped with the placeholder table. Add one back to Services once real pricing exists.
- [ ] Home "Our work" row is a placeholder for that spot until its real section is decided.
- [ ] Home "We grow with you" (built 4 Nov 2026 from the round 8 mockups, `editing-room/grow-options/`): one world that grows in six steps by where people work, played by `src/scripts/grow.js`; copy in `src/data/grow.json`; drawing `tools/gen_grow.py`. Open: final copy and team sizes (my guesses), people drawn as more than blocks, a real iPhone and Android pass (timing: `DWELL`, `RISK_AT`, `FIX_AT` in `grow.js`). Desktop: the steps are a list in the left column (option C, November 6, 2026, mockup in `editing-room/grow-list/`).
- [ ] Contact: "Open a ticket" and "Start a remote session" go to the coming-soon page.
- [ ] Desktop gaps: Home and About done (About 3 Nov 2026: "How we work" is a short band at its own height, Team one screen on desktop and its own height below). Rule agreed 2 Nov 2026: on desktop a section is one screen (`.fold`) when it has enough to fill it, and a short band keeps its own height; below desktop a section takes its own height, except `.fold-always` (the hero and each page's first screen). Next: Contact (Support) and Services (Faq), which still carry `fold-always` past their first screen. (Work's Projects is its first screen, so `fold-always` is right there.) Classes in `src/styles/layout.css`, desktop rules in `fold.css`.

- [ ] Home wheel grid (4 Nov 2026, `docs/fold-wheel-grid-2026-11-04.md`): folds are whole 100px wheel steps on desktop. Open: Page Down still moves 87.5% of a screen and leaves the grid (a small key handler could step one fold); the other pages' folds could take the same grid once their desktop gaps are done.

## Drawings
- [ ] 404 page: a three-panel heist comic, draft in `editing-room/404-comic/` (branch `404-comic-draft`). Panels 2 and 3 work; panel 1 (the van) needs a rethink, and the punchline balloon clips the "t" in "typed".
- [ ] Hero on phones with reduced motion (and without script): they still show `office-compact.svg`, the older plan. Make the still from the same scene (`render('phone')` with the animation off) when the hero drawing is final.

## Look and feel
- [ ] Footer on phones (live 5 Nov 2026, PR #73): under 700 px the footer is six rows that open in place, no map. Open: try it on a real iPhone and Android.
- [ ] Small, left as they are: Home-only hero rules in the shared `compact-cuts.css`; the services observer (`home.js`) also runs at 700px and up, where its dots are hidden; JSON-LD is pretty-printed (about 20 B gzipped).

## Checks to repeat
- [ ] PageSpeed mobile: confirm LCP is the hero text (about 1.1 s locally) with `npm run pagespeed`. Phones with reduced motion still paint the picture as LCP.

## Before going live
Forms and content:
- [ ] Forms: PAUSED (2 Nov 2026). [PR #38](https://github.com/nitrogoboom/uplink-site/pull/38) (`claude/sweet-chaum-b12ca0`) has the Worker endpoint, Turnstile, honeypot and rate limit, with email as a stub; leave it open, unmerged. To pick it up: set the Worker secrets `TURNSTILE_SECRET` (Turnstile widget "uplink-site forms") and `FORM_TO`, put a sending domain on Cloudflare, then wire the send step.
- [ ] Forms PR #38 now conflicts with `main` (GitHub, 5 Nov 2026). Both have `worker/index.js` (`main` has `/api/report`): merge by keeping both routes; `wrangler.jsonc` already has `main` and `run_worker_first`, and its `ratelimits` keeps both entries (`REPORTS` 1002 here, `FORMS` 1001 there). `run_worker_first` on `main` is `true` (every request; the HTTPS item under "Domain and hosting"), so PR #38's `["/api/*"]` must not win the merge.
- [ ] When forms send: delete the "send nothing yet" lines and the `FORMS-LIVE` comments in `src/data/privacy.md` and `accessibility.md`; link the privacy page beside each Send button; give the newsletter a CASL consent line ("One email a month from Uplink Technology. Unsubscribe any time. Privacy."); decide what sends the newsletter (a mailing service is another processor to name) and where consent records are kept; decide on Cloudflare Email Service's "Email preview" (keeps each sent message about 7 days; the privacy page says so).
- [ ] Forms (decided 2 Nov 2026: build now, email via Cloudflare Email Service): contact, book-a-call and newsletter send nothing yet. Without script, the contact and newsletter forms go to `/soon` and their fields have no `name`; give the fields names back with the endpoint. Plan: a Worker endpoint (same origin, so `form-action 'self'` holds) with Turnstile, a honeypot field and a rate limit. Email Service sends from a domain on a Cloudflare zone, and `workers.dev` is not one, so the sending domain (the real one, or any domain moved to Cloudflare) comes first. CSP then needs `challenges.cloudflare.com` in `script-src` and `frame-src`, and the Trusted Types policy in `core.js` must allow Turnstile's script.
- [ ] Service and project copy (how it works, questions, case studies) is sample text, and stays sample (decided 2 Nov 2026) until there is a real client. Then rewrite with real details (each entry's `page` field in `src/content/`).
- [ ] Copy to confirm: VoIP wording ("Phones & Teams calling" section, card and footer); backup drawing subline "a separate, locked site" (`gen_backup.py`); network label VOIP PHONES "calls over your network" (`gen_network.py`); hero phone line `lead-short` in `Hero.astro`; the six grow tags (`tags` in `src/data/grow.json`); the "Windows 10 support has ended" hero card (slot for the first real article).
- [ ] 20 to 22 links per page go to `soon` (client portal, remote support, status, careers, blog, Windows 10 guide, security checklist, terms, five social links; privacy and accessibility have pages since 3 Nov 2026). Kept on `soon` while this is a mockup (decided 2 Nov 2026); at launch each needs a page or no link. Add `Français` back with a real French page.
- [ ] Once there is real content: drawn avatars for the team cards instead of initials; a spot for client quotes on Home or Work.
- [ ] Business JSON-LD with real phone, address, hours, `logo`, `image`, `sameAs`, `priceRange`. "All systems normal" in the footer (`footer.json` `status`) is hard-coded: link it to a real status page or drop the claim.

Domain and hosting:
- [ ] Put the real domain's DNS on Cloudflare and add the domain to the Worker. Then redirect or switch off `workers.dev` (both ways are in `docs/launch-runbook.md`).
- [ ] Remove `X-Robots-Tag: noindex` from `public/_headers`, put the `Sitemap:` line back in `robots.txt` (`src/pages/robots.txt.ts` says how; left out while every page is noindex), and set `SITE_URL` to the real domain (environment, or the default in `astro.config.mjs`).
- [ ] Markdown copies (`/services.md` and the rest): when `noindex` comes off, give each a `Link: <page>; rel="canonical"` header (decided 2 Nov 2026), written per copy by `scripts/headers.mjs`.
- [ ] Cloudflare zone: Always Use HTTPS, TLS 1.2 minimum, HTTP/3, Early Hints, Bot Fight Mode (it sets the `__cf_bm` cookie: change "The site sets no cookies" on the privacy page as `docs/privacy-and-accessibility-2026-11-03.md` item 17 says). Auto Minify and Rocket Loader stay off (they break the hashes and the CSP). Then check the 103 arrives with `curl -I --http2`. Check the Browser Integrity Check doesn't block agents reading `llms.txt` and the `.md` copies (on `workers.dev` it 403s a client with no user agent of its own).
- [ ] HTTPS: turn on Always Use HTTPS on the real domain's zone (SSL/TLS > Edge Certificates). Then, unless the Worker redirects `workers.dev` (option B in the runbook), set `run_worker_first` back to `["/api/*", "/404"]` in `wrangler.jsonc` and drop the http-to-https lines in `worker/index.js`. Today every request runs the Worker so it can send `http://` to `https://` (`workers.dev` has no such setting), and each one counts against the free plan's 100,000 Worker requests a day. Then check plain `http://` still redirects.
- [ ] HSTS: add `includeSubDomains; preload` once every subdomain is HTTPS, then submit to hstspreload.org.
- [ ] Web Analytics: the beacon token in `core.js` was registered for the old `pages.dev` host. Add the real domain (and `uplink-site.johnoreilly.workers.dev` until then) to that site in Cloudflare, or make a new site and swap the token.
- [ ] Search Console: verify the domain, submit the sitemap.
- [ ] `FAQPage` markup stays but gives no rich result (Google shows it only for government and health sites).
