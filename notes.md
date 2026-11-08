# Notes: open items

Things to fix, polish or decide. Remove a line when it's done; add new ones as they come up.

## Review of November 7, 2026
- [ ] Work through `docs/review-2026-11-07.md` (about 90 verified items, in batches; status lives in that file).
- [ ] Resume the paused review work (November 7, 2026, evening): three batches wait on `wip/js`, `wip/hosting` and `wip/phase4`. Where each stands and what's next: "Paused" in `docs/review-2026-11-07.md`. Delete each `wip/` branch once its PR merges.
- [ ] Firefox 144+ and Safari 26.2+ (review J8, J15, November 7, 2026; checked in Chromium only): with the page's scripts blocked (DevTools request blocking on `/_astro/*.js`), the header's gear opens Settings, Esc and its close button shut it, and focus goes back to the gear. A click on the backdrop shuts it too where the browser has `closedby` (Chromium does; check whether each of Firefox and Safari does). With script, a double-click on the gear leaves Settings open (B12). In Safari before 26.2 (no `scrollend`), on Home's phone services row, press Next, swipe before the slide ends, then press Next again: it steps from the card showing. Older browsers without `commandfor` can't open Settings until `core.js` runs, as before.
- [ ] Real Android phone: check the "Fallback Roboto" faces in `src/styles/fonts.css` (review B5, November 7, 2026). Their sizes were measured from Google Fonts' Roboto and checked in Chromium on Linux, which has no Roboto installed, so whether Android's Chrome finds `local('Roboto')` and `local('Roboto Bold')` (its Roboto may be one variable font) is unproven. Load the 404 page on a slow connection and watch for text jumping when Barlow arrives.

## Outside review (6 Nov 2026, independent session, 7.5/10)

