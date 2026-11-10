# Notes: open items

One line each. Remove a line when it's done; add new ones as they come up. Launch-only work is in `docs/release.md`, "Before launch".

From `docs/history/recommendations-fable-5.2-2026-11-09.md`; its "Status" section says what's done. Decisions: `docs/history/decisions-2026-11-09.md`.

## Now: Home

Needs the owner's eyes on a preview:

- [ ] Hero: six layouts down to three (stacked, two columns, ultrawide).
- [ ] Home services on desktop: four variants in `services.css` become one block where the drawing flexes above a floor.
- [ ] One "fold with art" block for the pattern written five times; card grids that fit themselves (`repeat(auto-fit, minmax(min(100%, Nrem), 1fr))`).
- [ ] Delete the extra height thresholds now that a fold may grow (about 30 lines; decided, not yet done).
- [ ] Phone hero captions (HTML since #141): look with larger text set on a phone; the two captions grow and could come close.
- [ ] Grow: the ring as the CSS animation the progress bar uses; the dome orbits as CSS dashes, not 14 paths rewritten every frame.

Layout and look:

- [ ] Home services, tall cards: drawings are 96px at 1280×800 and 1366×768; look on a real laptop, maybe drop the features on short screens.
- [ ] Home services, small tiles: with a mouse at 768×1024 the section runs 6px past the screen.
- [ ] Firefox at 390px wide, 200% text: Home's services row (`.svc-big`) made the page 458px wide (November 6, 2026). Check by hand.
- [ ] Phone hero: on a slow phone the stage is empty about 0.5s before the drawing arrives; inlining the phone cut costs about 14 KB a load. Check on a real phone first.
- [ ] Hero fallback: if the drawing never builds, show the still office (`template.hero-still`) instead of an empty stage.

Content:

- [ ] Home has two descriptions that differ: the page's ("Outsourced IT…", `description` in `src/data/copy/en/home.yaml`) and the business one ("Managed IT…", `business`). Decide when the real copy is written.
- [ ] Copy to confirm: VoIP wording, `gen_backup.py`'s "a separate, locked site", `gen_network.py`'s VOIP PHONES label, the hero's `lead-short`, Grow's six tags, the "Windows 10" hero card.
- [ ] Home "What clients say" (`Reviews.astro`): sample reviews in `src/data/reviews.json`. With the real Google reviews: their fields (photo, "2 months ago", rating shown per card if they vary), a score and count beside the stars, "Read reviews on Google" (now `/soon`) to the Google profile, quotes that don't retell "Our work", drop the "Sample reviews" line. Maybe fold the check-up band into this section (`.fold-foot`, as About Team).
- [ ] Home "Our work" row is a placeholder until its real section is decided (`src/components/home/Work.astro`).
- [ ] Grow: final copy and team sizes, people drawn as more than blocks, timing on real phones (`DWELL`, `RISK_AT`, `FIX_AT` in `grow.js`).

## Now: setup and code

The agent can do alone (each is its own pull request):

- [ ] `site.yml`: the Playwright cache steps are written three times (`core`, `verify`, `visual-diff`); the build fetches the whole git history only to date the sitemap (`src/lib/git-dates.mjs`).
- [ ] Parked layout checks (`checks/parked/layout.mjs`): bring each back, rewritten, when the layout it pinned is redone; `bottom-nav.css` comments still cite the parked header-fit check.
- [ ] Check that Dependabot's Actions group (a wildcard) still waits out its cooldown.
- [ ] Menu names ("Home", "Our work" …) are still in `PAGES` in `src/lib/site.ts`; they move to the YAML copy files before French.

Drawing generators (the owner directs drawing work):

- [ ] `gen_office.py` and `gen_grow.py` write role classes, as `gen_campus.py` does; `theme-drawings.css` then goes.
- [ ] The generators write the link paths and camera boxes into the drawings; the footer map camera becomes generated CSS with `:has()`.
- [ ] Shrink a drawing when it's generated and commit that, so `scripts/svgo.mjs` leaves the build.
- [ ] On Windows a generator writes CRLF line ends (found November 9, 2026): git puts them right on commit, but `prettier --check` fails on the working copy of `theme-drawings.css` until it's checked out again.
- [ ] Decide: delete `tools/site-lock/` if the password lock isn't coming back.

Code and tools:

- [ ] Browsers: write the support list (`browserslist`) and check `:has()`, `@view-transition` and `text-wrap` fall back cleanly.
- [ ] Review C4 leftovers: `scripts/check.mjs` picks a check by project and `CHECK_ARGS`; the server starts in two places (Playwright's `webServer` could do both); the audit bundles Guidepup at run time.
- [ ] After a Dependabot bump of `wrangler` or `esbuild`: set `allowScripts` in `package.json` to the versions in `package-lock.json` (`workerd`, `esbuild`, `fsevents`), or `npm ci` warns, and npm 12 won't run their install scripts.
- [ ] TypeScript 7: `astro check` refuses it, so `dependabot.yml` ignores TypeScript majors. Move when `@astrojs/check` supports 7.
- [ ] `npm run verify:styles` sometimes reports a `div.container`'s side margins as 0 at 3440 on `/` or `/work` (a Chrome quirk): rerun before you trust such a line.
- [ ] `wrangler dev` kept serving the `_headers` it started with after a rebuild (November 9, 2026: stale X-Build and CSP hashes, so new inline styles were blocked); restart it after a build, or find why, and say so in README.
- [ ] Smoke from a cloud session needs the site's host allowed and `NODE_USE_ENV_PROXY=1`; the `http://` redirect check runs only from a normal machine.
- [ ] Small, left as they are: `gen_campus.py` keeps its own `box()`; `ServiceCard`'s `on`/`first`/`heading` props have one caller.

## Parked until the owner says

Not Home, not setup. Leave these alone unless the owner asks.

- [ ] Markdown copies written from the data, not from the built HTML; `turndown` and `data-md-skip` then go. Parked November 10, 2026: it needs a second template per page (about 250 lines for the 162 it replaces), and every page change would then need two edits.
- [ ] French as `/fr/` addresses (decided): Astro's i18n routing. The copy files are in `src/data/copy/en/` now (#146); a `fr/` folder, the French words and the `/fr/` addresses are left.

### Owner and accounts

- [ ] GitHub environments (review H5): put the Cloudflare secrets in `production` and a preview token in `preview`, switch `site.yml` to them, delete `cloudflare`. See `docs/security.md`, "Secrets".
- [ ] Cloudflare: a company account with 2FA, and an API token scoped to this one Worker.
- [ ] Secrets: give each one an owner and a rotation date (`docs/security.md`, "Secrets").
- [ ] Uptime check from outside Cloudflare, on the `workers.dev` address for now.
- [ ] The repository is public "for now" (November 6, 2026); making it private turns the rulesets off unless the plan is GitHub Pro.
- [ ] Finish the baseline in `docs/history/releases/2026-11-03.md`: the 15-minute hand part (iPhone, Android, a 5-minute NVDA listen, the judgement checks).
- [ ] Decide, on hold: who edits copy (today Claude, in git); a CMS only if staff will edit the site themselves.

For launch (the owner): the scoped Cloudflare token and split environments are under "Owner and accounts"; the paid Workers plan, Always Use HTTPS, and an alert on the error reports belong in `docs/release.md`, "Before launch".

### Privacy and accessibility pages

Sources: `docs/history/privacy-and-accessibility-2026-11-03.md`.

- [ ] Real inboxes for `privacy@`, `accessibility@`, `security@` (`inboxes` in `src/data/footer.json`), and a postal code for the office.
- [ ] Name the Privacy Officer (the page gives the title only, which PIPEDA allows).
- [ ] Before launch, `/accessibility` gets back two Ontario lines: what happens after feedback (O. Reg. 191/11 s. 80.50(2)) and free accessible formats on request (s. 12(3)).

### Forms

- [ ] Forms are paused. PR #38 (`claude/sweet-chaum-b12ca0`) has the Worker endpoint, Turnstile, honeypot and rate limit, email a stub; leave it open. Needs `TURNSTILE_SECRET`, `FORM_TO`, a sending domain.
- [ ] PR #38 conflicts with `main`: keep both routes in `worker/index.js`, both `ratelimits`, and `main`'s `run_worker_first` (`["/api/*", "/404"]`) with `not_found_handling: "none"`.
- [ ] With the endpoint: give the contact and newsletter fields their `name` back (without script they go to `/soon`); CSP and the Trusted Types policy allow Turnstile (`docs/security.md`).
- [ ] When forms send: delete the "send nothing yet" lines and `FORMS-LIVE` comments in `src/data/privacy.md` and `accessibility.md`, link privacy beside each Send.
- [ ] Newsletter: a CASL consent line ("One email a month from Uplink Technology. Unsubscribe any time. Privacy."), what sends it (a processor to name), where consent records live.
- [ ] Decide on Cloudflare Email Service's "Email preview" (keeps each sent message about 7 days; the privacy page says so).
- [ ] The booking toast says "We will email you within one business day" (`src/data/copy/en/ui.yaml`), but nothing is sent. PR #38 fixes it.

### Content

- [ ] Service and project copy (each entry's `page` in `src/content/`) stays sample until there's a real client.
- [ ] With real content: drawn team avatars, Business JSON-LD (phone, address, hours, `logo`, `sameAs`), and a real status page for "All systems normal" (or drop it).
- [ ] Services: a plans or pricing section once real pricing exists.
- [ ] Contact: "Open a ticket" and "Start a remote session" go to `/soon`.

### Layout and look

- [ ] Narrower than 20em (390px phone at 200% zoom, or a 24px font) scrolls sideways; below WCAG's 320px floor. Decide whether to support it.
- [ ] Light theme: signed off November 9, 2026, still open to change. Optional: a quieter amber tower on the footer map; ghost-button edges to `--c-edge` (colour rule 6).
- [ ] Logo: the header's wordmark has no light-ground file in this repository (`docs/design.md`, "Logo").
- [ ] 404 page: a three-panel heist comic, draft on branch `404-comic-draft`; panel 1 (the van) needs a rethink, and the balloon clips the "t" in "typed".
- [ ] Optional: on service pages "What's included" and "Best for" are h2s; they could be h3s or a label (`ServiceCard.astro` says h2 is on purpose).
- [ ] Idea, not planned: the office fire drill (`docs/history/creative.md`).
- [ ] Small, left as they are: Home-only hero rules in `compact-cuts.css`; the services observer runs at 700px and up; JSON-LD is pretty-printed.

### Real devices

- [ ] Real iPhone and Android: the footer's `<details>` rows (including a row shutting during iOS momentum scroll), project cards as rows, Grow, and Firefox ESR 140's footer rows.
- [ ] Android: do the "Fallback Roboto" faces in `src/styles/fonts.css` find `local('Roboto')`? Load the 404 on a slow connection and watch for a jump (review B5).
- [ ] Firefox 144+ and Safari 26.2+ (review J8, J15): with page scripts blocked, the gear opens Settings, Esc and close shut it, focus returns; does a backdrop click shut it (`closedby`)?
- [ ] Safari before 26.2 (no `scrollend`): Home's phone services row, Next, swipe mid-slide, Next again: it steps from the card showing.
- [ ] Real Safari: does it refuse a style for every `<select>` under the CSP, as Playwright's WebKit does? If so, report it to bugs.webkit.org.
- [ ] PageSpeed mobile: confirm LCP is the hero text (about 1.1s locally) with `npm run pagespeed`.
