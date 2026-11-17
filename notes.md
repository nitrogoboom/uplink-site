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
- [ ] Grow, while its story plays: between steps the main thread is nearly idle (2 to 5% of a slowed phone), but each step's first second and a half, when the camera pulls back and the new parts drop in, takes 70 to 100% of it. Cheaper would be a camera that moves in fewer steps, or the glow on new parts coming after the camera stops. A look decision. Owner to decide.
- [ ] Desktop, on a slower connection: the header's tabs shift a little when their font arrives (layout shift 0.03, inside PageSpeed's green band; seen in Lighthouse from this PC against the live site, not in Google's own run). The fallback font's width for the tabs' capitals could be tuned (`src/styles/fonts.css`).
- [ ] Home, desktop: until `grow.js` starts, the Grow section shows every step's card and is 593px taller, then shrinks. It is off screen, so no visitor sees it move, but it is what PageSpeed's desktop "Layout shift culprits" lists (`.grow-mark`, score 0), and Grow's loops run until then. A fix would show the scripted layout from the first paint when script is on (`.js`), which needs a plan for a script that fails to load. Owner to decide.
- [ ] Tried and taken out: `content-visibility: auto` (the browser skips a block's layout while it is off screen). On Our work, Reviews and the footer, first paint came 10 to 15% sooner on a slowed CPU, but Safari landed a reload at Reviews 115px off and jumped once when scrolled up from the bottom. On the footer alone it was clean in Chromium, Firefox and WebKit for 5 to 9%, with the tablet footer's text 1px lower. Left out until the footer's rows have been tried on a real iPhone. Owner to decide.
- [ ] Safari on a phone asks for the hero drawing twice: Home's `<link rel="preload" as="fetch">` (`index.astro`) and then `home.js`'s own `fetch()`, which Safari doesn't pair up; Chrome asks once. Seen in WebKit 27.2 on the live site, November 17, 2026 (two "preloaded but not used" warnings); the second may come from Safari's cache. Find a preload Safari pairs, or drop it there.
- [ ] Source comments don't ship (the build strips them). A sweep to shorten them in `src/` is tidiness, not speed. Owner to decide how far.

## Parked until the owner says

Not Home, not setup. Leave these alone unless the owner asks.

- [ ] French as `/fr/` addresses (decided): Astro's i18n routing. The copy files are in `src/data/copy/en/` now (#146); a `fr/` folder, the French words and the `/fr/` addresses are left.

### Owner and accounts

- [ ] GitHub environments (review H5): put the Cloudflare secrets in `production` and a preview token in `preview`, switch `site.yml` to them, delete `cloudflare`. See `docs/security.md`, "Secrets".
- [ ] Cloudflare: a company account with 2FA. (Done November 13, 2026: the deploy token is an account token with only "Workers Scripts: Edit"; sign-in is Google, which has 2FA.)
- [ ] Secrets: give each one an owner and a rotation date (`docs/security.md`, "Secrets").
- [ ] `uplinkit.ca` is not registered (seen November 17, 2026): anyone could buy it and get the mail sent to the site's addresses (`hello@`, `privacy@`, `accessibility@`, `security@`). Register it, or settle the real domain, before launch (owner, November 17, 2026: leave until then).
- [ ] The repository is public "for now" (November 6, 2026); making it private turns the rulesets off unless the plan is GitHub Pro.
- [ ] Finish the baseline: the 15-minute hand part (iPhone, Android, a 5-minute NVDA listen, the judgement checks).
- [ ] Decide, on hold: who edits copy (today Claude, in git); a CMS only if staff will edit the site themselves.

For launch (the owner): the split environments are under "Owner and accounts"; the paid Workers plan, Always Use HTTPS, and Cloudflare's client-side security belong in `docs/release.md`, "Before launch".

### Privacy and accessibility pages

- [ ] Real inboxes for `privacy@`, `accessibility@`, `security@` (`inboxes` in `src/data/footer.json`; its `uplinkit.ca` addresses are placeholders), and a postal code for the office.
- [ ] Name the Privacy Officer (the page gives the title only, which PIPEDA allows).
- [ ] `/accessibility`, "How we check it" (`src/data/accessibility.md`) still says every change is checked automatically in three browsers; that stopped November 12, 2026 (checks are looks by hand now). Rewrite it to what's true before launch.
- [ ] Before launch, `/accessibility` gets back two Ontario lines: what happens after feedback (O. Reg. 191/11 s. 80.50(2)) and free accessible formats on request (s. 12(3)).

### Forms

- [ ] Forms are paused. PR #38 (`claude/sweet-chaum-b12ca0`) has the Worker endpoint, Turnstile, honeypot and rate limit, email a stub; leave it open. Needs `TURNSTILE_SECRET`, `FORM_TO`, a sending domain.
- [ ] PR #38 conflicts with `main`: `main` has no `/api/` address since November 16, 2026 (`/api/report` and its `REPORTS` limit are gone). Its form routes bring `/api/*` back to `run_worker_first` (`["/api/*", "/404"]`, with `not_found_handling: "none"`) and its own `ratelimits`; adding them is the owner's decision.
- [ ] With the endpoint: give the contact and newsletter fields their `name` back (without script they go to `/soon`); CSP and the Trusted Types policy allow Turnstile (`docs/security.md`).
- [ ] When forms send: delete the "send nothing yet" lines and `FORMS-LIVE` comments in `src/data/privacy.md` and `accessibility.md`, link privacy beside each Send.
- [ ] When forms send: the booking and newsletter toasts (`toast.booked`, `toast.subscribed` in `ui.yaml`) say "Prototype form: nothing is sent yet"; give them the real reply time.
- [ ] Newsletter: a CASL consent line ("One email a month from Uplink Technology. Unsubscribe any time. Privacy."), what sends it (a processor to name), where consent records live.
- [ ] Decide on Cloudflare Email Service's "Email preview" (keeps each sent message about 7 days; the privacy page says so).

### Content

- [ ] Service and project copy (each entry's `page` in `src/content/`) stays sample until there's a real client.
- [ ] With real content: drawn team avatars, Business JSON-LD (phone, address, hours, `logo`, `sameAs`), and a real status page for "All systems normal" (or drop it).
- [ ] Services: a plans or pricing section once real pricing exists.
- [ ] Contact: "Open a ticket" and "Start a remote session" go to `/soon`.

### Layout and look

- [ ] Light theme: signed off November 9, 2026, still open to change. Optional: a quieter amber tower on the footer map; ghost-button edges to `--c-edge` (colour rule 6).
- [ ] Logo: the header's wordmark has no light-ground file in this repository (`docs/design.md`, "Logo").
- [ ] Optional: on service pages "What's included" and "Best for" are h2s; they could be h3s or a label (`ServiceCard.astro` says h2 is on purpose).
- [ ] Idea, not planned: the office fire drill.

### Real devices

- [ ] Real iPhone and Android: the footer's `<details>` rows (including a row shutting during iOS momentum scroll), project cards as rows, Grow, and Firefox ESR 140's footer rows.
- [ ] Android: do the "Fallback Roboto" faces in `src/styles/fonts.css` find `local('Roboto')`? Load the 404 on a slow connection and watch for a jump (review B5).
- [ ] Firefox 144+ and Safari 26.2+ (review J8, J15): with page scripts blocked, the gear opens Settings, Esc and close shut it, focus returns; does a backdrop click shut it (`closedby`)?
- [ ] Safari before 26.2 (no `scrollend`): Home's phone services row, Next, swipe mid-slide, Next again: it steps from the card showing.
- [ ] Real Safari (Mac and iPhone): after Home has loaded, does the next page get the shared CSS file from the cache? `home.js` asks for it as a preload there, which Playwright's WebKit 27.2 keeps for the next page; real Safari is untried. In Web Inspector, Network: open Home, wait a few seconds, click Services, and the `.css` file should show no transfer.
- [ ] Windows at 100% screen scale: the fonts lost their Windows-only sharpening (hinting) on November 17, 2026. Small text should look the same; if it looks soft, cut the fonts again without `--no-hinting` (`docs/ops.md`, "Fonts are Astro's"; about 86 KB in all, not 51).
