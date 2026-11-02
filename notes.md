# Notes: open items

Things to fix, polish or decide. Remove a line when it's done; add new ones as they come up.

## Astro move (plan: `review.md`)
- [ ] Cloudflare Web Analytics: the beacon token in `core.js` was registered for the old `pages.dev` host, so the beacon loads (the canonical host matches now) but Cloudflare may refuse its reports. In Web Analytics, add `uplink-site.johnoreilly.workers.dev` to that site (or make a new site and swap the token), and again for the real domain at launch.
- [ ] `work/[slug]` JSON-LD uses `Article`; `CreativeWork` or a plain `WebPage` may fit a case study better. Decide at launch.
- [ ] Sitemap `lastmod` comes from `git log`; a CI build must clone with history (`fetch-depth: 0`) or every page reads the same date.
- [ ] The real domain's DNS must be on Cloudflare before it can be put on the Worker.
- [ ] CI: build + checks on every push, deploy on `main`, preview per PR. Then `site/` leaves git.

## Page structure (agreed page by page, then built)
Merged to `main` (PR #25, 2 Nov 2026): Services is the managed IT hub (intro, seven service cards, questions, closing band); a service page is top, how it works, questions, then "where we've done this" (projects whose `services` list names it); Work is intro, filter and cards that open each case study; a case study is top and how it went, its services linking to their pages. The picker, plans table, project pop-up, industries row, next links and those pages' closing bands are gone. About is who we are (with the stats), how we work (moved from Home), team, closing band; the story timeline is gone. Home is hero, services (three tall cards, three short tiles and an "All services" tile to /services; IT strategy shows on the Services page), grow, our work (three case studies), check-up band; its how-we-work steps and stats moved to About.
- [ ] Services grid: seven cards four across leaves one empty slot on desktop. Decide: a check-up card in the eighth slot, or a different column count.
- [ ] Plans or pricing section: dropped with the placeholder table. Add one back to Services once real pricing exists.
- [ ] Home "Our work" row is a placeholder for that spot until its real section is decided.
- [ ] Contact, agreed 2 Nov 2026: structure stays (new visitors first, then "Get help now" for clients). The footer's first panel is now plain contact info ("Reach us") on every page, so the page bands are the only closing call to action. Later: "Open a ticket" and "Start a remote session" go to the coming-soon page; the hours card's "1 day, reply within" needs a label that says it is for new messages (About's 12 min is the client help desk).
- [ ] Desktop gaps (styling, next up): sections with `fold` fill a whole screen and centre their content, so short ones leave big empty bands above and below (Home after the grow section, About around "How we work" and before Team). Decide per section whether it should fill the screen or just take its own height (`.fold` in `src/styles/layout.css`, desktop rules in `fold.css`).
- [ ] Ideas, not decided: drawn avatars for the team cards instead of initials; a spot for client quotes somewhere on Home or Work.

## Drawings
- [ ] Hero on phones with reduced motion (and without script): they still show `office-compact.svg`, the older plan. The animated phone cut moved to the hero scene on 29 Oct 2026. Make the still from the same scene (`render('phone')` with the animation off) when the hero drawing is final.
- [ ] Grow world ("level up", every screen but short desktop ones): tune on a real iPhone and Android phone. Timing is in `home.js` (`LEAD`, `RUN`, `ZOOM` and the phase points); `RUN` must match the `3.7` in `grow.css`.
- [ ] Grow world on desktop: the world is taller than wide, so at level 3 it leaves empty space either side of the left column. Fine for now; a wider level 3 layout would need its own phone cut.
- [ ] Grow tags, copy to confirm: the six short tags in `Grow.astro` (`tags`) are placeholders.
- [ ] Hero on phones, copy to confirm: the short line under the headline (`lead-short` in `Hero.astro`, "We run your IT: help desk, security, cloud, network and phones.") is a placeholder. More office captions: add a label to `HERO_LABELS` and its index to `PHONE_ITEMS` in `gen_office.py`.

## Site
- [ ] Home hero: the "Windows 10 support has ended" card stays as the slot for an article; change its old title when the first real article exists.
- [ ] The Worker is live at https://uplink-site.johnoreilly.workers.dev (first deploy 28 Oct, from the `astro` branch). Compare it with the Pages site, then add the real domain to it.
- [ ] Early Hints: the `Link` header is sent, but no 103 arrives on `workers.dev` (Early Hints is a zone setting, and `workers.dev` has no zone of yours). Check again with `curl -I --http2` once the real domain is on the Worker and the zone's Early Hints setting is on.
- [ ] W3C HTML checker reports 8 CSS errors per page: all are the page-transition rules (`@view-transition`, `view-transition-name`, `::view-transition-*`), which the checker doesn't know yet. Valid CSS; recheck when the checker catches up.
- [ ] PageSpeed mobile: phones with motion now get the animated phone cut (an inline SVG, not an LCP candidate), so LCP moved from the still picture (simulated 1.7–2.0 s) to the hero text (1.1 s locally). Confirm with `python tools/pagespeed.py` after this deploys. Phones with reduced motion still paint the picture as LCP.
- [ ] PageSpeed mobile Home lists "Forced reflow: [unattributed] 36 ms" (unscored; score stays 100). Not reproducible locally (live site, beacon on and off, CPU slowed 6x), and no script reads layout at load on phones. Recheck now and then; act only if it starts naming a source.

## Top of Home (review 2 Nov 2026; captions, header button names, pulse timing, shared tab list, tab marking done)
- [ ] Header and phone bar blur: the glass is 88% / 92% solid, so the 14px `backdrop-filter` barely shows, but it is redrawn on every scroll frame (costly on low-end Android). Decide: drop the blur and keep the solid colour, or keep it.
- [ ] Safe area: `header.css` sets `top: env(safe-area-inset-top)` on the sticky header, but `scroll-padding-top` (`base.css`) doesn't add the inset. Only shows in landscape or from the home screen. Check on an iPhone.
- [ ] Hero motion never stops (cloud every 3.2s, phone captions every 2.2s, pulses). WCAG 2.2.2 asks for a pause control; reduced motion alone may not satisfy an audit. Decide whether to add one.

## Home Services (review 2 Nov 2026; card cuts, swipe, taps, hover shadow, featured-count guard done)
- [ ] Desktop zoom barely enlarges text: the root font follows the window (`tokens.css`, `clamp(14px, min(1.1111vw, 1.7778vh), 40px)`), so at 110-125% zoom the window shrinks in CSS px and the text with it (about +9%). 150% and up drops below 1100px and behaves normally, so WCAG 1.4.4 passes. A floor of `1rem` would fix zoom but makes text up to 14% bigger at 100% on laptops under 1440 x 900 (1366 x 768, 1536 x 864), which can push one-screen sections past the screen. Decide, then check with `verify_styles.py`.

## Unused and hidden weight (review 2 Nov 2026; tower SVGO, unused files, footer map on demand, dead selectors done)
- [ ] Small, left as they are: Home-only hero rules in the shared `compact-cuts.css`; the services observer (`home.js`) also runs at 700px and up, where its dots are hidden; JSON-LD is pretty-printed (about 20 B gzipped).

## Screen readers (Home done 2 Nov 2026: `Pause.astro` between a card's title and its line, `Sep.astro` for the " · " separators)
- [ ] Do the same pass on the other pages: Services, each service page, Work, each case study, About, Contact, soon and 404. Card links: `<Pause />` after the title, category chips `aria-hidden`, a link's name stays its visible text (no `aria-label` that drops words: axe fails it), " · " through `<Sep />`, plain picture descriptions, then read the page out (`aria_snapshot` in Playwright) and write it up like `screen-reader-home.md`.
- [ ] Hero "Main menu" repeats the header tabs (same five pages, same screen on tall desktops), kept for now for its look. Later: give it its own links (book a check-up, get help now, two key services), remove it, or at least drop its `<nav>` landmark so screen readers list one main menu.


## Before going live
- [ ] About 25 links per page go to `soon` (client portal, remote support, status, careers, blog, Windows 10 guide, security checklist, privacy, terms, accessibility, five social links). Each needs a page or no link. The `Français` link is gone (28 Oct 2026): it pointed `hreflang="fr"` at a placeholder. Add it back with a real French page.
- [ ] HSTS: add `includeSubDomains; preload` once every subdomain of the real domain is HTTPS, then submit to hstspreload.org. Not before.
- [ ] CSP reporting: `Reporting-Endpoints` + `report-to` so blocked scripts on real visitors get seen.
- [ ] Business JSON-LD with real phone, address, hours, `logo`, `image`, `sameAs`, `priceRange`. `FAQPage` markup stays but gives no rich result (Google limits those to government and health sites since Aug 2023).
- [ ] Search Console: verify the domain, submit the sitemap; redirect the `workers.dev` address to the real domain (a redirect rule on the zone, or `_redirects`).
- [ ] Cloudflare zone: Always Use HTTPS, TLS 1.2 minimum, HTTP/3, Early Hints, Bot Fight Mode. Auto Minify and Rocket Loader stay off (they break the hashes and the CSP).
- [ ] Site is open but kept out of search results: `X-Robots-Tag: noindex` on every response in `public/_headers` (since 27 Oct 2026; test build, placeholder company). PageSpeed's SEO score reads below 100 because of it; `tools/pagespeed.py` ignores that one audit. At launch: delete that header line and set `SITE_URL` to the real domain (environment, or the default in `astro.config.mjs`). To lock it again instead: `tools/site-lock/worker.js` (its header says how).
- [ ] Markdown copies (`/services.md` and the rest, 28 Oct 2026): when `noindex` comes off, keep them out of Google's index so they don't compete with the pages. Either `X-Robots-Tag: noindex` on `.md` files only, or a `Link: <page>; rel="canonical"` header per copy. Check which `_headers` patterns Cloudflare accepts for `*.md` first.
- [ ] The new service and project copy (how it works, questions, case studies) is sample text written to fit the placeholder company. Confirm or rewrite it with real details before launch. It lives in each entry's `page` field in `src/content/`.
- [ ] Forms are mockups: contact, book-a-call and newsletter send nothing. Left as mockups for now (26 Oct 2026). Without script, the contact and newsletter forms go to `/soon` and their fields have no `name`, so nothing typed lands in the address bar (2 Nov 2026); give the fields names back with the endpoint. When wanted: a Worker endpoint (same origin, so `form-action 'self'` holds) with Turnstile, a honeypot field, a rate limit, and email via Cloudflare Email Service or Postmark. CSP then needs `challenges.cloudflare.com` in `script-src` and `frame-src`, and the Trusted Types policy in `core.js` must allow Turnstile's script.

## Copy to confirm
- [ ] VoIP service wording ("Phones & Teams calling" section, card and footer).
- [ ] Plans table row "Teams Phone and desk phones": add-on / add-on / included.
- [ ] Backup drawing subline: "a separate, locked site".
- [ ] Network drawing label VOIP PHONES "calls over your network" (replaced CORE SWITCH).
