# Light theme, Home: contrast review (November 8, 2026)

A WCAG 2.2 colour-contrast review of Home in the light theme, with the dark theme measured the same way for comparison. > **Note:** Applied on November 8, 2026: the WCAG fixes and the faint edges (items 1–5 on Home, S1–S2 on the other pages), with one more found by the site check's dot test in light: Grow's dots for steps already shown (1.35:1, now amber ink at 0.8, 3.8:1). The page and band went one step greyer and cards solid white (`docs/light-theme-2026-11-08.md`). The optional items are still open.

At the time of writing, nothing here was applied. Each item has a small, measured fix to accept or skip. Once Home is settled, the same fixes apply to the rest of the site.

## How it was measured

Axe misses faded text, gradients, and words drawn on pictures, so this run measures pixels instead:

1. Home, light and dark, at 1440×900 and 390×844, 2× pixels, reduced motion. Grow is measured at each of its six steps.
2. For every visible run of text: the background comes from a screenshot with all text made transparent, so glows, translucent cards and drawings count. The text colour is the glyph pixel farthest from that background, so opacity and fades count.
3. Controls: their fill and edge against what's around them (WCAG 1.4.11, 3:1 for what you need to see to find a control or its state).
4. Numbers below are WCAG contrast ratios. Body text needs 4.5:1, large text 3:1, a control or its state 3:1.

**Result:** all of Home's text in the light theme passes, except the item in 3. The lowest passing text is 5.7:1. The problems are state markers (amber on white), one faded block, and edges that almost disappear.

## Fix: fails WCAG in light only

| # | Where | Light | Dark | Proposed fix | After |
| --- | --- | --- | --- | --- | --- |
| 1 | **Current dot**, phone: Services row and Grow dots (`.pip.on`) | amber `#FFAD51` on the page: **1.55–1.72** | 8.9 | In light, the current dot takes `--c-accent-text` (`#88520A`) | 5.4–6.0 |
| 2 | **Grow, the open step**: its amber border and number tile (`.grow-item[aria-current]`) | border **1.72** | 9.5 | In light, the border takes amber 500 (`#C37600`); the tile stays amber, its number is text at 9.5:1 | 3.3 |

Both are the only thing that shows "you are here", so WCAG 1.4.11 asks for 3:1. In dark, bright amber on navy is strong. In light, the same amber on near-white is the weakest mark on the page. The site's own dot check (`non-text contrast … 3:1`) would catch item 1, but the site check now runs on a dark device only. Adding a light pass to that one test would hold the fix.

## Fix: the "really light" faded area

| # | Where | Light | Dark | Proposed fix | After |
| --- | --- | --- | --- | --- | --- |
| 3 | **Grow card, "Watch for" row** once a step turns to fixes: label and text fade (`opacity: 0.45`) | text **2.08**, red label **2.00** | 3.0, 2.5 | In light, fade to `0.65`: the same strength as dark | text 3.0, label 2.8 |
|   |   |   |   | Or `0.85`, to pass AA | text 4.7, label 4.0 |

This is the "fades much more than dark" you saw. A fade works by mixing the text with the page. Light grey text is already close to a light page, so the same opacity costs more in light than it does in dark. The fade is on purpose (the risk is handled), and it fails in dark too (3.0). **0.65** is the smallest change: it makes light match dark. **0.85** passes outright.

## Should fix: edges that disappear

| # | Where | Light | Dark | Proposed fix | After |
| --- | --- | --- | --- | --- | --- |
| 4 | **Hero news cards** ("Free check-up", "Windows 10"): border is `--c-cool-surface-2`, almost the card's own fill | edge **1.01**, card vs page 1.04 | 1.3 | In light, give `.news` a `--c-line` border | 1.25 |
| 5 | **Card edges** across Home (service tiles, project cards, check-up panel): `--c-line` at 0.12 | 1.25 | 1.3–1.5 | Light `--c-line` 0.12 → 0.16 | 1.35 |

Neither is a WCAG requirement: the words and links identify these cards. But together they make the hero cards look like pale smudges, and the card grid read as washed out. Both are one-line token changes.

## Optional: the very bright areas

| # | Where | What you see | Proposed fix |
| --- | --- | --- | --- |
| 6 | **Big service tiles, check-up panel** | Large near-white (`#F8FAFB`) panels on the grey band: most of the page's glare. Contrast to the band is only 1.13, so they read as bright, empty blocks. | Leave the fill, and let item 5's stronger edge give them shape. Or lower `--c-surface` 0.72 → 0.55 (`#F4F6F9`), a touch less white. |
| 7 | **Amber buttons** ("Get started", "Book a check-up") | Bright amber on near-white, edge 1.66. It passes: the dark label is 9.5:1. It's the loudest thing on the page, which is its job. | Optional: in light, a 1px amber 500 (`#C37600`) border, so the button has an edge, not a glow. |
| 8 | **Footer map, the amber tower** | The biggest amber area on the page. On navy it reads as lit; on white it shouts. | Leave it. It's decoration (`aria-hidden`), and palette rule 1 allows colour in drawings. Revisit with the full-site pass. |

## Checked and fine

- **Every heading, body line, label and link** in the light theme: 5.7:1 or better. Drawing labels: 6.0–9.0:1.
- **"View service" bars on the service tiles**: hidden until hover or focus, then amber ink on the page, 6.0:1. (The audit first listed them at 1:1 because they're hidden.)
- **Footer on phones**: the closed sections' links aren't shown until opened. (The same 1:1 listing for the same reason.)
- **Grow tags** (white on red and green): 5.6 and 9.7. The tick inside the green tag: 5.7.

## In both themes, not light-specific

- The header's ghost buttons ("Get support", "Client portal", the gear) and the phone-number button have a `--c-line` edge: 1.18 light, 1.51 dark. Palette rule 6 says a ghost button's edge should be `--c-edge` (3:1). The words identify them, so it passes WCAG, but it's a site-wide palette gap, not a light one.

## Suggested order

Items 1, 2 and 3 (0.65) are three small CSS rules in `src/styles/theme-light.css`, with no change to dark. Items 4 and 5 are two token lines. That's the whole "don't make big adjustments" set. Items 6 and 7 are a judgement call after seeing 1 to 5 on the preview.
