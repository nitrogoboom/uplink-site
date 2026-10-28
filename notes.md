# Notes: open items

Things to fix, polish or decide. Remove a line when it's done; add new ones as they come up.

## Astro move (plan: `review.md`)
- [ ] Do the move in the order in `review.md` "Order of work": scaffold and Home, the other pages, content collections with one page per service and project, generated files, CSP hashes + Workers config + CI, then delete the Python build (`build_pages.py`, `stamp.py`, `build_footer.py`, `verify_css_split.py`, `serve.py`, `deploy.py`) and `site/`.
- [ ] Config to carry over: `build.format: 'file'`, `trailingSlash: 'never'` (keeps today's URLs), `compressHTML: true` (the hero title's space between `</span>` and `<em>` vanishes under the new `'jsx'` default), `site` set to the live address.
- [ ] Remove `<meta name="claude:viewport-fit-sides">` from every `page.html` (artifact leftover).
- [ ] `<html lang="en">` → `en-CA` (matches `og:locale` and `inLanguage`).
- [ ] `og.png` is 257 KB; run it through `oxipng`/`pngquant` in `gen_og.py` (aim for under 100 KB).
- [ ] Hosting: Cloudflare Pages → Workers static assets (`wrangler.jsonc`, `assets.directory`, `not_found_handling: "404-page"`, `.assetsignore`); the password lock becomes a Worker with `run_worker_first`. Check Early Hints still arrive after the move. The real domain's DNS must be on Cloudflare.
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
- [ ] `index.html` still has 11 inline `style="animation-duration…"` attributes in the hero; move them into CSS.
- [ ] CSP `style-src` needs `'unsafe-inline'`: the build inlines the site CSS in every page (for speed), and the hero has inline `<style>` blocks and `style=""` attributes. To drop it, give the inline CSS a hash in the CSP (the build could write it).
- [ ] W3C HTML checker reports 8 CSS errors per page: all are the page-transition rules (`@view-transition`, `view-transition-name`, `::view-transition-*`), which the checker doesn't know yet. Valid CSS; recheck when the checker catches up.
- [ ] PageSpeed mobile Performance reads 99 on some runs: simulated LCP 1.9–2.0 s on the phone hero picture (`office-compact.svg`), right on the 99/100 line. Real load is ~0.4 s.
- [ ] PageSpeed mobile Home lists "Forced reflow: [unattributed] 36 ms" (unscored; score stays 100). Not reproducible locally (live site, beacon on and off, CPU slowed 6x), and no script reads layout at load on phones. Recheck now and then; act only if it starts naming a source.
- [ ] Shared blocks that live in a page folder: `.hero` base (`home/1-hero.css`, used by Services), `.facts` (`work/2-details.css`, About and Contact), `.industries` (`work/4-industries.css`, About), `.svc-cards` (`home/2-services.css`, Contact). Move them to `src/styles/` and empty `BORROWS` in `tools/build_pages.py`; run `tools/verify_css_split.py` after.
- [ ] `src/styles/desktop.css` is still one block for every page (the home hero has moved out to `1-hero.css`). Split it per section (each with its own `@media`) and move each piece next to its section; check computed styles match after.
- [ ] The `<head>` is copied in each `src/pages/*/page.html`. Make it one shared layout with per-page title, description and scripts (the Astro move does this anyway).

## Before going live
- [ ] About 25 links per page go to `soon` (client portal, remote support, status, careers, blog, Windows 10 guide, security checklist, privacy, terms, accessibility, Français, five social links). Each needs a page or no link. The `Français` link carries `hreflang="fr"` to a placeholder; drop it or build the page.
- [ ] HSTS: add `includeSubDomains; preload` once every subdomain of the real domain is HTTPS, then submit to hstspreload.org. Not before.
- [ ] CSP reporting: `Reporting-Endpoints` + `report-to` so blocked scripts on real visitors get seen.
- [ ] Business JSON-LD with real phone, address, hours, `logo`, `image`, `sameAs`, `priceRange`. `FAQPage` markup stays but gives no rich result (Google limits those to government and health sites since Aug 2023).
- [ ] Search Console: verify the domain, submit the sitemap; redirect the `pages.dev` address to the real domain.
- [ ] Cloudflare zone: Always Use HTTPS, TLS 1.2 minimum, HTTP/3, Early Hints, Bot Fight Mode. Auto Minify and Rocket Loader stay off (they break the hashes and the CSP).
- [ ] Site is open but kept out of search results: `X-Robots-Tag: noindex` on every response in `site/_headers` (since 27 Oct 2026; test build, placeholder company). PageSpeed's SEO score reads below 100 because of it; `tools/pagespeed.py` ignores that one audit. At launch: delete that header line, set `SITE_URL` in `tools/build_pages.py` to the real domain and rebuild. To lock it again instead: move `tools/site-lock/_middleware.js` back to `functions/` and deploy.
- [ ] Forms are mockups: contact, book-a-call and newsletter send nothing. Left as mockups for now (26 Oct 2026). When wanted: a Worker endpoint (same origin, so `form-action 'self'` holds) with Turnstile, a honeypot field, a rate limit, and email via Cloudflare Email Service or Postmark. CSP then needs `challenges.cloudflare.com` in `script-src` and `frame-src`, and the Trusted Types policy in `core.js` must allow Turnstile's script.

## Copy to confirm
- [ ] VoIP service wording ("Phones & Teams calling" section, card and footer).
- [ ] Plans table row "Teams Phone and desk phones": add-on / add-on / included.
- [ ] Backup drawing subline: "a separate, locked site".
- [ ] Network drawing label VOIP PHONES "calls over your network" (replaced CORE SWITCH).
