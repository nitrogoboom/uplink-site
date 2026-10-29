# Notes: open items

Things to fix, polish or decide. Remove a line when it's done; add new ones as they come up.

## Astro move (plan: `review.md`)
- [ ] Cloudflare Web Analytics: the beacon token in `core.js` was registered for the old `pages.dev` host, so the beacon loads (the canonical host matches now) but Cloudflare may refuse its reports. In Web Analytics, add `uplink-site.johnoreilly.workers.dev` to that site (or make a new site and swap the token), and again for the real domain at launch.
- [ ] Home service cards go to `/services/<slug>` (each service's own page). Decide whether they should go back to the picker (`/services#<slug>`) instead.
- [ ] `work/[slug]` JSON-LD uses `Article`; `CreativeWork` or a plain `WebPage` may fit a case study better. Decide at launch.
- [ ] Astro emits `dist/_astro/grow-tower.*.svg` and `hero-flows.*.svg` as files as well as inlining them. Harmless orphans; see if an import form avoids it.
- [ ] Sitemap `lastmod` comes from `git log`; a CI build must clone with history (`fetch-depth: 0`) or every page reads the same date.
- [ ] The real domain's DNS must be on Cloudflare before it can be put on the Worker.
- [ ] CI: build + checks on every push, deploy on `main`, preview per PR. Then `site/` leaves git.

## Drawings
- [ ] VoIP: the headset is still small and tucked against the monitor (mic boom about 10px); the desk phone's handset sits flat rather than raised in a cradle.
- [ ] Hero labels: sublines are 21 units now, but on 1024–1180px-wide screens they still render at about 9.5–10px (the drawing is narrow there). Bigger fix: a tablet cut with fewer, larger labels.
- [ ] Hero 3D cloud (`tools/hero_cloud.py`): `check.py` reports ~400 SNAP near-misses where its side-wall strips meet. Seams look clean on screen; quiet them if the checker learns about curved surfaces.
- [ ] Hero on phones is a still picture (`office-compact.svg`): no build animation, no cloud.
- [ ] Office plan: ~153 one-grid-step near-miss flags because the furniture is half size there. Not visible; tidy if the props get a half-size grid.
- [ ] Office phone cut: the FIREWALL RACK title runs over the room's front edge (outlined to stay readable), and its leader doubles back.
- [ ] Network phone cut: the VOIP PHONES leader crosses the back monitor.
- [ ] Network: the access point's ceiling rod barely shows, so it can read as sitting low.
- [ ] Security: the roof unit could use a fan or vent; the door could use a step.
- [ ] Cloud: the phone's call buttons are small; the OLD SERVER dot crowds the server front.
- [ ] Backup: the drive bays turn to texture at phone size; the OFFSITE COPY leader points at the wall, not the lock.
- [ ] Strategy: the IT BUDGET leader is long and steep.
- [ ] Tower: trees and bushes are plain stacked cubes; the rooftop unit is a plain box.
- [ ] HQ phone cut: the building sits right of centre to make room for the label.
- [ ] Trees are coded twice (tower and hq). Move one tree into `tools/isoprops.py`.

## Site
- [ ] Home hero: remove the "Windows 10 support has ended" news card (kept for now, 26 Oct 2026).
- [ ] The Worker is live at https://uplink-site.johnoreilly.workers.dev (first deploy 28 Oct, from the `astro` branch). Compare it with the Pages site, then add the real domain to it.
- [ ] Early Hints: the `Link` header is sent, but no 103 arrives on `workers.dev` (Early Hints is a zone setting, and `workers.dev` has no zone of yours). Check again with `curl -I --http2` once the real domain is on the Worker and the zone's Early Hints setting is on.
- [ ] W3C HTML checker reports 8 CSS errors per page: all are the page-transition rules (`@view-transition`, `view-transition-name`, `::view-transition-*`), which the checker doesn't know yet. Valid CSS; recheck when the checker catches up.
- [ ] PageSpeed mobile Performance reads 99 on some runs: simulated LCP 1.9–2.0 s on the phone hero picture (`office-compact.svg`), right on the 99/100 line. Real load is ~0.4 s.
- [ ] PageSpeed mobile Home lists "Forced reflow: [unattributed] 36 ms" (unscored; score stays 100). Not reproducible locally (live site, beacon on and off, CPU slowed 6x), and no script reads layout at load on phones. Recheck now and then; act only if it starts naming a source.

## Spacing pass (rules and findings: `spacing.md`)
- [ ] About: profile top gaps, profile and person cards, team and stats grids, timeline (B1–B5).
- [ ] Contact: channel row padding (C1).
- [ ] Service and project pages: H3 in the write-up, next-link padding, 22px lead line height (D1–D3).

- [ ] Service pages at 3440×1440: `.svc-page-grid` sometimes gets 0 side margin and sometimes 440px (margin-inline auto), on the same build. `verify_styles.py` shows it as a difference when comparing a build with itself. Find what sets the width late.

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
- [ ] Forms are mockups: contact, book-a-call and newsletter send nothing. Left as mockups for now (26 Oct 2026). When wanted: a Worker endpoint (same origin, so `form-action 'self'` holds) with Turnstile, a honeypot field, a rate limit, and email via Cloudflare Email Service or Postmark. CSP then needs `challenges.cloudflare.com` in `script-src` and `frame-src`, and the Trusted Types policy in `core.js` must allow Turnstile's script.

## Copy to confirm
- [ ] VoIP service wording ("Phones & Teams calling" section, card and footer).
- [ ] Plans table row "Teams Phone and desk phones": add-on / add-on / included.
- [ ] Backup drawing subline: "a separate, locked site".
- [ ] Network drawing label VOIP PHONES "calls over your network" (replaced CORE SWITCH).
