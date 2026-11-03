# Notes: open items

Things to fix, polish or decide. Remove a line when it's done; add new ones as they come up.

## Home fixes (review 2 Nov 2026, GPT review checked against the code)
- [ ] Booking toast says "We will email you within one business day" (`core.js`), but nothing is sent. Fixed by PR #38 (shows success only once the server accepts); left as is on `main` to avoid a conflict while forms are paused.
- [ ] Hero motion never stops (cloud every 3.2s, phone captions every 2.2s, pulses). WCAG 2.2.2 asks for a pause control; reduced motion alone may not satisfy an audit. Decide: a pause button, or static captions. The phone drawing's tap-to-advance (`svg` click in `home.js`) has no keyboard equal; fine while it is only a bonus.
- [ ] Hero "Main menu" repeats the header tabs. Decided 2 Nov 2026: it becomes service links (cyber security, help desk and the like) in a later pass; then drop or rename its `<nav>` landmark so screen readers list one main menu.

## Page structure
- [ ] Services grid: seven cards four across leaves one empty slot on desktop. Decide: a check-up card in the eighth slot, or a different column count.
- [ ] Plans or pricing section: dropped with the placeholder table. Add one back to Services once real pricing exists.
- [ ] Home "Our work" row is a placeholder for that spot until its real section is decided.
- [ ] Contact: "Open a ticket" and "Start a remote session" go to the coming-soon page; the hours card's "1 day, reply within" needs a label that says it is for new messages (About's 12 min is the client help desk).
- [ ] Desktop gaps (styling, next up): sections with `fold` fill a whole screen and centre their content, so short ones leave big empty bands above and below (Home after the grow section, About around "How we work" and before Team). Decide per section whether it should fill the screen or just take its own height (`.fold` in `src/styles/layout.css`, desktop rules in `fold.css`).
- [ ] Ideas, not decided: drawn avatars for the team cards instead of initials; a spot for client quotes somewhere on Home or Work.

## Drawings
- [ ] Hero on phones with reduced motion (and without script): they still show `office-compact.svg`, the older plan. Make the still from the same scene (`render('phone')` with the animation off) when the hero drawing is final.
- [ ] Grow world: tune on a real iPhone and Android phone. Timing is in `home.js` (`LEAD`, `RUN`, `ZOOM` and the phase points); `RUN` must match the `2.5` in `grow.css` (1 + 3 x RUN; shortened from 3.7 on 2 Nov 2026).
- [ ] Grow world on desktop: at level 3 it leaves empty space either side of the left column. Fine for now; a wider level 3 layout would need its own phone cut.

## Look and feel
- [ ] Header and phone bar blur: the glass is 88% / 92% solid, so the 14px `backdrop-filter` barely shows, but it is redrawn on every scroll frame (costly on low-end Android). Decide: drop the blur and keep the solid colour, or keep it.
- [ ] Safe area: `header.css` sets `top: env(safe-area-inset-top)` on the sticky header, but `scroll-padding-top` (`base.css`, `fold.css`) doesn't add the inset. Only shows in landscape or from the home screen. Check on an iPhone.
- [ ] Desktop zoom barely enlarges text: the root font follows the window (`tokens.css`, `clamp(14px, min(1.1111vw, 1.7778vh), 40px)`), so at 110-125% zoom the text grows about 9%. 150% and up behaves normally, so WCAG 1.4.4 passes. A floor of `1rem` would fix zoom but makes text up to 14% bigger at 100% on laptops under 1440 x 900, which can push one-screen sections past the screen. Decide, then check with `verify_styles.py`.
- [ ] Small, left as they are: Home-only hero rules in the shared `compact-cuts.css`; the services observer (`home.js`) also runs at 700px and up, where its dots are hidden; JSON-LD is pretty-printed (about 20 B gzipped).

## Screen readers (Home done 2 Nov 2026, `screen-reader-home.md`)
- [ ] Same pass on the other pages: Services, each service page, Work, each case study, About, Contact, soon and 404. Card links: `<Pause />` after the title, category chips `aria-hidden`, a link's name stays its visible text, " · " through `<Sep />`, plain picture descriptions, then read the page out (`aria_snapshot` in Playwright) and write it up like `screen-reader-home.md`.

