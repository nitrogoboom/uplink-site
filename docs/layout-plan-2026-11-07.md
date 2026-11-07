# Layout plan: real zoom, less layout JavaScript

November 7, 2026. Status: **signed off by the owner, November 7, 2026: D1–D7 all as recommended** (text stays put on big screens; footer keeps tiles on `<details name>`, Prev/Next removed; bottom bar always visible; /work filters as radios; Proof band 500 px in CSS; phone captions stay in JS for now). Covers review items C1, C13, B4, B7, B13, B16, B18–B20, J7, L7, L8, M3 and C2 (`docs/review-2026-11-07.md`). Every claim was checked against the code, not the docs.

## What changes for visitors

- Browser zoom and the browser's own text-size setting work on every screen.
- Settings loses its Text size option. Keyboard shortcuts stay in Settings.
- Headings never break mid-word ("CYBERSECURIT / Y").
- The footer keeps its look. It is built on the browser's own open/close element (`<details>`): it works without JavaScript and never loses keyboard focus.
- There is one main menu: in the header on wide screens, in the bottom bar on phones. The bar is always visible.
- The /work filters work without JavaScript.
- **The one visible change:** on big desktop screens, text stops growing with the screen. Pictures, gaps and page width still grow, so each section still fills one screen.

## Decisions for the owner

| # | Question | Recommended | Other choice |
|---|---|---|---|
| D1 | Should text grow on big screens? | **No.** Text sizes follow only the visitor (zoom and their font setting). Pictures and space follow the screen. | A small capped boost (112–125%) on very large screens. Cost: at 200% zoom those screens get only about 160% text. That is the C1 bug again, just smaller. |
| D2 | Footer | **Keep the tile look, built on `<details name>`.** | Plain link columns (the most common footer, and the least code). |
| D3 | Footer's Prev/Next key-cap buttons | **Remove.** Tab and Enter do the job. | Keep them, with about 10 lines of JS. |
| D4 | Bottom bar slides away when you scroll down | **Remove that.** The bar is always shown. | Hide on scroll in Chrome only, with CSS (`scroll-state`). |
| D5 | /work filters | **Radio buttons.** They work without JS, and screen readers hear "Build, 2". | Keep the buttons and `work.js`. |
| D6 | Home "Proof" band height on desktop | **Fixed at 5 wheel steps (500 px), in CSS.** About 95 px more air than today. | Keep the JS that rounds it. |
| D7 | Home phone captions over the drawing | **Keep in JS for now.** | Later: plain HTML captions over the drawing. This changes the design slightly. |

## The rules of the new layout

