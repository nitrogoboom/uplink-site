# Site standards

The bar the Uplink site holds, and what makes it this site. This is not a checklist to run every release (that's `docs/sop.md`, section 5) or a to-do list (that's `notes.md`).

Use it two ways:
- **When asked to review** (a branch, a PR, a page, the whole site), check the work against every section here. Report each place it falls short: what, where, and which line here it breaks.
- **When adding something new** (a page, a section, a script, an outside service), it meets these before it merges.

When the bar moves, change this file in the same PR, and give the date and the reason. Written 5 Nov 2026 from the work up to then (`docs/history/`, `docs/go-live-checklist.md` and the code).

## 1. What makes it this site

- **A game client, not a brochure.** The look is inspired by Overwatch 2's menus, not copied: a sticky top bar of tabs, calm sections in one centred block, a "hero select" footer, key-cap hints.
  - The layout patterns are in `docs/layout-reference.md`, and the colour roles in `editing-room/palette/DESIGN.md` (Navy & Amber, dark).
  - None of its names, fonts, logos or art are used. The type is Barlow (SIL OFL).
- **One screen per section on desktop.** A section with enough to fill a screen is one screen (`.fold`); a short band keeps its own height. Below desktop, sections take their own height, except each page's first screen (`.fold-always`).
  - Home's folds are whole mouse-wheel steps (`docs/fold-wheel-grid-2026-11-04.md`).
  - The whole layout scales with the window from the 1440×900 reference up to 3440×1440 (`tokens.css`).
- **Drawings are true isometric and written by scripts.** Every illustration comes from a `tools/gen_*.py`, never hand-edited.
  - Each follows the Drawing rules in README and passes `tools/check.py` and `tools/painter.py`.
  - Each has a phone cut (`NAME-compact.svg`) and a card cut. Each carries only the font letters it uses.
- **Living drawings.** Three play rather than sit still:
  - the Home hero office builds itself, with data flowing on its cables
  - the "We grow with you" world grows in six steps (`grow.js`)
  - the footer campus map moves to each panel's spot
  - All three pause off screen and on the pause button, and stop under reduced motion.
- **Content is data.**
  - Services and projects are typed JSON (`src/content/`); smaller lists are `src/data/*.json`.
  - Cards, pages, footer links, select options, the sitemap, `llms.txt` and JSON-LD all read from those files, so a service's words are typed once.
  - Page titles and descriptions live in `src/lib/site.ts`.
- **Plain web, no framework.** Astro 7 builds static HTML; plain CSS and plain-JS ES modules, no UI framework, no client router, no Tailwind, no libraries in the page. Any of those would cost the CSP, the no-script story or the size (`docs/history/review.md`, "Things to leave alone").
- **Every page works without script.** Content is in the HTML in full. Script only shows one thing at a time, and adds motion, tabs and shortcuts.
- **Copy:** short, plain sentences. No "AI slop" tells, no left-side border accents on cards.

## 2. Accessibility

**Target:** WCAG 2.0 AA, our own standard. Ontario's AODA requires it only from 50 staff, and we're under (decided 3 Nov 2026). We meet 2.1 and 2.2 AA rules too where it costs little; the ones met so far are marked (2.1) or (2.2) below. There's a public statement at `/accessibility` with a feedback route.

