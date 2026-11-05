# Notes: open items

Things to fix, polish or decide. Remove a line when it's done; add new ones as they come up.

## Production readiness (3 Nov 2026, no domain needed; talk in `conversation-2026-11-03.md`)
- [ ] Browsers: write the support list (`browserslist`), and check `:has()`, `@view-transition`, `text-wrap` and Trusted Types fall back cleanly where missing.
- [ ] GitHub: protect `main` (PR required, `build` must pass); today every push deploys to live. While there, turn on secret scanning and push protection (Settings > Code security) if the plan offers them.
- [ ] Cloudflare: company account with 2FA; API token scoped to this one Worker.
- [ ] Uptime check from outside Cloudflare, pointed at the `workers.dev` address for now.
- [ ] Secrets: give each one an owner and a rotation date (`docs/secrets.md` lists them all, with where each lives).
- [ ] Watch the reports: after each deploy, look at the Workers logs (Cloudflare > Workers > uplink-site > Logs) for `/api/report` lines: script errors and CSP blocks from real visitors.
- [ ] Finish the baseline in `docs/releases/2026-11-03.md`: the 15-minute hand part (real iPhone and Android, a 5-minute NVDA listen, the judgement checks). The machine part, W3C included, passes.
- [ ] Have the WCAG list in `knowledge/Ontario Website Accessibility Rules.md` checked against the W3C WCAG 2.0 text (written from memory; the rest was checked against O. Reg. 191/11 on 3 Nov 2026).
- [ ] Decide later: move the browser checks (`tools/verify_*.py`) to Playwright Test on Node, so CI needs no Python.
- [ ] Decide later, on hold: who edits copy. Today it's Claude editing on your behalf about 90% of the time, which suits copy as JSON and Markdown in git (`src/content/`, `src/data/`): every change is reviewed, checked by CI and can be undone. A CMS only earns its place if staff will edit the site themselves.
- [ ] Decide later, on hold: if the real company has a site today, map its old addresses to the new ones (redirects) before the domain moves.

## Privacy and accessibility pages (3 Nov 2026; sources and the full list in `docs/privacy-and-accessibility-2026-11-03.md`)
- [ ] Real inboxes for `privacy@`, `accessibility@` and `security@` (placeholders in `src/data/footer.json`, `inboxes`), and a postal code for the office address.
- [ ] Name the Privacy Officer (the page gives the title only, which PIPEDA allows).
- [ ] Before launch, the accessibility page needs back two short lines Ontario requires (O. Reg. 191/11; cut 3 Nov 2026 as too much for the mockup): what happens after someone sends feedback (s. 80.50(2), e.g. reply times) and that accessible formats are available on request at no cost (s. 12(3)). Sources in `docs/privacy-and-accessibility-2026-11-03.md`.
- [ ] "Few people at Uplink can open the inbox" (privacy page, "How we protect it") is an assumption: confirm or cut.
- [ ] AODA compliance report: under 50 staff, but organizations with 20 or more staff in Ontario file one every three years (from memory, unverified; the site says 22 technicians). Check whether it applies.

## Home fixes (review 2 Nov 2026, GPT review checked against the code)
- [ ] Booking toast says "We will email you within one business day" (`core.js`), but nothing is sent. Fixed by PR #38 (shows success only once the server accepts); left as is on `main` to avoid a conflict while forms are paused.

## Code (whole-project review 2 Nov 2026)
- [ ] Small, left as they are: `box()` is defined twice (`gen_hq.py`, `gen_office.py`), each a little different; `ServiceCard`'s `on`/`first`/`heading` props have one caller.

