# Notes: open items

One line each. Remove a line when it's done; add new ones as they come up. Launch-only work is in `docs/release.md`, "Before launch".

## Now: Home

Layout and look:


Content:

- [ ] Home has two descriptions that differ: the page's ("Outsourced IT…", `description` in `src/data/copy/en/home.yaml`) and the business one ("Managed IT…", `business`). Decide when the real copy is written.
- [ ] All pages: where the same text comes from two content entries (such as a separate phone line), merge them into one, as Home's hero lead (PR #160, `t.lead` only) (owner, November 10, 2026).
- [ ] Copy to confirm: VoIP wording, `gen_backup.py`'s "a separate, locked site", `gen_network.py`'s VOIP PHONES label, Grow's six tags, the "Windows 10" hero card.
- [ ] Home "What clients say" (`Reviews.astro`): sample reviews in `src/data/reviews.json`. With the real Google reviews: their fields (photo, "2 months ago", rating shown per card if they vary), a score and count beside the stars, "Read reviews on Google" (now `/soon`) to the Google profile, quotes that don't retell "Our work", drop the "Sample reviews" line. Maybe fold the check-up band into this section (`.fold-foot`, as About Team).
- [ ] Home "Our work" row is a placeholder until its real section is decided (`src/components/home/Work.astro`).
- [ ] Grow: final copy and team sizes, people drawn as more than blocks, timing on real phones (`DWELL`, `RISK_AT`, `FIX_AT` in `grow.js`).

## Now: setup and code

Drawing generators (the owner directs drawing work):

- [ ] `gen_office.py` and `gen_grow.py` write role classes, as `gen_campus.py` does; `theme-drawings.css` then goes.
- [ ] The generators write the camera boxes into the drawings; the footer map camera becomes generated CSS with `:has()`.
- [ ] Shrink a drawing when it's generated and commit that, so `scripts/svgo.mjs` leaves the build.

PageSpeed (November 17, 2026: fonts 113 KB to 51 KB; forced reflow, network dependency tree, cache lifetimes, HSTS and unused CSS turned green):

- [ ] "Avoid non-composited animations": 22 down to 4 on a phone. The 4 are the hero's cables drawing themselves in, once, as the drawing builds (`ob-draw`, `stroke-dashoffset`); nothing loops that way any more. Left: the three tiles' `stroke` and `fill` when one lights. Owner to decide if the build should change (`tools/office_parts/hero.css`).
- [ ] Grow, while its story plays: the camera now slides the drawing (a transform) instead of redrawing it each frame (November 18, 2026: a step's first 1.5 s on a 4x slowed phone, 63 to 67% of the main thread -> 51 to 60%; script and layout halved). What is left is the new parts dropping in (opacity and a move on SVG groups, which the browser repaints), about 40% with no camera move at all. Cheaper would mean fewer parts dropping at once or a simpler drop. A look decision. Owner to decide.
- [ ] Desktop, on a slower connection: the header's tabs shift a little when their font arrives (layout shift 0.03, inside PageSpeed's green band; seen in Lighthouse from this PC against the live site, not in Google's own run). The fallback font's width for the tabs' capitals could be tuned (`src/styles/fonts.css`).
- [ ] Home, desktop: until `grow.js` starts, the Grow section shows every step's card and is 593px taller, then shrinks. It is off screen, so no visitor sees it move, but it is what PageSpeed's desktop "Layout shift culprits" lists (`.grow-mark`, score 0), and Grow's loops run until then. A fix would show the scripted layout from the first paint when script is on (`.js`), which needs a plan for a script that fails to load. Owner to decide.
- [ ] Tried and taken out: `content-visibility: auto` (the browser skips a block's layout while it is off screen). On Our work, Reviews and the footer, first paint came 10 to 15% sooner on a slowed CPU, but Safari landed a reload at Reviews 115px off and jumped once when scrolled up from the bottom. On the footer alone it was clean in Chromium, Firefox and WebKit for 5 to 9%, with the tablet footer's text 1px lower. Left out until the footer's rows have been tried on a real iPhone. Owner to decide.
- [ ] Safari on a phone asks for the hero drawing twice: Home's `<link rel="preload" as="fetch">` (`index.astro`) and then `home.js`'s own `fetch()`, which Safari doesn't pair up; Chrome asks once. Seen in WebKit 27.2 on the live site, November 17, 2026 (two "preloaded but not used" warnings); the second may come from Safari's cache. Find a preload Safari pairs, or drop it there.
- [ ] Source comments don't ship (the build strips them). A sweep to shorten them in `src/` is tidiness, not speed. Owner to decide how far.

## Parked until the owner says

Not Home, not setup: `parked.md`.