**Structure**
- Exactly one h1 per page, and headings never skip a level going down.
- Landmarks: one `main`, one site header, one footer. Every `nav` has its own name ("Main", "Breadcrumb", "Legal", the footer panels'). No two regions on a page share a name.
- A skip link is the first Tab stop and lands in `main`.
- `lang="en-CA"` on every page; other-language text gets its own `lang`.
- Every page has a unique `<title>`, and the menu marks the current page with `aria-current`.

**Names and reading order**
- Every link and button has an accessible name made from its visible words, so voice control can find it by what it shows. One name never goes to two places on a page.
- A link made of separate parts (title plus line) has `<Pause />` between them, so a screen reader doesn't run them together.
- A form switch's name is short; its hint is `aria-describedby`.
- Every ARIA reference points at an id that exists. There are no ARIA roles that HTML already gives, and no `aria-hidden` on anything focusable.
- Decorative SVG is `aria-hidden`; card pictures are `alt=""` (the link's words carry it); a drawing that means something has alt text.
- What a screen reader hears on Home is written down (`docs/screen-reader-home.md`); the release audit keeps a transcript of every page (`out/audit/reader/`).

**Keyboard**
- Everything works from the keyboard, in reading order, with nothing trapped.
- The focus ring is visible everywhere: a 2px amber outline, offset 2px (`base.css`).
- Pop-ups are native `<dialog>`: Esc closes them, focus goes back to what opened them, and the page behind can't be reached.
- Single-key shortcuts (`?` opens Settings) never fire while typing, while a pop-up is open, or with a modifier held. They can be switched off in Settings (2.1, 2.1.4).
- Key-cap hints show only on desktop with a mouse, and only when shortcuts are on.

**Seeing it**
- Text contrast is 4.5:1, and 3:1 for large text and for the edge of anything you can click or type in (`--c-edge`). Colours come only from `tokens.css`.
- Meaning is never carried by colour alone: errors have words and an icon, and the current tab also changes its background.
- Words live in the HTML, not in pictures. The drawings' labels repeat what the page says.
- Touch targets are at least 44px (`--tap`), and nothing is under 24px (2.2, 2.5.8).

**Motion and time**
- Under reduced motion, nothing animates: no page fades, the still hero picture shows, and smooth scroll is off.
- Without reduced motion, every loop has a pause button. Nothing flashes more than 3 times a second.
- Looping drawings pause when off screen.
- Nothing on the site times out.

**Forms**
- Every field has a visible label, and optional fields say "(optional)".
- Name, email and organisation fields carry `autocomplete`. Groups of radios use `fieldset` and `legend`.
- An error is written in words, tied to its field, and focus goes to the first problem.
- Nothing changes on its own when a field gets focus or a value is picked.
- Messages from the site (toasts, filter counts) are spoken through a polite live region.

**Text size and spacing**
- Settings (the gear) scales every `--fs-*` token by `--text`, from 100% to 200%. Only text grows; the layout keeps its scale (technique G178).
  - Saved as `uplink.text` and set before the first paint.
  - A box that pins its height to the screen gets a `:root[data-text]` rule so it grows instead.
  - A font size capped by the screen multiplies its cap by `var(--text)`.
- Browser zoom to 200% works with no loss (1.4.4). The window-scaled root font is on purpose (section 11).
- Text spacing (2.1, 1.4.12): with WCAG's line, letter, word and paragraph spacing applied, nothing clips or overlaps. A screen-tall box is a floor, not a cap, and content centres with `safe center` so it never slides under the header.
- Reflow (2.1, 1.4.10): every page works at 320px wide with no sideways scroll.

## 3. Display modes

- **No script:**
  - every page reads in full
  - the footer panels stack, and the hero shows a still picture
  - controls that need script (service arrows and dots, the settings gear) are hidden, not dead
  - The `js` class, set in the head, is the switch.
- **Reduced motion:** see section 2.
- **Forced colours (Windows contrast themes):**
  - text, borders, focus rings and form controls follow the system colours
  - drawings keep a dark plate behind them, so their labels stay readable in light themes
  - anything drawn with a background only (the current-tab bar, status dots, the settings switch) has a `forced-colors` rule using system colours
- **Print:**
  - dark ink on white (print tokens in `tokens.css`)
  - the header shows without its buttons
  - the footer, bottom bar, skip link, dialogs and the two self-building drawings stay off
  - cards and headings don't split across pages (`print.css`)
- **Phones:**
  - a bottom tab bar replaces the header tabs and slides away when you scroll down
  - safe areas (notch, home indicator) are respected
  - each drawing has its own phone cut
  - the footer becomes rows that open in place
- **Page transitions:** a soft crossfade between pages where the browser supports it. Off under reduced motion; elsewhere the next page just loads.

## 4. Security

**Response headers on every file** (`public/_headers`; the build fills in the hashes, `scripts/headers.mjs`):
- `Strict-Transport-Security: max-age=31536000`. `includeSubDomains; preload` comes after launch.
- A strict Content-Security-Policy:
  - `default-src 'self'`
  - scripts only from the site, plus Cloudflare's analytics beacon, with one hash for the inline `js` line
  - styles only from the site, plus hashes for inline `<style>` blocks; no `'unsafe-inline'`
  - `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`
  - `require-trusted-types-for 'script'`, with one policy, `uplink`
  - every block is reported (`report-to` and `report-uri`)
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.
- `Permissions-Policy`: camera, microphone, geolocation, payment and usb all off.
- `Cross-Origin-Opener-Policy: same-origin`.
- Mozilla Observatory: A+, 130, 12 of 12 (5 Nov 2026). A change that lowers that grade doesn't merge.

**Rules in the code**
- No `style=""` attribute anywhere; the build refuses one. Scripts set styles with `el.style.x`, and generators turn timings into classes.
- Script writes HTML only through `html()` from `core.js` (Trusted Types). The policy loads one outside script, the beacon, and refuses any other.
- A new outside host (fonts, a form service, a widget) means a CSP change in the same PR, and a privacy-page change if it handles visitor data.
- HTTPS only: `http://` gets a 308 to `https://` (the Worker today, the zone's Always Use HTTPS after launch).

**The Worker** (`worker/index.js`) answers `/api/*` and nothing else of its own. The error and CSP report endpoint:
- POST only
- this site's Origin only
- reports about other sites dropped
- 30 posts a minute per address (Cloudflare rate limit)
- stops reading a body past 8 KB
- logs one JSON line per report: the path without its query, the message, line and column only as whole numbers
- never logs form contents or the IP address. Tests in `scripts/test/worker.test.mjs`.

**Secrets and access**
- Secrets live in Cloudflare and GitHub, never in the repo. Names and places are in `docs/secrets.md`, with no values.
- GitHub Actions are pinned to commits. Dependabot runs weekly for npm, pip and Actions.
- `npm audit --omit=dev` shows nothing the site ships.
- Security contact: `/.well-known/security.txt` and `SECURITY.md`.

## 5. Privacy

- **The law:** PIPEDA (Canada), and CASL for the newsletter once it sends. `/privacy` (`src/data/privacy.md`) says what's collected, who handles it and where, how long it's kept, and your rights. Sources are in `docs/privacy-and-accessibility-2026-11-03.md`.
- **No cookies.** Analytics is Cloudflare Web Analytics: no cookies, loaded after the page.
- If a Cloudflare setting adds one (Bot Fight Mode's `__cf_bm`), the privacy page changes first.
- **Error reports carry no personal data.** The query is stripped, and form contents are never sent. The privacy page says Cloudflare's own run log holds the IP for 3 days.
- **The page stays true.** When the site starts collecting something new, or a processor changes, `/privacy` changes in the same PR.
- **Contact details on the privacy and accessibility pages are placeholders** filled from `footer.json`, never typed into the Markdown.

## 6. Performance

- **Target:** PageSpeed 100 on Home, on phone and desktop (`python tools/pagespeed.py <address>`).
- **Fonts:**
  - self-hosted WOFF2 with size-adjusted fallbacks, so text doesn't jump
  - only the first screen's fonts are preloaded, and sent early as Early Hints (103)
- **Caching:**
  - `/_astro/*` and the fonts are immutable for a year. A changed font gets a new file name.
  - Drawings are cached for a day, revalidating in the background.
  - HTML revalidates every time.
- **Size:**
  - CSS inlined by Astro; no script libraries
  - drawings shrunk by SVGO at build
  - card pictures use the card cut, about half the bytes
  - the hero and the footer map load the cut for the screen, and the map only when the footer comes near
- **Rendering:**
  - LCP is the hero text, not a picture
  - nothing on the first screen waits for script
  - looping animations stop off screen

## 7. Search and machine readers

- **Head tags on every page:** canonical (absolute, its own address), description, Open Graph and Twitter card.
  - `og:type` is `article` on a case study and `website` elsewhere.
  - The share image is `/assets/img/og.png`, 1200×630, with alt text.
- **JSON-LD:**
  - one `ProfessionalService` business block on Home, which every page points to by `@id`
  - each page adds its own type (`AboutPage`, `ContactPage`, `CollectionPage`, `Service` + `FAQPage`, `Article`) and a `BreadcrumbList`
  - Built from the content files, never typed by hand.
- **`sitemap.xml`:** every page, with `lastmod` from the last git commit that touched its sources.
- **`robots.txt`:** allows everything. While the site is a test build, `X-Robots-Tag: noindex` keeps it out of search, and `robots.txt` names no sitemap. Both flip at launch (`docs/launch-runbook.md`).
- **For AI agents:**
  - every page has a Markdown copy at its address plus `.md`, made from its `main`
  - `llms.txt` and `agents.md` give the map
  - Home's Markdown is hand-written (`src/data/index.md`)
  - `data-md-skip` leaves decorative parts out
- **Links:** root-relative, no `.html` (`/services`, `/contact#message`). Every link, picture and `#section` answers (`check_links.py`).

## 8. Code

- **Tokens:**
  - every colour, size and timing is a token in `src/styles/tokens.css`
  - spacing uses the `--sp-*` scale only (`docs/spacing.md`); lint refuses a raw value
  - colour roles follow `DESIGN.md`
- **CSS order:**
  - `global.css` sets the cascade, and a later file wins a tie
  - each section's CSS sits next to its component, with its desktop layout at the end of that file
  - after moving CSS, `tools/verify_styles.py` proves nothing on screen changed (every element, every page, four sizes)
- **Scripts:**
  - ES modules in `src/scripts/`, each importing `core.js`
  - a page adds its script inside `<Base>` (`slot="scripts"`)
  - storage reads can fail without breaking the page
  - script errors are reported to `/api/report`
- **Components:**
  - one component per section (`src/components/<page>/`)
  - icons through `<Icon>`
  - the shared head, header, footer and dialogs in `Base.astro`
- **Checks that must stay green:**
  - `npm run check` (types)
  - `npm run lint` (ESLint, Stylelint, Prettier on JSON/YAML)
  - `npm test` (the build steps and the Worker)
  - `verify_footer.py` (no script errors or CSP blocks, no sideways scroll, axe clean of serious findings)
  - `check_links.py`
  - Run them all with `npm run ci`.
- **Docs stay honest:** README, `src/README.md`, `CLAUDE.md` and `notes.md` change in the same PR as the code they describe.

## 9. Browsers and devices

- **Supported:** current Chrome, Edge, Firefox and Safari, plus iOS Safari and Android Chrome. Older browsers get a working page without the extras (view transitions, `:has()` touches, Trusted Types).
- **Screens:** 320px wide to 3440×1440. The four sizes every check uses are phone (390×844), tablet or small laptop (1280×720), 1440×900 and 3440×1440.
- **Engines:** the release audit runs Chromium, Firefox and WebKit, plus emulated phones. Real iPhone and Android checks are part of each release.

## 10. Hosting and running it

- Cloudflare Workers with static assets. The one Worker script handles `/api/*` (and, until launch, the http→https redirect).
- Every push runs CI. A push to `main` deploys; a PR gets a preview address and a screenshot comparison against live.
- Undo: `npx wrangler rollback`, which takes seconds.
- After a deploy: `python tools/smoke.py <address>` (every page, headers, redirects, 404).
- Watching: script errors and CSP blocks from real visitors land in the Workers logs (`/api/report`).
- Launch steps: `docs/launch-runbook.md`. What's left before launch: `docs/go-live-checklist.md`.

## 11. Decided on purpose (don't "fix" these in a review)

- **The root font follows the window,** so desktop zoom at 110–125% grows text only about 9%. 150% and up behaves normally, and Settings gives up to 200% (decided 3 Nov 2026).
- **No fallback timer** if the page's script never arrives. That's the visitor's setup failing; our own errors are caught by CI (decided 2 Nov 2026).
- **Card titles are link text, not headings,** on `/work`, `/services` and Home's tiles. Each card is one well-named link.
- **"What's included" and "Best for" are h2s** on service pages (`ServiceCard.astro` says why).
- **`FAQPage` markup stays** though Google shows it only for government and health sites.
- **The hero and Grow drawings don't print.** They build themselves with script and would print half-drawn.
- **CodeQL is off** while the repo is private (it needs a paid add-on), and ESLint covers the little code there is.
- **Forms send nothing yet** (paused 2 Nov 2026; PR #38). Their fields have no `name` until the endpoint lands, and the privacy page says so.
