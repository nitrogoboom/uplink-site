# Design rules

*Last updated: November 9, 2026*

This page holds the rules you need when you style the site: colours, spacing, line height, corners, and layout. Every value is a token in `src/styles/tokens.css` (dark) and `src/styles/theme-light.css` (light). The tokens are the truth: when this page and a token disagree, fix this page.

> **Note:** The portable Navy & Amber spec (how to apply the palette to documents, slides, email, and print) is kept as a record in [`history/palette-1.2.md`](history/palette-1.2.md). Why each light value is what it is: [`history/light-theme-2026-11-08.md`](history/light-theme-2026-11-08.md).

## Colour

### Intent

- A calm, reliable technology firm. The drawings and one warm action colour carry the personality; text and grounds stay quiet: "the art can be colourful; text and controls should be coloured like a bank's".
- Dark first. Light is a full mode of its own, not an inversion.
- Balance by area: about 60% neutrals, 30% the blue family, 10% or less amber. Status colours appear only where there is a status.

### Colour rules

1. **One amber fill per view.** Amber means "do this". Don't use it for decoration, status, or emphasis.
2. **Amber fill vs amber ink.** Bright amber is a fill with a dark label. Amber words, icons, and marks use `--c-accent-text`, which is darker in light mode.
3. **Links are blue, not amber.** Links in body text are underlined (`--c-line-2`).
4. **Status is never colour alone.** Every status message carries an icon and a word. Amber and red, and green and red, merge for some colour-blind readers.
5. **Error text placement.** On the page and band grounds an error message can be all `--c-alert`. On cards, dialogs, and hover fills, only the word "Error", the icon, and a 1px border use it; the message uses `--c-text`. Error text is 16px or larger, weight 500 or more.
6. **Edges that matter use `--c-edge`.** Inputs, selects, and ghost buttons need 3:1. `--c-line` and `--c-line-2` are decoration only. With `prefers-contrast: more`, `tokens.css` raises both lines to `--c-edge`.
7. **Focus** is a 2px solid `--c-accent-text` outline with a 2–3px offset. `--c-accent-ring` may sit outside it as a halo, never instead of it.
8. **No crimson**, and no red ramp step 700 or darker, anywhere outside the logo.
9. **No new colours.** No extra tints or "10% variants". If you need one, mark the spot `DESIGN-GAP: WHAT_WAS_MISSING` and say so in your report.
10. **Headline accent.** One word in a headline may take `--c-accent-text`. One word, no glow, no underline.
11. **Cards.** Border `--c-line`, fill `--c-surface`, even on all four sides. No coloured left-edge accent. At most one selected card, shown with `--c-accent-tint` plus a label.
12. **Grounds stay calm.** Grounds and text stay under OKLCH chroma 0.04. Saturation belongs to the action, status, and drawing roles.
13. **Light mode is its own mode.** Every neutral is navy-tinted (hue 250); pure white only on the top layer (dialogs, toasts, menus). A card is the ground lifted (`#F8FBFF`), flat, with no gradient, and separated by `--shadow-card` (navy shadows plus a 1px top highlight), not by darker borders. A mark that says "chosen" or "you are here" is amber ink, never the bright fill (under 3:1 on white); an amber button keeps its fill and takes a 1px `#C37600` edge. Fade grey text less than in dark mode: about 0.65 where dark uses 0.45.

### Logo

- Two fixed colours: blue `#1F75A6` and crimson `#8D242E`. Crimson lives inside the logo only.
- Copy the logo files; never retype SVG path data or recolour them. White wordmark on dark grounds, `#15181C` on light grounds; below 120px wide, use the triangle mark alone. Clear space: 25% of the mark's width.
- The files are in `Documents/Design.MD/svs-design/assets/logo/` on the owner's computer, not in this repository.

### Roles and tokens

Use the token, never the hex. Each role has one job; a second job needs a second role.