Quick, visible:
- [ ] Phone hero (opens on the furnished room since 6 Nov 2026, `PHONE_AHEAD` in `tools/gen_office.py`): on a slow phone (150 ms, 1.6 Mbps, CPU x4) the stage is still empty for about 0.5 s between first paint and the drawing arriving (fetched by `home.js`). Closing it means inlining the phone cut in Home's HTML (about 14 KB gzipped on every Home load); a still `<img>` underneath would become the LCP. Check on a real phone first.
- [ ] Hero with pause already on from an earlier page: the build freezes on its first frame (on phones the furnished room with no network or cloud, and the caption lines don't draw; desktop too). Fix: when the drawing goes in while paused, finish its build animations.

Design, nice to have:
- [ ] Desktop: the small secondary text under hero items and footer lines is low-contrast (it passes AA). Raise its size a step or its colour toward `--c-text`.
- [ ] Home services row mixes three tall cards with four short tiles; the tall ones are mostly empty. Even out the row, or give the tall cards their drawing.
- [ ] Trusted Types policy passes every string (`createHTML: (s) => s` in `core.js`). Fix: only accept the site's own drawings (for example, a string that starts with `<svg` from a same-origin `/assets/img/` fetch), and say so in the docs.

Rule from now on:
- [ ] Freeze the tooling: no new checks or docs until real content arrives. Spend the time on content, forms (PR #38) and launch steps.

## Production readiness (3 Nov 2026, no domain needed; talk in `docs/history/conversation-2026-11-03.md`)
- [ ] Browsers: write the support list (`browserslist`), and check `:has()`, `@view-transition` and `text-wrap` fall back cleanly where missing. (Trusted Types already does: `core.js` checks for `window.trustedTypes`.)
- [ ] GitHub environments (made November 6, 2026): `production` (deploys from `main` only) and `preview` are empty. Put `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in `production`, and a separate preview token plus the account ID in `preview`. Then switch `site.yml` from `cloudflare` to them (the `build` job's secrets check can't use `production` on a pull request) and delete `cloudflare`.
- [ ] The repository is public "for now" (November 6, 2026). Making it private again turns off the rulesets unless the plan is GitHub Pro.
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
- [ ] Open PR #76 (clean up old pull request previews on Cloudflare every 3 days): its build passed; it waits for the owner's merge, then a one-preview delete test.
- [ ] Small, left as they are: `gen_campus.py` keeps its own `box()` (class-only faces that `footer.css` colours; every other generator draws through `isogen.box()`, review C11, November 7, 2026); `ServiceCard`'s `on`/`first`/`heading` props have one caller.
- [ ] The styles check (`npm run verify:styles`) now and then reports a `div.container`'s side margins as 0 instead of 440px at 3440 on `/` or `/work`, even comparing a build with itself: the Chrome quirk the comment in `service-page.css` describes, on other pages. Seen with the old Python check and the Node one alike (November 6, 2026). Rerun it before you trust such a line.
- [ ] Real Safari: Playwright's WebKit (27.2) refuses a style of its own for every `<select>` under our CSP (one each, even on a bare page with nothing of ours; Chromium doesn't), so twice a page from the booking dialog's dropdowns. The release audit expects that many and the Worker drops that report (November 6, 2026). Open: look at Safari's console on a Mac (Develop menu) for "Refused to apply a stylesheet"; if it's there too, report it to WebKit (bugs.webkit.org).

## Page structure
- [ ] Plans or pricing section: dropped with the placeholder table. Add one back to Services once real pricing exists.
- [ ] Home "Our work" row is a placeholder for that spot until its real section is decided.
- [ ] Home "We grow with you" (built 4 Nov 2026 from the round 8 mockups, `editing-room/grow-options/`): one world that grows in six steps by where people work, played by `src/scripts/grow.js`; copy in `src/data/grow.json`; drawing `tools/gen_grow.py`. Open: final copy and team sizes (my guesses), people drawn as more than blocks, a real iPhone and Android pass (timing: `DWELL`, `RISK_AT`, `FIX_AT` in `grow.js`). Desktop: the steps are a list in the left column (option C, November 6, 2026, mockup in `editing-room/grow-list/`).
- [ ] Contact: "Open a ticket" and "Start a remote session" go to the coming-soon page.
- [ ] Desktop gaps: Home and About done (About 3 Nov 2026: "How we work" is a short band at its own height, Team one screen on desktop and its own height below). Rule agreed 2 Nov 2026: on desktop a section is one screen (`.fold`) when it has enough to fill it, and a short band keeps its own height; below desktop a section takes its own height, except `.fold-always` (the hero and each page's first screen). Next: Contact (Support) and Services (Faq), which still carry `fold-always` past their first screen. (Work's Projects is its first screen, so `fold-always` is right there.) Classes in `src/styles/layout.css`, desktop rules in `fold.css`.

- [ ] Home wheel grid (4 Nov 2026, `docs/fold-wheel-grid-2026-11-04.md`): folds are whole 100px wheel steps on desktop. Open: Page Down still moves 87.5% of a screen and leaves the grid (a small key handler could step one fold); the other pages' folds could take the same grid once their desktop gaps are done.

## Drawings
- [ ] 404 page: a three-panel heist comic, draft in `editing-room/404-comic/` (branch `404-comic-draft`). Panels 2 and 3 work; panel 1 (the van) needs a rethink, and the punchline balloon clips the "t" in "typed".

## Look and feel
- [ ] Footer on `<details name="footer">` (layout plan phase 5, November 7, 2026): six rows under 700 px, tiles above. Rows ease open and shut with `::details-content` and `interpolate-size` (Chrome only; at once elsewhere), and the browser's own scroll anchoring holds a tapped row still. Open: try it on a real iPhone (Safari 18.4+ should get the tiles on an iPad or Mac) and Android, including a row shutting while the page is still scrolling (iOS momentum), and in Firefox ESR 140 (rows on every screen, no map).
- [ ] Sideways scroll with text at 200% (found 6 Nov 2026, also on the build before that day's changes): Firefox at 390 wide, Home's services row (`.svc-big`) makes the page 458px wide; Edge at 320 wide, the Grow stage (`.grow-stage`) ends at 328px (8px). The text check (`verify:text`, retired with the Settings text size on November 7, 2026) ran Chromium only and not at 320, so it missed both. Check both again at 200% zoom with the zoom check (layout plan, phase 4).
- [ ] Project cards on phones (6 Nov 2026): rows, option A from `editing-room/work-phone/` (`.card--project` in `surfaces.css`, `ProjectCard.astro`). Home's "Setups we built and still run" now fits one screen; five of the Work page's six per screen. Open: a look on a real iPhone and Android.
- [ ] Small, left as they are: Home-only hero rules in the shared `compact-cuts.css`; the services observer (`home.js`) also runs at 700px and up, where its dots are hidden; JSON-LD is pretty-printed (about 20 B gzipped).

## Checks to repeat
- [ ] PageSpeed mobile: confirm LCP is the hero text (about 1.1 s locally) with `npm run pagespeed`. Reduced-motion phones now show the same scene, and the hero text stays the LCP there too (6 Nov 2026).

## Before going live
Forms and content:
- [ ] Forms: PAUSED (2 Nov 2026). [PR #38](https://github.com/nitrogoboom/uplink-site/pull/38) (`claude/sweet-chaum-b12ca0`) has the Worker endpoint, Turnstile, honeypot and rate limit, with email as a stub; leave it open, unmerged. To pick it up: set the Worker secrets `TURNSTILE_SECRET` (Turnstile widget "uplink-site forms") and `FORM_TO`, put a sending domain on Cloudflare, then wire the send step.
- [ ] Forms PR #38 now conflicts with `main` (GitHub, 5 Nov 2026). Both have `worker/index.js` (`main` has `/api/report`): merge by keeping both routes; `wrangler.jsonc` already has `main` and `run_worker_first`, and its `ratelimits` keeps both entries (`REPORTS` 1002 here, `FORMS` 1001 there). `run_worker_first` on `main` is `["/api/*", "/404"]` with `not_found_handling: "none"` (the 404 page comes from the Worker), so PR #38's `["/api/*"]` and `404-page` must not win the merge.
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
- [ ] HTTPS: turn on Always Use HTTPS on the real domain's zone (SSL/TLS > Edge Certificates), then check that plain `http://` to a page redirects (`npm run smoke -- https://DOMAIN --launch` does). On `workers.dev`, only the Worker's own addresses redirect (November 7, 2026, review H1): browsers never ask a `.dev` host over `http://`.
- [ ] HSTS: add `includeSubDomains; preload` once every subdomain is HTTPS, then submit to hstspreload.org.
- [ ] Web Analytics: the site in Cloudflare was set up for the old `pages.dev` host, but data already arrives from `uplink-site.johnoreilly.workers.dev` under the token in `core.js` (checked 6 Nov 2026). At launch, add the real domain to that site (or make a new site and swap the token), and drop the "old pages.dev host" remarks in `core.js` and `docs/secrets.md`.
- [ ] Search Console: verify the domain, submit the sitemap.
- [ ] `FAQPage` markup stays but gives no rich result (Google shows it only for government and health sites).
