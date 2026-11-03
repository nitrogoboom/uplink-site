# Notes: open items

Things to fix, polish or decide. Remove a line when it's done; add new ones as they come up.

## Production readiness (3 Nov 2026, no domain needed; talk in `conversation-2026-11-03.md`)
- [ ] Browsers: run the CI browser check in Firefox and WebKit too, not just Chromium.
- [ ] Browsers: write the support list (`browserslist`), and check `:has()`, `@view-transition`, `text-wrap` and Trusted Types fall back cleanly where missing.
- [ ] Mobile: one pass on a real iPhone (Safari) and a real Android (Chrome) from a PR preview link.
- [ ] GitHub: protect `main` (PR required, `build` must pass); today every push deploys to live.
- [ ] Cloudflare: company account with 2FA; API token scoped to this one Worker.
- [ ] Uptime check from outside Cloudflare, pointed at the `workers.dev` address for now.
- [ ] Finish the by-hand parts of the baseline, `docs/releases/2026-11-03.md` (browsers and phones, keyboard, screen reader, contrast, motion, forms, HTML validator). The scripted parts pass.
- [ ] Have `knowledge/Ontario Website Accessibility Rules.md` checked against the W3C WCAG 2.0 text (it was written from memory).
- [ ] Decide later: move the browser checks (`tools/verify_*.py`) to Playwright Test on Node, so CI needs no Python.

## Home fixes (review 2 Nov 2026, GPT review checked against the code)
- [ ] Booking toast says "We will email you within one business day" (`core.js`), but nothing is sent. Fixed by PR #38 (shows success only once the server accepts); left as is on `main` to avoid a conflict while forms are paused.

## Code (whole-project review 2 Nov 2026)
- [ ] Small, left as they are: `box()` is defined three times (`gen_hq.py`, `gen_tower.py`, `gen_office.py`), each a little different; `ServiceCard`'s `on`/`first`/`heading` props have one caller.

## Page structure
- [ ] Plans or pricing section: dropped with the placeholder table. Add one back to Services once real pricing exists.
- [ ] Home "Our work" row is a placeholder for that spot until its real section is decided.
- [ ] Contact: "Open a ticket" and "Start a remote session" go to the coming-soon page.
- [ ] Desktop gaps: Home and About done (About 3 Nov 2026: "How we work" is a short band at its own height, Team one screen on desktop and its own height below). Rule agreed 2 Nov 2026: on desktop a section is one screen (`.fold`) when it has enough to fill it, and a short band keeps its own height; below desktop a section takes its own height, except `.fold-always` (the hero and each page's first screen). Next: Contact (Support), Services (Faq) and Work (Projects), which still carry `fold-always` past their first screen. Classes in `src/styles/layout.css`, desktop rules in `fold.css`.

## Drawings
- [ ] Hero on phones with reduced motion (and without script): they still show `office-compact.svg`, the older plan. Make the still from the same scene (`render('phone')` with the animation off) when the hero drawing is final.
- [ ] Grow world: tune on a real iPhone and Android phone. Timing is in `home.js` (`LEAD`, `ZOOM` and the phase points) and `--grow-run` in `grow.css` (screens of scroll per level, which `home.js` reads).
- [ ] Grow world on desktop: at level 3 it leaves empty space either side of the left column. Fine for now; a wider level 3 layout would need its own phone cut.

## Look and feel
- [ ] Small, left as they are: Home-only hero rules in the shared `compact-cuts.css`; the services observer (`home.js`) also runs at 700px and up, where its dots are hidden; JSON-LD is pretty-printed (about 20 B gzipped).

## Screen readers (Home done 2 Nov 2026, `docs/screen-reader-home.md`)
- [ ] Same pass on the other pages: Services, each service page, Work, each case study, About, Contact, soon and 404. Card links: `<Pause />` after the title, category chips `aria-hidden`, a link's name stays its visible text, " · " through `<Sep />`, plain picture descriptions, then read the page out (`aria_snapshot` in Playwright) and write it up like `docs/screen-reader-home.md`.

## Checks to repeat
- [ ] PageSpeed mobile: confirm LCP is the hero text (about 1.1 s locally) with `python tools/pagespeed.py`. Phones with reduced motion still paint the picture as LCP.
- [ ] W3C HTML checker reports 8 CSS errors per page, all the page-transition rules (`@view-transition` and the rest), which the checker doesn't know yet. Valid CSS; recheck when it catches up.

## Before going live
Forms and content:
- [ ] Forms: PAUSED (2 Nov 2026). [PR #38](https://github.com/nitrogoboom/uplink-site/pull/38) (`claude/sweet-chaum-b12ca0`) has the Worker endpoint, Turnstile, honeypot and rate limit, with email as a stub; leave it open, unmerged. To pick it up: set the Worker secrets `TURNSTILE_SECRET` (Turnstile widget "uplink-site forms") and `FORM_TO`, put a sending domain on Cloudflare, then wire the send step.
- [ ] Forms (decided 2 Nov 2026: build now, email via Cloudflare Email Service): contact, book-a-call and newsletter send nothing yet. Without script, the contact and newsletter forms go to `/soon` and their fields have no `name`; give the fields names back with the endpoint. Plan: a Worker endpoint (same origin, so `form-action 'self'` holds) with Turnstile, a honeypot field and a rate limit. Email Service sends from a domain on a Cloudflare zone, and `workers.dev` is not one, so the sending domain (the real one, or any domain moved to Cloudflare) comes first. CSP then needs `challenges.cloudflare.com` in `script-src` and `frame-src`, and the Trusted Types policy in `core.js` must allow Turnstile's script.
- [ ] Service and project copy (how it works, questions, case studies) is sample text, and stays sample (decided 2 Nov 2026) until there is a real client. Then rewrite with real details (each entry's `page` field in `src/content/`).
- [ ] Copy to confirm: VoIP wording ("Phones & Teams calling" section, card and footer); backup drawing subline "a separate, locked site" (`gen_backup.py`); network label VOIP PHONES "calls over your network" (`gen_network.py`); hero phone line `lead-short` in `Hero.astro`; the six grow tags (`tags` in `Grow.astro`); the "Windows 10 support has ended" hero card (slot for the first real article).
- [ ] About 24 links per page go to `soon` (client portal, remote support, status, careers, blog, Windows 10 guide, security checklist, privacy, terms, accessibility, five social links). Kept on `soon` while this is a mockup (decided 2 Nov 2026); at launch each needs a page or no link. Add `Français` back with a real French page.
- [ ] Once there is real content: drawn avatars for the team cards instead of initials; a spot for client quotes on Home or Work.
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
- [ ] `FAQPage` markup stays but gives no rich result (Google shows it only for government and health sites).
