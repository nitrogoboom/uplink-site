# Notes: open items

One line each. Remove a line when it's done; add new ones as they come up. Launch-only work is in `docs/release.md`, "Before launch".

## Now: Home

Layout and look:

- [ ] Services and Work: the gap under the page intro's heading block is 16px (`--sp-4`), where docs/design.md R2 says 32px (`--sp-6`). Each section asked for 32px, but a longer shared selector won; layers (November 18, 2026) would have let 32px through, so it's now written as 16px with a comment (`overview.css`, `projects.css`). 32px is a one-word change in each. Owner to decide.
- [ ] At launch: decide whether About, Work, Services and Contact move their folds to the fold scale (Home uses it; they keep their own fold padding).


Content:

- [ ] Home has two descriptions that differ: the page's ("Outsourced IT…", `description` in `src/content/en/copy/home.yaml`) and the business one ("Managed IT…", `business`). Decide when the real copy is written.
- [ ] All pages: where the same text comes from two content entries (such as a separate phone line), merge them into one, as Home's hero lead (PR #160, `t.lead` only) (owner, November 10, 2026).
- [ ] Copy to confirm: VoIP wording, `gen_backup.py`'s "a separate, locked site", `gen_network.py`'s VOIP PHONES label, Grow's six tags, the "Windows 10" hero card.
- [ ] Home "What clients say" (`Reviews.astro`): sample reviews in `src/content/en/reviews.json`. With the real Google reviews: their fields (photo, "2 months ago", rating shown per card if they vary), a score and count beside the stars, "Read reviews on Google" (now `/soon`) to the Google profile, quotes that don't retell "Our work", drop the "Sample reviews" line. Maybe fold the check-up band into this section (`.fold-foot`, as About Team).
- [ ] Home "Our work" row is a placeholder until its real section is decided (`src/components/home/Work.astro`).
- [ ] Contact form: when it's wired to Cloudflare, make its sent message (`received` in `src/content/en/copy/contact.yaml`) match what really happens. Until then it says the message was received (thought-audit.md, problem 1).
- [ ] Grow: final copy and team sizes, people drawn as more than blocks, timing on real phones (`DWELL`, `RISK_AT`, `FIX_AT` in `grow.js`).

## Now: setup and code

From the audit (thought-audit.md):

- [ ] Optional: split `footer.css` so the campus map's rules (about 270 lines) load with the map. No unused rules found; 7 KB compressed and cached, so the saving is small.
- [ ] At launch: run lint and types (`npm run quick`'s checks) in CI before the deploy, so a direct push or a Dependabot merge can't ship a type break. Left out during draft mode.

Drawing generators (the owner directs drawing work):

- [ ] `gen_office.py` and `gen_grow.py` write role classes, as `gen_campus.py` does; `theme-drawings.css` then goes.
- [ ] The generators write the camera boxes into the drawings; the footer map camera becomes generated CSS with `:has()`.

PageSpeed (November 17, 2026: fonts 113 KB to 51 KB; forced reflow, network dependency tree, cache lifetimes, HSTS and unused CSS turned green):

- [ ] Grow, while its story plays: the camera now slides the drawing (a transform) instead of redrawing it each frame (November 18, 2026: a step's first 1.5 s on a 4x slowed phone, 63 to 67% of the main thread -> 51 to 60%; script and layout halved). What is left is the new parts dropping in (opacity and a move on SVG groups, which the browser repaints), about 40% with no camera move at all. Cheaper would mean fewer parts dropping at once or a simpler drop. A look decision. Owner to decide.
- [ ] Desktop, on a slower connection: the header's tabs shift a little when their font arrives (layout shift 0.03, inside PageSpeed's green band; seen in Lighthouse from this PC against the live site, not in Google's own run). The fallback font's width for the tabs' capitals could be tuned (`src/styles/fonts.css`).
- [ ] Home, desktop: until `grow.js` starts, the Grow section shows every step's card and is 593px taller, then shrinks. It is off screen, so no visitor sees it move, but it is what PageSpeed's desktop "Layout shift culprits" lists (`.grow-mark`, score 0), and Grow's loops run until then. A fix would show the scripted layout from the first paint when script is on (`.js`), which needs a plan for a script that fails to load. Owner to decide.
- [ ] Tried and taken out: `content-visibility: auto` (the browser skips a block's layout while it is off screen). On Our work, Reviews and the footer, first paint came 10 to 15% sooner on a slowed CPU, but Safari landed a reload at Reviews 115px off and jumped once when scrolled up from the bottom. On the footer alone it was clean in Chromium, Firefox and WebKit for 5 to 9%, with the tablet footer's text 1px lower. Left out until the footer's rows have been tried on a real iPhone. Owner to decide.
- [ ] Source comments don't ship (the build strips them). A sweep to shorten them in `src/` is tidiness, not speed. Owner to decide how far.

## Parked until the owner says

Not Home, not setup: `parked.md`.

After the rebuild (Astro builds it alone; `docs/ops.md`):

- [ ] Drawings as Astro assets (`src/assets/`, hashed file names) instead of `public/assets/img/` with `?v=`: Astro's own way to cache-bust pictures. Nothing is wrong today; worth doing when the other pages are designed, since it moves where the drawing tools write.