| Role | Token | Dark | Light | Job |
| --- | --- | --- | --- | --- |
| page | `--c-bg` | `#0E1A27` | `#E8EFF7` | page ground |
| band | `--c-bg-band` | `#14202D` | `#DCE5EE` | alternate section band |
| raised | `--c-solid` | `#222E3A` | `#FFFFFF` | opaque top layer: dialogs, toasts, menus |
| surface | `--c-surface` | `rgb(242 247 252 / 0.05)` | `#F8FBFF` | card and panel fill |
| surface-hover | `--c-surface-2` | `rgb(242 247 252 / 0.09)` | `rgb(34 46 58 / 0.06)` | hover, selected, icon tile |
| well | `--c-well` | `rgb(0 0 0 / 0.18)` | `rgb(34 46 58 / 0.045)` | input fill, image well |
| line | `--c-line` | `rgb(242 247 252 / 0.1)` | `rgb(34 46 58 / 0.13)` | decorative divider, card border |
| line-strong | `--c-line-2` | `rgb(242 247 252 / 0.18)` | `rgb(34 46 58 / 0.24)` | soft divider, hover border, link underline |
| edge | `--c-edge` | `rgb(242 247 252 / 0.46)` | `rgb(34 46 58 / 0.58)` | border of anything you click or type in (3:1) |
| text | `--c-text` | `#F2F7FC` | `#0E1A27` | body text, headings |
| text-muted | `--c-muted` | `#BBC2C9` | `#4D5863` | secondary text |
| glass | `--c-glass` | `#0E1A27` | `#E8EFF7` | sticky header (solid, no blur) |
| glass-raised | `--c-glass-2` | `#202C38` | `#F8FBFF` | phone bottom bar (solid, no blur) |
| backdrop | `--c-backdrop` | `rgb(14 26 39 / 0.62)` | `rgb(34 46 58 / 0.4)` | scrim behind pop-ups |
| card-shadow | `--shadow-card` | none | `theme-light.css` | a card at rest in light mode (rule 13) |
| action | `--c-accent` | `#FFAD51` | `#FFAD51` | amber fill: primary button, selected tile |
| on-action | `--c-on-accent` | `#0E1A27` | `#0E1A27` | label on the amber fill (9.5:1) |
| action-ink | `--c-accent-text` | `#FFAD51` | `#88520A` | amber words, icon strokes, focus outline |
| action-tint | `--c-accent-tint` | `rgb(255 173 81 / 0.14)` | `rgb(255 173 81 / 0.18)` | selected card or chip fill |
| action-faint | `--c-accent-faint` | `rgb(255 173 81 / 0.06)` | `rgb(255 173 81 / 0.08)` | highlighted table column |
| action-ring | `--c-accent-ring` | `rgb(255 173 81 / 0.3)` | `rgb(136 82 10 / 0.3)` | focus halo beside the outline |
| on-action-tint | `--c-ink-tint` | `rgb(14 26 39 / 0.08)` | `rgb(14 26 39 / 0.16)` | dark chip on the amber fill |
| link | `--c-sky` | `#97C8EA` | `#005D8A` | links and info text |
| link-tint | `--c-sky-tint` | `rgb(151 200 234 / 0.16)` | `rgb(0 93 138 / 0.07)` | info message and chip fill |
| success | `--c-ok` | `#A9E9C3` | `#004F2E` | success and online text and icon |
| success-tint | `--c-ok-tint` | `rgb(169 233 195 / 0.16)` | `rgb(0 79 46 / 0.1)` | success message and chip fill |
| error | `--c-alert` | `#FF897E` | `#B24438` | error text and icon |
| glow-warm | `--c-glow-accent` | `rgb(255 173 81 / 0.07)` | `rgb(255 173 81 / 0.12)` | warm light behind a main call to action |
| glow-cool | `--c-glow-sky` | `rgb(151 200 234 / 0.09)` | `rgb(0 93 138 / 0.07)` | cool light behind a drawing |
| glow-cool-2 | `--c-glow-sky-2` | `rgb(151 200 234 / 0.11)` | `rgb(0 93 138 / 0.08)` | stronger cool glow (map, footer) |
| cool-surface | `--c-cool-surface` | `rgb(216 239 255 / 0.05)` | `rgb(216 239 255 / 0.4)` | panel inside a cool-lit area |
| cool-surface-hover | `--c-cool-surface-2` | `rgb(216 239 255 / 0.1)` | `rgb(216 239 255 / 0.7)` | its hover |
| cool-text-muted | `--c-cool-muted` | `#ADC5D6` | `#455A69` | secondary text on cool surfaces |