## Checks to repeat
- [ ] PageSpeed mobile: confirm LCP is the hero text (about 1.1 s locally) with `python tools/pagespeed.py`. Phones with reduced motion still paint the picture as LCP.
- [ ] W3C HTML checker reports 8 CSS errors per page, all the page-transition rules (`@view-transition` and the rest), which the checker doesn't know yet. Valid CSS; recheck when it catches up.

## Before going live
Forms and content:
- [ ] Forms: PAUSED (2 Nov 2026). [PR #38](https://github.com/nitrogoboom/uplink-site/pull/38) (`claude/sweet-chaum-b12ca0`) has the Worker endpoint, Turnstile, honeypot and rate limit, with email as a stub; leave it open, unmerged. To pick it up: set the Worker secrets `TURNSTILE_SECRET` (Turnstile widget "uplink-site forms") and `FORM_TO`, put a sending domain on Cloudflare, then wire the send step.
- [ ] Forms (decided 2 Nov 2026: build now, email via Cloudflare Email Service): contact, book-a-call and newsletter send nothing yet. Without script, the contact and newsletter forms go to `/soon` and their fields have no `name`; give the fields names back with the endpoint. Plan: a Worker endpoint (same origin, so `form-action 'self'` holds) with Turnstile, a honeypot field and a rate limit. Email Service sends from a domain on a Cloudflare zone, and `workers.dev` is not one, so the sending domain (the real one, or any domain moved to Cloudflare) comes first. CSP then needs `challenges.cloudflare.com` in `script-src` and `frame-src`, and the Trusted Types policy in `core.js` must allow Turnstile's script.
- [ ] Service and project copy (how it works, questions, case studies) is sample text, and stays sample (decided 2 Nov 2026) until there is a real client. Then rewrite with real details (each entry's `page` field in `src/content/`).
- [ ] Copy to confirm: VoIP wording ("Phones & Teams calling" section, card and footer); backup drawing subline "a separate, locked site" (`gen_backup.py`); network label VOIP PHONES "calls over your network" (`gen_network.py`); hero phone line `lead-short` in `Hero.astro`; the six grow tags (`tags` in `Grow.astro`); the "Windows 10 support has ended" hero card (slot for the first real article).
- [ ] About 25 links per page go to `soon` (client portal, remote support, status, careers, blog, Windows 10 guide, security checklist, privacy, terms, accessibility, five social links). Kept on `soon` while this is a mockup (decided 2 Nov 2026); at launch each needs a page or no link. Add `Français` back with a real French page.
- [ ] Business JSON-LD with real phone, address, hours, `logo`, `image`, `sameAs`, `priceRange`. "All systems normal" in the footer (`footer.json` `status`) is hard-coded: link it to a real status page or drop the claim.

Domain and hosting:
- [ ] Put the real domain's DNS on Cloudflare, add the domain to the Worker, redirect `workers.dev` to it.
- [ ] Remove `X-Robots-Tag: noindex` from `public/_headers` and set `SITE_URL` to the real domain (environment, or the default in `astro.config.mjs`).
- [ ] Markdown copies (`/services.md` and the rest): when `noindex` comes off, give each a `Link: <page>; rel="canonical"` header (decided 2 Nov 2026), written per copy by `scripts/headers.mjs`.
- [ ] Cloudflare zone: Always Use HTTPS, TLS 1.2 minimum, HTTP/3, Early Hints, Bot Fight Mode. Auto Minify and Rocket Loader stay off (they break the hashes and the CSP). Then check the 103 arrives with `curl -I --http2`.
- [ ] HSTS: add `includeSubDomains; preload` once every subdomain is HTTPS, then submit to hstspreload.org.
- [ ] CSP reporting: `Reporting-Endpoints` + `report-to` so blocked scripts on real visitors get seen.
- [ ] Web Analytics: the beacon token in `core.js` was registered for the old `pages.dev` host. Add the real domain (and `uplink-site.johnoreilly.workers.dev` until then) to that site in Cloudflare, or make a new site and swap the token.
- [ ] Search Console: verify the domain, submit the sitemap.
- [ ] `work/[slug]` JSON-LD type: `Article` today; `CreativeWork` or `WebPage` may fit a case study better. `FAQPage` markup stays but gives no rich result.