## Page structure
- [ ] Plans or pricing section: dropped with the placeholder table. Add one back to Services once real pricing exists.
- [ ] Home "Our work" row is a placeholder for that spot until its real section is decided.
- [ ] Home "We grow with you" (built 4 Nov 2026 from the round 8 mockups, `editing-room/grow-options/`): one world that grows in six steps by where people work, played by `src/scripts/grow.js`; copy in `src/data/grow.json`; drawing `tools/gen_grow.py`. Open: final copy and team sizes (my guesses), people drawn as more than blocks, a real iPhone and Android pass (timing: `DWELL`, `RISK_AT`, `FIX_AT` in `grow.js`).
- [ ] Contact: "Open a ticket" and "Start a remote session" go to the coming-soon page.
- [ ] Desktop gaps: Home and About done (About 3 Nov 2026: "How we work" is a short band at its own height, Team one screen on desktop and its own height below). Rule agreed 2 Nov 2026: on desktop a section is one screen (`.fold`) when it has enough to fill it, and a short band keeps its own height; below desktop a section takes its own height, except `.fold-always` (the hero and each page's first screen). Next: Contact (Support), Services (Faq) and Work (Projects), which still carry `fold-always` past their first screen. Classes in `src/styles/layout.css`, desktop rules in `fold.css`.

- [ ] Home wheel grid (4 Nov 2026, `docs/fold-wheel-grid-2026-11-04.md`): folds are whole 100px wheel steps on desktop. Open: Page Down still moves 87.5% of a screen and leaves the grid (a small key handler could step one fold); the other pages' folds could take the same grid once their desktop gaps are done.

## Drawings
- [ ] 404 page: a three-panel heist comic, draft in `editing-room/404-comic/` (branch `404-comic-draft`). Panels 2 and 3 work; panel 1 (the van) needs a rethink, and the punchline balloon clips the "t" in "typed".
- [ ] Hero on phones with reduced motion (and without script): they still show `office-compact.svg`, the older plan. Make the still from the same scene (`render('phone')` with the animation off) when the hero drawing is final.

## Look and feel
- [ ] Footer on phones (5 Nov 2026): the tabs are about 540 px above the links they open (the map sits between), and only 3½ of 6 tabs fit. Mockups in `editing-room/footer-phone/` (round 1: A links first, B map beside the title (my pick), C open in place). Decide, then build it in `footer.css` and `footer.js`, phones only.
- [ ] Small, left as they are: Home-only hero rules in the shared `compact-cuts.css`; the services observer (`home.js`) also runs at 700px and up, where its dots are hidden; JSON-LD is pretty-printed (about 20 B gzipped).

## Checks to repeat
- [ ] PageSpeed mobile: confirm LCP is the hero text (about 1.1 s locally) with `python tools/pagespeed.py`. Phones with reduced motion still paint the picture as LCP.

## Before going live
Forms and content:
- [ ] Forms: PAUSED (2 Nov 2026). [PR #38](https://github.com/nitrogoboom/uplink-site/pull/38) (`claude/sweet-chaum-b12ca0`) has the Worker endpoint, Turnstile, honeypot and rate limit, with email as a stub; leave it open, unmerged. To pick it up: set the Worker secrets `TURNSTILE_SECRET` (Turnstile widget "uplink-site forms") and `FORM_TO`, put a sending domain on Cloudflare, then wire the send step.
- [ ] Forms PR #38 and `main` now both have `worker/index.js` (`main` has `/api/report`): merge by keeping both routes; `wrangler.jsonc` already has `main` and `run_worker_first`, and its `ratelimits` keeps both entries (`REPORTS` 1002 here, `FORMS` 1001 there). `run_worker_first` on `main` is `true` (every request; the HTTPS item under "Domain and hosting"), so PR #38's `["/api/*"]` must not win the merge.
- [ ] When forms send: delete the "send nothing yet" lines and the `FORMS-LIVE` comments in `src/data/privacy.md` and `accessibility.md`; link the privacy page beside each Send button; give the newsletter a CASL consent line ("One email a month from Uplink Technology. Unsubscribe any time. Privacy."); decide what sends the newsletter (a mailing service is another processor to name) and where consent records are kept; decide on Cloudflare Email Service's "Email preview" (keeps each sent message about 7 days; the privacy page says so).
- [ ] Forms (decided 2 Nov 2026: build now, email via Cloudflare Email Service): contact, book-a-call and newsletter send nothing yet. Without script, the contact and newsletter forms go to `/soon` and their fields have no `name`; give the fields names back with the endpoint. Plan: a Worker endpoint (same origin, so `form-action 'self'` holds) with Turnstile, a honeypot field and a rate limit. Email Service sends from a domain on a Cloudflare zone, and `workers.dev` is not one, so the sending domain (the real one, or any domain moved to Cloudflare) comes first. CSP then needs `challenges.cloudflare.com` in `script-src` and `frame-src`, and the Trusted Types policy in `core.js` must allow Turnstile's script.
- [ ] Service and project copy (how it works, questions, case studies) is sample text, and stays sample (decided 2 Nov 2026) until there is a real client. Then rewrite with real details (each entry's `page` field in `src/content/`).
- [ ] Copy to confirm: VoIP wording ("Phones & Teams calling" section, card and footer); backup drawing subline "a separate, locked site" (`gen_backup.py`); network label VOIP PHONES "calls over your network" (`gen_network.py`); hero phone line `lead-short` in `Hero.astro`; the six grow tags (`tags` in `Grow.astro`); the "Windows 10 support has ended" hero card (slot for the first real article).
- [ ] About 24 links per page go to `soon` (client portal, remote support, status, careers, blog, Windows 10 guide, security checklist, terms, five social links; privacy and accessibility have pages since 3 Nov 2026). Kept on `soon` while this is a mockup (decided 2 Nov 2026); at launch each needs a page or no link. Add `Français` back with a real French page.
- [ ] Once there is real content: drawn avatars for the team cards instead of initials; a spot for client quotes on Home or Work.
- [ ] Business JSON-LD with real phone, address, hours, `logo`, `image`, `sameAs`, `priceRange`. "All systems normal" in the footer (`footer.json` `status`) is hard-coded: link it to a real status page or drop the claim.

Domain and hosting:
- [ ] Put the real domain's DNS on Cloudflare, add the domain to the Worker, redirect `workers.dev` to it.
- [ ] Remove `X-Robots-Tag: noindex` from `public/_headers`, put the `Sitemap:` line back in `robots.txt` (`src/pages/robots.txt.ts` says how; left out while every page is noindex), and set `SITE_URL` to the real domain (environment, or the default in `astro.config.mjs`).
- [ ] Markdown copies (`/services.md` and the rest): when `noindex` comes off, give each a `Link: <page>; rel="canonical"` header (decided 2 Nov 2026), written per copy by `scripts/headers.mjs`.
- [ ] Cloudflare zone: Always Use HTTPS, TLS 1.2 minimum, HTTP/3, Early Hints, Bot Fight Mode (it sets the `__cf_bm` cookie: change "The site sets no cookies" on the privacy page as `docs/privacy-and-accessibility-2026-11-03.md` item 17 says). Auto Minify and Rocket Loader stay off (they break the hashes and the CSP). Then check the 103 arrives with `curl -I --http2`. Check the Browser Integrity Check doesn't block agents reading `llms.txt` and the `.md` copies (on `workers.dev` it 403s Python's urllib).
- [ ] HTTPS: turn on Always Use HTTPS on the real domain's zone (SSL/TLS > Edge Certificates), then set `run_worker_first` back to `["/api/*", "/404"]` in `wrangler.jsonc` and drop the http-to-https lines in `worker/index.js`. Today every request runs the Worker so it can send `http://` to `https://` (`workers.dev` has no such setting), and each one counts against the free plan's 100,000 Worker requests a day. Then check plain `http://` still redirects.
- [ ] HSTS: add `includeSubDomains; preload` once every subdomain is HTTPS, then submit to hstspreload.org.
- [ ] Web Analytics: the beacon token in `core.js` was registered for the old `pages.dev` host. Add the real domain (and `uplink-site.johnoreilly.workers.dev` until then) to that site in Cloudflare, or make a new site and swap the token.
- [ ] Search Console: verify the domain, submit the sitemap.
- [ ] `FAQPage` markup stays but gives no rich result (Google shows it only for government and health sites).