1. **Text sizes use `rem` only.** The visitor's zoom and font setting decide text size.
2. **Screen size may scale pictures, gaps and page width** (`svh`, `vw`). It never scales text.
3. **Headings and big numbers fit their column.** They use `cqi` (1% of the column's width), with a minimum and maximum in rem. The maximum is at most 2.5 × the minimum. That keeps 200% text reachable.
4. **A box sized to the screen sets a minimum height, never a fixed height.** If the content needs more room, the box grows.
5. **Breakpoints use `em`.** Zoom and a bigger default font then behave like a narrower screen, and the checks already test every width from 320 px up.
6. **JS only places things inside drawings. CSS lays out the page.**

## 1. Inventory: JavaScript that decides layout

| # | Where | What it decides | Verdict | How |
|---|---|---|---|---|
| 1 | `core.js` 237–247, `Base.astro` inline script | Text size (`html[data-text]`) | **Delete** | C13. The inline script keeps only `classList.add('js')`. |
| 2 | `core.js` 315–343 | Bottom bar slides off on scroll; shows on tablets with big text | **Delete** | D4. The bar is always shown. |
| 3 | `footer.js` 144–167 | Tabs on wide screens, rows on phones; moves panels in the DOM; swaps ARIA roles | **Delete** | Six `<details name="footer">` in reading order on every screen. CSS places the open one. |
| 4 | `footer.js` 75–103 | Selected tab, roving tabindex, arrow keys, centring the tile row, Prev/Next | **Delete** | Native `details[open]`, with Tab and Enter. |
| 5 | `footer.js` 110–143 | Phone rows grow and shrink; hidden/inert after the animation; scrolls the page frame by frame so the row stays put | **Delete** | Animate `::details-content` with `interpolate-size`. Use the browser's own scroll anchoring: drop `overflow-anchor: none`. |
| 6 | `footer.js` 46–49 | Words on the map label | **CSS** | Put all six labels in the markup; `.fc:has(#fc-x[open])` shows one. |
| 7 | `footer.js` 22–66 | Map fetch, lit spot, camera (SVG viewBox) | **Keep** | Listens for `toggle` events instead. It is decoration. |
| 8 | `home.js` 350–394 | Which hero drawing to fetch for this screen | **Keep** | It loads a file, and `<picture>` can't inline an SVG. Its media queries switch to em. |
| 9 | `home.js` 89–99 | Cloud status dot follows the word's width | **Keep** | Or make the dot a ● inside the same `<text>`, so nothing needs measuring. |
| 10 | `home.js` 153–349 | Phone captions: measures text, places it in drawing units | **Keep (D7)** | B16 goes away with C13. Zoom already triggers a re-measure (ResizeObserver). |
| 11 | `home.js` 411–457 | Services row: which card sits on top (`.is-centre`), dots, arrows, keys | **Trim** | `z-index` moves into the scroll-driven keyframes (Chrome, Safari 26). The JS stays as the fallback for Firefox and for dots and arrows. |
| 12 | `home.js` 459–482 | Proof height rounded to wheel steps | **Delete** | D6: `min-height: calc(5 * var(--wheel-step))`. |
| 13 | `grow.js` 46–67, 213 | Tags pinned to points on the drawing | **Keep** | A ResizeObserver on the stage replaces `resize`. Anchor positioning can't pin to a point inside an SVG. |
| 14 | `grow.js` 70–92 | Camera (viewBox animation) | **Keep** | Later: J4/J5. |
| 15 | `grow.js` 161–177 | Which card shows, dots, arrows | **Keep** | This is player state, not layout. `aria-disabled` (B14) is in batch 2b. |
| 16 | `work.js` (all of it) | Filters hide cards, pressed state, live count | **Delete** | D5: a radio group plus `:has()`. |
| 17 | `contact.js` 39–49 | Queue card text after sending | **Keep** | Content, not layout. |

## 2. `[data-text]` and `var(--text)` rules (about 70 lines in 16 files)

Every one of these goes. Five of them are good fixes anyway, so they become the normal rule (marked ★).

| File | Rules | Verdict |
|---|---|---|
| `tokens.css` | `--text`, the multiplier on `--fs-1`…`--fs-8` and `--fs-hero-phone`, the 4 `data-text` values, the tablet `--fold-h`, `:not([data-text])` on `--fold-pitch` | Delete. `--fold-pitch` applies unconditionally. |
| `layout.css` | `.fold { justify-content: safe center }` | ★ Becomes the normal rule. Zoom can overflow a fold too. |
| `header.css`, `bottom-nav.css` | Hide the tagline and button words, scroll the tabs, tablet bottom bar, bigger bar icons | Delete. Em breakpoints handle zoom. |
| `footer.css` | Bigger tiles, one-column wall, the h3 cap, footer height `auto` | ★ Tile minimum sizes become normal. The rest is deleted. The h3 uses `--fs-8`. |
| `hero.css`, `services.css`, `projects.css`, `profile.css`, `home/work.css` | Pinned heights let go | Replaced by rule 4 (minimum heights). ★ `.svc-title` hyphens become normal. |
| `shared-blocks.css`, `surfaces.css` | Card rows stack on phones | Delete. |
| `.stat-val`, `message.css` queue ring | Caps × `--text` | Replaced by column sizing (section 5). |
| `grow.css` | Team count moves; tags wrap | ★ Tag wrap becomes normal. The team move becomes `@container (width < 22rem)`. |
| `buttons.css` `.chip`, `service-card.css` `.tags` | Chips wrap | ★ Becomes normal. |

## 3. Navigation as CSS

| Piece | Today | After |
|---|---|---|
| Header tabs | CSS. Pixel breakpoints, plus extra `[data-text]` rules | CSS with em breakpoints |
| Bottom bar | A second `<nav>`, last in the page (tab 43 of 47); JS hides it on scroll | **The same `<nav>` as the header.** On phones its list is `position: fixed` at the bottom. It becomes about tab 3. No JS. |
| Footer sections | JS tab widget or JS accordion; panels moved in the DOM; 5 `<nav>` landmarks | One `<nav aria-label="Footer">` holding six `<details name="footer">`. Desktop: the summaries are the tile row, and the open one fills the stage. With nothing open, Contact shows (`:not(:has([open]))`). Phones: rows open in place. |
| Footer legal links | Their own `<nav>` | A list inside the footer nav |
| Home services row | CSS swipe and snap; JS for the top card, dots, arrows | The top card is CSS where supported; the JS stays for dots and arrows |
| /work filters | JS buttons, hidden without JS | Radio group, CSS only |

Navigation landmarks per page go from 7 to 2 (Main and Footer).

## 4. Root sizing

**Today, at screens ≥ 1100 × 700** (`tokens.css` 249): `html { font-size: clamp(14px, min(1.1111vw, 1.7778vh), 40px) }`. Because this is in `px` and tied to the screen, zoom mostly shrinks the screen and the text barely grows. The visitor's own font setting is ignored.

| Screen | Body text today | After (D1) | 150% zoom today → after |
|---|---|---|---|
| 1280 × 720 | 14 px | 16 px | – |
| 1440 × 900 | 16 | 16 | – |
| 1920 × 1080 | 19.2 | 16 | +9% → **+50%** |
| 2560 or 3440 × 1440 | 25.6 | 16 | small → **+50%** |

**Token changes:**

```css
/* tokens.css. Before */
--text: 1;
--fs-3: calc(1rem * var(--text));                                    /* and --fs-1 … --fs-6 the same way */
--fs-7: calc(clamp(2rem, 1.35rem + 2.2vw, 2.75rem) * var(--text));
--fs-8: calc(clamp(2.75rem, 1.6rem + 4.4vw, 4.5rem) * var(--text));
@media (--fold) { html { font-size: clamp(14px, min(1.1111vw, 1.7778vh), 40px); } }

/* After. No font-size on html: 1rem is the visitor's own size (16 px unless they changed it) */
--fs-1: 0.75rem; --fs-2: 0.875rem; --fs-3: 1rem; --fs-4: 1.125rem; --fs-5: 1.375rem; --fs-6: 1.75rem;
--fs-7: clamp(2rem, 1.25rem + 4cqi, 2.75rem);    /* section headings follow their column */
--fs-8: clamp(2.25rem, 1rem + 10cqi, 4.5rem);    /* page headings; maximum ≤ 2.5 × minimum */
--fit: 14cqi;                                     /* a 13-letter word ("Cybersecurity") fits its column */
--fs-hero-phone: 2.5rem;
@media (--fold) {
  :root {
    --container: max(94rem + 2 * var(--gutter), 85vw);   /* wide screens: more room for pictures, same text */
    --fold-pad: clamp(var(--sp-5), 5svh, var(--sp-8));   /* space round a one-screen section follows the screen */
  }
}
```

```js
// src/lib/media.js: the same pixels at a 16 px default, but they follow the visitor's font setting
smallPhone: '(width < 37.5em)', phone: '(width < 43.75em)', tabletUp: '(width >= 43.75em)',
tablet: '(43.75em <= width < 68.75em)', belowDesktop: '(width < 68.75em)', desktop: '(width >= 68.75em)',
fold: '(width >= 68.75em) and (height >= 43.75em)',
```

**Keeping one section per screen on desktop:**

- `.fold` keeps `min-height: var(--fold-h)`. That value uses `svh`, not text size.
- `fold.css`: `--fold-inner` uses `--fold-pad`. The "short laptop" media query goes.
- Sections with a fixed height get a minimum height instead, with the picture taking what is left (`flex: 1; min-height: <rem floor>`). These are: About profile, Home work, /work grid, footer.
- Picture caps in rem become screen caps, so pictures still fill big screens. These are: hero 56rem, Grow `--grow-stage-max` 44rem, footer map 26rem. Example: the hero becomes `min(var(--fold-inner), 60vw)`.
- The wheel grid (`--fold-pitch`) stays.
- **Risk:** at 1280 × 720, text is 14% bigger than today, so some folds may outgrow one screen. They grow rather than clip. Screenshots decide.

## 5. Headings and numbers sized to their column (B18, B19, B20, B7)

- Mark each heading's column `container-type: inline-size` in CSS:
  - `.hero-menu`, `.work-side`, `.picker-head`, `.section-head`, `.fc-panel`, `.stat`, `.queue-ring`, `.lobby > *`, `.card`.
  - Only boxes that take their width from their parent. On a shrink-to-fit box (for example `.svc-text`, which is centred), it collapses to zero width. Not on `.site-header`.
- `h1 { font-size: min(var(--fs-8), var(--fit)) }`. Same for `h2` with `--fs-7`. Add `hyphens: auto` as a backup. A long word now shrinks to fit instead of splitting.
- Stats:
  - `.stats { grid-template-columns: repeat(auto-fit, minmax(min(100%, 9rem), 1fr)) }`
  - `.stat-val { font-size: clamp(var(--fs-6), 30cqi, var(--fs-8)); white-space: nowrap }`
  - Columns have a rem minimum, so zoom gives fewer, wider tiles, and the number grows with them. No more "3,40 / 0".
- Contact queue ring:
  - `.queue-ring { width: min(100%, 11rem) }`
  - `"1 day"` gets `font-size: min(var(--fs-7), 22cqi); white-space: nowrap`.
  - This also closes B7 (wider text spacing).
- The rest of B20: `min-width: 0` on `.feat` text and `.facts dd`; the privacy table gets hyphens and narrower columns. The `.cta-band` squeeze was caused by the text option only, so it is moot.

## 6. Browser support (target: Safari/iOS last two, Firefox ESR 140 and later, Chrome/Edge current)

| Feature | Chrome/Edge | Safari | Firefox | Without it |
|---|---|---|---|---|
| em and range media queries | 104 | 16.4 | 63 | – |
| Container queries, `cqi` | 105 | 16 | 110 | `cqi` falls back to the screen width (today's behaviour) |
| `:has()` | 105 | 15.4 | 121 | /work shows every project; footer: no default Contact panel |
| `<details name>` (one open at a time) | 120 | 17.2 | 130 | Several footer rows can be open |
| `::details-content` | 131 | 18.4 | 143 | Desktop footer shows the stacked rows. ESR 140 gets this. |
| `interpolate-size` (animating to `auto`) | 129 | no | no | Rows open instantly, as with reduced motion |
| `safe` centring | 115 | 17.6 | 63 | Centres as today |
| `round()` (wheel grid) | 125 | 15.4 | 118 | No wheel grid (as today) |
| Scroll-driven animation | 115 | 26 | flag only | JS `.is-centre` (kept) |
| `prefers-contrast`, `forced-colors` | 96 / 89 | 14.1 / – | 101 / 89 | Normal colours |
| `@layer` | 99 | 15.4 | 97 | – |
| Not used: anchor positioning, `::scroll-marker`, `scroll-state()` | | | | Missing from Firefox ESR or Safari, or can't target points inside SVG |

## 7. What this closes, and what becomes moot

| Item | Result |
|---|---|
| **C1** zoom, **C13** text option | Closed (phases 1, 4). |
| **B18** headings split mid-word | Closed by column sizing (phase 3). |
| **B19** queue card, **B20** squeezes and splits | The parts caused by the text option are moot. The rest is fixed by column sizing and `min-width: 0` (phase 3). |
| **B7** queue ring with text spacing | Closed (phase 3). |
| **B16** script-placed text stale after text change | **Moot.** There is no text option, and zoom triggers re-measures. |
| **J7** footer tabs/accordion | Closed (phase 5). |
| **B14** footer focus lost on resize | **Moot.** Nothing moves in the DOM. (Grow and toast parts stay in batch 2b.) |
| **L7** 7 nav landmarks; bottom bar last in tab order; nested `<aside>` | Closed (phases 5, 6, 8). |
| **M11** footer Prev/Next, filters pick-one | Footer part moot (buttons go). Filters closed (radios). Grow part stays in batch 2b. |
| **M3** card titles as headings | Closed (phase 8). Title is a `<h2>`/`<h3>` holding the link, stretched over the card with `::after`. `<Pause/>` leaves cards. |
| **M10** hidden chips | Closed with M3: the chip becomes plain text in the card, not part of the link. |
| **B4** forced colours | Closed (phase 9). One `@media (forced-colors: active)` block for: checked filter, pressed Grow item and dots, service pips, pressed pause icon, current nav item, open footer row. The "selected text size" state no longer exists. |
| **L8** more contrast | Closed (phase 9). `prefers-contrast: more` raises `--c-line` to `--c-edge` (3:1) and lightens `--c-muted`. |
| **B13** Grow at 320 px | Closed (phase 10). `.grow-player { grid-template-columns: minmax(0, 1fr) }`; tighter dot gaps under 22.5em. |
| **J11** text-size regex in two places, **J12** back button shows old text size | Moot. |
| **`checks/text.spec.mjs`** | Its trigger (localStorage text size) goes. Its clip/overlap/out-of-reach test becomes a **zoom check** (phase 4). |
| **C2** `@layer` | **Same project, separate last PR (phase 11).** It should change nothing, and that is only provable alone. Trap: the drawings' own `<style>` blocks have no layer, so they would beat every layered site rule. The pause rule is `!important`, so it still wins, but check each rule that styles inside a drawing. |
| Part of **C7** | Range syntax for breakpoints (phase 0). |

## 8. Phases (one PR each)

"No-move check" means `npm run verify:styles -- OLD NEW` with zero differences. "Pixel check" means `npm run visual-diff -- OLD NEW --strict`, with 1280 × 720 and 2560 × 1440 added to its sizes.

| Phase | Change | Closes | Risk | Verify |
|---|---|---|---|---|
| 0 | Breakpoints in em: `media.js`, the one-off queries (900, 560, 800, 780, 940, 820, 760, 339 px), `<source media>` | C7 (part) | Low | No-move check |
| 1 | Drop the text option. Promote the 5 ★ rules. Delete the other `[data-text]` rules. Add the C1 quick floor (`max(100%, …)`) if batch 2b hasn't, so zoom never gets worse. | C13, B16, J11, J12 | Low | No-move check (only the ★ rules may differ; list them in the PR). `verify` (header fit) at the default size only. |
| 2 | Minimum heights instead of fixed heights; pictures `flex: 1` with a rem floor | prepares C1 | Low–medium | Pixel check: 0 changed pixels at the default size |
| 3 | Column-sized headings and stats; queue ring; `min-width: 0` fixes | B18, B19, B20, B7 | Medium | Site check 320–3440; screenshots of /services/security at 1024–1099 and Contact at 1100–1920; text-spacing bookmarklet |
| 4 | **Root to rem**; container width and fold space follow the screen; picture caps from rem to `svh`/`vw`; `text.spec` becomes `zoom.spec` | **C1** | **High (visible). Owner signs off screenshots.** | Before/after at 1280×720, 1440×900, 1920×1080, 2560×1440, 3440×1440. Zoom check: emulate 200% and 400% zoom (screen ÷ zoom, `deviceScaleFactor` × zoom) and a 24/32 px default font (CDP `Page.setFontSizes`); clip/overlap/out-of-reach test plus sideways scroll; root equals the default font size. |
| 5 | Footer on `<details name>`; one footer nav; map follows `toggle` | J7, B14, L7, M11 | Medium | Keyboard walk; resize with focus inside the footer (focus never lands on `<body>`); screen-reader tree; axe; 390/820/1440 screenshots; real iPhone and Firefox by hand |
| 6 | One main nav for header and bottom bar; always shown | L7 | Medium (view transitions, sticky header) | Header-fit check every 10 px; first nav link within 5 Tabs on phones; page transition still smooth |
| 7 | /work filters as radios; delete `work.js` | M11, B4 (part) | Low | Works with JS off; axe; forced-colours screenshot |
| 8 | Cards as headings (services, work, Home tiles, news); top-level `<aside>` on /about | M3, M10, L7 | Medium (hover and focus ring move to `.card:has(…)`) | Heading list per page; pixel check (only focus and hover should differ) |
| 9 | `preferences.css`: reduced motion, forced colours, more contrast | B4, L8 | Low | Playwright `forcedColors: 'active'`, `contrast: 'more'` screenshots |
| 10 | Proof height in CSS; services `z-index` in keyframes; Grow ResizeObserver and B13; drop the two `@property` caption lines | B13, D6 | Low | New wheel-grid check (every Home section top on a multiple of 100 at the six desktop sizes); 320 px with no sideways scroll |
| 11 | `@layer` declared once in `global.css`; drop "keep hero.css after fold.css"; fewer `!important` | C2 | Medium | No-move check |

## 9. What gets deleted (estimate)

| What | Lines |
|---|---|
| `footer.js` tabs, rows, keys, scroll keeping | −100 (204 → ~105) |
| `core.js` text size and bar hiding | −40 |
| `work.js` | −30 (file gone) |
| `home.js` Proof rounding | −24 |
| **JavaScript total** | **about −195 of 1,449 (1 in 7)** |
| `[data-text]` and `--text` CSS, plus their comments | about −90 (+15 promoted) |
| `footer.css` rows mode; `bottom-nav.css` tablet and hiding rules | about −55 |
| `BottomNav.astro` (merged into the header), Settings text-size fieldset | −27 |
| `text.spec.mjs` 122 → zoom check ~90; header-fit "text 2" run | −35 |
| CLAUDE.md | Remove the "Text size" rule and the `verify:text` lines. Add three one-line rules: text in rem; boxes set minimum heights; breakpoints in em (`media.js`). |
| Docs to fix in the same PRs | `src/README.md` (breakpoints, Settings), `docs/spacing.md` line 9 ("the root grows"), `docs/fold-wheel-grid-2026-11-04.md` (Proof), `src/data/privacy.md` (`uplink.text` row) |

**What stays in JS, and why:** it only places things inside drawings. That means the hero cut and captions, the Grow tags and camera, and the footer map camera. Also kept: the services row dots and arrows (input handling, and the Firefox fallback).

## Not in this plan

J3–J5 (Grow camera in CSS), J8 (`commandfor` dialogs), phone captions as HTML (D7), CSS carousel markers. These are batch 4 or later.