`tokens.css` also holds the print inks (`@media print`). In forced colours (Windows contrast themes), a state shown only by a fill opts out with `forced-color-adjust: none` and takes system colours; see "Styles" in [`src/README.md`](../src/README.md#styles).

### Ramps

Raw sources: components use roles, not ramp steps. One anchor hue, the logo blue (OKLCH hue 239.4). Neutrals sit at hue 250, amber at 66 (near the blue's complement), green at 158, red at 29; green and red are for status only. All five share one lightness ladder: 50 0.975 · 100 0.94 · 200 0.88 · 300 0.81 · 400 0.73 · 500 0.635 · 600 0.535 · 700 0.455 · 800 0.375 · 900 0.295 · 950 0.215. `tools/palette.py` holds the hues and the neutral ramp.

| Step | Neutral | Blue | Amber | Green | Red |
| --- | --- | --- | --- | --- | --- |
| 50 | `#F2F7FC` | `#F0F8FE` | `#FFF5EC` | `#E3FFED` | `#FFF4F2` |
| 100 | `#E6ECF2` | `#D8EFFF` | `#FFE6CF` | `#CCF7DD` | `#FFE4E0` |
| 200 | `#D2D8DE` | `#B7DDF8` | `#FFCD9B` | `#A9E9C3` | `#FFC8C0` |
| 300 | `#BBC2C9` | `#97C8EA` | `#FFAD51` | `#82D6A6` | `#FFA699` |
| 400 | `#A1A9B1` | `#73AFD9` | `#E5922B` | `#5ABF89` | `#EF8677` |
| 500 | `#838C95` | `#4A93C1` | `#C37600` | `#3BA16E` | `#D66254` |
| 600 | `#656E78` | `#1F75A6` (logo) | `#9B5D00` | `#198152` | `#B24438` |
| 700 | `#4D5863` | `#005D8A` | `#7C4900` | `#00683F` | `#952E24` (never) |
| 800 | `#37424E` | `#004669` | `#5E3600` | `#004F2E` | `#781811` (never) |
| 900 | `#222E3A` | `#00304A` | `#422500` | `#00371F` | `#5B0000` |
| 950 | `#0E1A27` | `#001C2E` | `#281400` | `#002010` | `#390000` |

### Drawing colours

Light comes from the top: on every box, the top is lightest, the left middle, and the right darkest, in both modes. Drawing roles are for drawings only, never for text. The generators read them by name through `tools/palette.py` (`pal.TOP`, `pal.AMBER` …), which also works out the shades with no role (`navy(L)`, `tone(hue, L, C)`); never type a hex into a generator.

| Role | Token | Dark | Light |
| --- | --- | --- | --- |
| box top / left / right | `--iso-top` / `--iso-left` / `--iso-right` | `#4D5863` / `#37424E` / `#222E3A` | `#FFFFFF` / `#D2D8DE` / `#BBC2C9` |
| box edge (at 0.3 opacity) | `--iso-edge` | `#E6ECF2` | `#37424E` |
| amber box top / left / right | `--iso-hi-top` / `--iso-hi-left` / `--iso-hi-right` | `#FFCD9B` / `#FFAD51` / `#C37600` | same |
| amber box edge | `--iso-hi-edge` | `#FFF5EC` | `#7C4900` |
| blue box top / left / right | `--iso-sky-top` / `--iso-sky-left` / `--iso-sky-right` | `#B7DDF8` / `#97C8EA` / `#73AFD9` | `#97C8EA` / `#4A93C1` / `#005D8A` |
| green box top / left / right | `--iso-green-top` / `--iso-green-mid` / `--iso-green-dark` | `#82D6A6` / `#3BA16E` / `#198152` | `#82D6A6` / `#3BA16E` / `#00683F` |
| ground (map platform) | `--iso-ground` | `#15212E` | `#E6ECF2` |
| floor grid | `--iso-grid` | `#2B3743` | `#C5CCD3` |
| unlit window | `--iso-window` | `#182431` | `#A1A9B1` |
| lit window, white LED | `--iso-light` | `#FFF5EC` | `#FFF5EC` |
| drop shadow (at 0.35) | `--iso-shadow` | `#000000` | `#0E1A27` |
| green LED, online dot | `--iso-led` | `#A9E9C3` | `#198152` |

`tools/gen_light.py` makes the light drawings from the dark ones by role. Drawn lines (not fills) take a darker ink step on a light ground:

| Dark line | Light | Where |
| --- | --- | --- |
| amber `#FFAD51` | `#C37600` | amber lines; amber fills stay `#FFAD51` |
| sky `#97C8EA` | `#1F75A6` lines, `#4A93C1` fills, `#005D8A` words | network lines, labels |
| online `#A9E9C3` | `#198152` | online and LED dots |
| screen | `#222E3A` | a monitor stays dark, so what is drawn on it keeps its dark colours |
| office floor | `#DCE2E8` | the office slab only; other windows keep `#A1A9B1` |

### Check a colour change

Measure with a script (WCAG 2 ratio and APCA Lc), not by eye. In both modes: `--c-text` on every ground is 4.5:1 (Lc 75); muted, link, success, and accent ink are 4.5:1 (Lc 60); `--c-alert` is 4.5:1; the amber label is 7:1; `--c-edge` and the focus outline are 3:1; box faces keep top > left > right; one amber fill per view.

## Spacing

The spacing scale is `--sp-1` to `--sp-9`; the type scale is `--fs-1` to `--fs-8`. Pixels below are at a 16px root, the browser's default: the root is the visitor's own font size, so spacing grows with zoom and their font setting, never with the screen. What grows with a big screen is the room round the text: `--container`, `--fold-pad`, and the pictures.

| Token | `--sp-1` | `--sp-2` | `--sp-3` | `--sp-4` | `--sp-5` | `--sp-6` | `--sp-7` | `--sp-8` | `--sp-9` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pixels | 4 | 8 | 12 | 16 | 24 | 32 | 48 | 64 | 96 |

### R0. Stay on the scale

Every margin, padding, and gap is a `--sp-*` token, `0`, or a `calc()` of tokens and other size tokens (such as `--icon` or `--tap`). Reset browser defaults (the margin on `<dl>`, the padding on `<button>`) to `0` or a token. An exception needs a `stylelint-disable` comment that says why; there are two today: the 1px clip on `.sr-only` (`base.css`) and the footer icon nudge (`footer.css`).

### R1. Section padding

- **Flow section** (`.section`): `--section-y` top and bottom: `--sp-8` on phone and tablet, `--sp-9` on desktop.
- **Fold section** (desktop, one screen tall, `fold.css`): `--fold-pad`, which follows the screen's height: `--sp-5` up to 760px tall, `--sp-7` up to 1080px, `--sp-8` from 1080px. The content is centred.
- **The first section under the header:** `--sp-6` at the top; a fold hero can drop to `--sp-5`. A text-only page's top (`.page-intro`): `--sp-7`, or `--sp-8` on desktop.
- **Two touching sections with the same background** would show a double gap. Avoid it: alternate a banded section with a plain one.

### R2 to R4. Headings

| From | To | Space |
| --- | --- | --- |
| Section heading block | Its content | `--sp-6` at every size (R2) |
| Eyebrow | Its heading | `--sp-4`, everywhere (R3) |
| H1 or H2 | Its lead paragraph | `--sp-4` (R4) |
| Card or panel title | Its text | `--sp-2` (R4) |
| Title | Its own meta line (name and role, title and date) | `--sp-1` (R4) |
| H3 in running text (`.prose`) | — | `--sp-6` above, `--sp-3` below (R4) |

The space below a heading is smaller than the space above it.

### R5. Card padding

The same on all four sides:

- **Small** (list rows, contact channels, feature rows): `--sp-4`.
- **Card** (steps, stats, people, Grow cards): `--sp-5`.
- **Panel** (call-to-action band, forms, big panels): `--sp-6`, or `--sp-7` from 1100px.
- **Picture cards** (`.card`): `--sp-3` round the picture and the body.

Inside a card, gaps are smaller than its padding, and related lines sit closer than separate blocks.

### R6. Grid gaps

- **Card grids:** `--sp-4`, or `--sp-5` from 1100px (`.card-row`, `shared-blocks.css`). Every card grid on a page uses the same gap.
- **Text beside a picture or a second column** (`.split`, page grids): an `--sp-8` column gap on desktop.
- **Form fields:** `--sp-4`.

### R7. Line height

Write line heights as tokens, never as numbers. Lint refuses anything else.

| Text | Sizes | Line height |
| --- | --- | --- |
| Page and section headings | `--fs-8`, `--fs-7` | `--lh-display` (0.95) |
| Display-font titles that can wrap: card titles, H3, H4 | `--fs-6` to `--fs-4` | `--lh-title` (1.1) |
| One line in a fixed-height box: buttons, key caps, chips, tiles | any | `--lh-tight` (1) |
| Running text at 22px and up: big leads, intros | `--fs-5` and up | `--lh-snug` (1.3) |
| Running text | `--fs-1` to `--fs-4` | `--lh-body` (1.6) |
| Two-line meta under a title | `--fs-1`, `--fs-2` | `--lh-snug` |

Keep the 4px scale (decided October 28, 2026): every spacing fix so far picked a different existing step, and the controls (`--tap` 44px, `--control-h` 48px, `--header-h` 64px) sit on the 4px grid.

### How spacing is checked

- `npm run lint`: Stylelint refuses a raw length in `margin*`, `padding*`, `gap`, `row-gap`, `column-gap`, `scroll-margin*`, and `scroll-padding*` (`.stylelintrc.json`).
- `npm run verify:spacing`, against `npm run serve`: every computed margin, padding, and gap on every page at four sizes is a step of the scale. Its allowed exceptions are in its `SKIP` list, each with a reason.

To change spacing, change one page per pull request, then prove it: build `main` and your branch, run `npm run verify:styles -- OLD_URL NEW_URL` (only the differences you meant), and `npm run verify:spacing` (nothing new off the scale).

## Corners, boxes, and layout

The look is inspired by the Overwatch 2 menus: take their layout (how boxes sit, corners, spacing, how one design fills a 21:9 and a 1080p screen), never their colours, backgrounds, or brand. The measurements are a record in [`history/layout-reference.md`](history/layout-reference.md).

- **Small corners.** `--r-1` (0.125rem) key caps and tiny tags; `--r-2` (0.25rem) buttons, inputs, tiles, image wells; `--r-3` (0.5rem) cards, panels, dialogs. Only status items are round (`--r-pill`).
- **No slanted or skewed boxes.** The current header tab is a straight, full-height block: square corners, a lighter fill, and a short accent line along the bar's bottom edge (`src/styles/header.css`).
- **No left-side accents** on cards or tabs (colour rule 11). Lint refuses `border-left` and `border-inline-start`.
- **One centred block.** On a `fold` screen, `--container` is `max(94rem + 2 * var(--gutter), 85vw)`: the full width up to 1,600px, 85% of a wider screen. Elsewhere it's 80rem. The header, the hero, and the footer's stage and base bar run full width. Extra width goes to the art and the margins, never to the text.
- **Text never follows the screen**; see [`.claude/rules/css.md`](../.claude/rules/css.md) and "Styles" in [`src/README.md`](../src/README.md#styles).
