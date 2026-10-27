# Notes: open items

Things to fix, polish or decide. Remove a line when it's done; add new ones as they come up.

## Tools
- [ ] `tools/gen_office.py` is behind the hero: `src/pages/home/1-hero-office.svg` and `1-hero-flows.svg` were copied from the live build (GUEST WI-FI label, new desk layout, new timings). Running `gen_office.py` puts the old hero back. Bring the script up to match those files before running it again.
- [ ] Delete `tools/retired/` (13 old hand-fix tools, see its README). Nothing uses them.

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
- [ ] Home services grid: with 7 cards the last row on laptops holds one card on its own.
- [ ] Home services grid: the one-row layout (`min-aspect-ratio: 2/1` in `src/styles/desktop.css`) also fires on a maximised 1080p browser (1920×945) and 125% laptops (1536×730), not only 21:9. The hero now uses 7/3; check the services section before changing it.
- [ ] `index.html` still has 11 inline `style="animation-duration…"` attributes in the hero; move them into CSS.
- [ ] CSP `style-src` needs `'unsafe-inline'`: the build inlines the site CSS in every page (for speed), and the hero has inline `<style>` blocks and `style=""` attributes. To drop it, give the inline CSS a hash in the CSP (the build could write it).
- [ ] W3C HTML checker reports 8 CSS errors per page: all are the page-transition rules (`@view-transition`, `view-transition-name`, `::view-transition-*`), which the checker doesn't know yet. Valid CSS; recheck when the checker catches up.
- [ ] PageSpeed mobile Performance reads 99 on some runs: simulated LCP 1.9–2.0 s on the phone hero picture (`office-compact.svg`), right on the 99/100 line. Real load is ~0.4 s.
- [ ] PageSpeed mobile Home lists "Forced reflow: [unattributed] 36 ms" (unscored; score stays 100). Not reproducible locally (live site, beacon on and off, CPU slowed 6x), and no script reads layout at load on phones. Recheck now and then; act only if it starts naming a source.
- [ ] Shared blocks that live in a page folder: `.hero` base (`home/1-hero.css`, used by Services), `.facts` (`work/2-details.css`, About and Contact), `.industries` (`work/4-industries.css`, About), `.svc-cards` (`home/2-services.css`, Contact). Move them to `src/styles/` and empty `BORROWS` in `tools/build_pages.py`; run `tools/verify_css_split.py` after.
- [ ] `src/styles/desktop.css` is still one block for every page (the home hero has moved out to `1-hero.css`). Split it per section (each with its own `@media`) and move each piece next to its section; check computed styles match after.
- [ ] The `<head>` is copied in each `src/pages/*/page.html`. Make it one shared layout with per-page title, description and scripts (the Astro move does this anyway).

## Before going live
- [ ] Site is open but kept out of search results: `X-Robots-Tag: noindex` on every response in `site/_headers` (since 27 Oct 2026; test build, placeholder company). PageSpeed's SEO score reads below 100 because of it; the deploy gate ignores that one audit. At launch: delete that header line, set `SITE_URL` in `tools/build_pages.py` to the real domain and rebuild. To lock it again instead: move `tools/site-lock/_middleware.js` back to `functions/` and deploy.
- [ ] Forms are mockups: contact, book-a-call and newsletter send nothing. Left as mockups for now (26 Oct 2026). When wanted: a Pages Function in `functions/` that emails each submission to one inbox.

## Copy to confirm
- [ ] VoIP service wording ("Phones & Teams calling" section, card and footer).
- [ ] Plans table row "Teams Phone and desk phones": add-on / add-on / included.
- [ ] Backup drawing subline: "a separate, locked site".
- [ ] Network drawing label VOIP PHONES "calls over your network" (replaced CORE SWITCH).
