# Design rules

Values are tokens in `src/styles/tokens.css` (dark) and `theme-light.css` (light); the tokens win.

## Colour

Calm and reliable; the drawings and one amber action colour carry the personality. Dark first; light is its own mode. About 60% neutrals, 30% blues, 10% amber at most.

### Rules

1. **One amber fill per view.** Amber means "do this". Don't use it for decoration, status, or emphasis.
2. **Amber fill vs amber ink.** Bright amber is a fill with a dark label. Amber words, icons, and marks use `--c-accent-text`.
3. **Links are blue, not amber.** Links in body text are underlined (`--c-line-2`).
4. **Status is never colour alone.** Every status message carries an icon and a word.
5. **Error text placement.** On the page and band grounds an error message can be all `--c-alert`. On cards, dialogs, and hover fills, only the word "Error", the icon, and a 1px border use it; the message uses `--c-text`. Error text is 16px or larger, weight 500 or more.
6. **Edges that matter use `--c-edge`.** Inputs, selects, and ghost buttons need 3:1. `--c-line` and `--c-line-2` are decoration only.
7. **Focus** is a 2px solid `--c-accent-text` outline with a 2–3px offset. `--c-accent-ring` may sit outside it as a halo, never instead of it.
8. **No crimson**, and no red ramp step 700 or darker, anywhere outside the logo.
9. **No new colours.** If you need one, mark the spot `DESIGN-GAP: WHAT_WAS_MISSING` and say so.
10. **Headline accent.** One word in a headline may take `--c-accent-text`. One word, no glow, no underline.
11. **Cards.** Border `--c-line`, fill `--c-surface`, even on all four sides. No coloured left-edge accent. At most one selected card, shown with `--c-accent-tint` plus a label.
12. **Grounds stay calm.** Grounds and text stay under OKLCH chroma 0.04.
13. **Light mode is its own mode.** Every neutral is navy-tinted (hue 250); pure white only on the top layer (dialogs, toasts, menus). A card is the ground lifted, flat, with no gradient, and separated by `--shadow-card`, not by darker borders. A mark that says "chosen" or "you are here" is amber ink, never the bright fill; an amber button keeps its fill and takes a 1px `#C37600` edge. Fade grey text less than in dark mode: about 0.65 where dark uses 0.45.

### Logo

Blue `#1F75A6`, crimson `#8D242E` (logo only). Copy the files from `Documents/Design.MD/svs-design/assets/logo/` on the owner's computer; never retype or recolour. Below 120px wide, the mark alone; clear space 25%.

### Roles and tokens

Use the token, never the hex. One job per role.

| Role | Token | Job |
| --- | --- | --- |
| page | `--c-bg` | page ground |
| band | `--c-bg-band` | alternate section band |
| raised | `--c-solid` | opaque top layer: dialogs, toasts, menus |
| surface | `--c-surface` | card and panel fill |
| surface-hover | `--c-surface-2` | hover, selected, icon tile |
| well | `--c-well` | input fill, image well |
| line | `--c-line` | decorative divider, card border |
| line-strong | `--c-line-2` | soft divider, hover border, link underline |
| edge | `--c-edge` | border of anything you click or type in (3:1) |
| text | `--c-text` | body text, headings |
| text-muted | `--c-muted` | secondary text |
| glass | `--c-glass` | sticky header (solid, no blur) |
| glass-raised | `--c-glass-2` | phone bottom bar (solid, no blur) |
| backdrop | `--c-backdrop` | scrim behind pop-ups |
| card-shadow | `--shadow-card` | a card at rest in light mode (rule 13) |
| action | `--c-accent` | amber fill: primary button, selected tile |
| on-action | `--c-on-accent` | label on the amber fill |
| action-ink | `--c-accent-text` | amber words, icon strokes, focus outline |
| action-tint | `--c-accent-tint` | selected card or chip fill |
| action-faint | `--c-accent-faint` | highlighted table column |
| action-ring | `--c-accent-ring` | focus halo beside the outline |
| on-action-tint | `--c-ink-tint` | dark chip on the amber fill |
| link | `--c-sky` | links and info text |
| link-tint | `--c-sky-tint` | info message and chip fill |
| success | `--c-ok` | success and online text and icon |
| success-tint | `--c-ok-tint` | success message and chip fill |
| error | `--c-alert` | error text and icon |
| glow-warm | `--c-glow-accent` | warm light behind a main call to action |
| glow-cool | `--c-glow-sky` | cool light behind a drawing |
| glow-cool-2 | `--c-glow-sky-2` | stronger cool glow (map, footer) |
| cool-surface | `--c-cool-surface` | panel inside a cool-lit area |
| cool-surface-hover | `--c-cool-surface-2` | its hover |
| cool-text-muted | `--c-cool-muted` | secondary text on cool surfaces |


### Ramps

Components use roles, not ramp steps. Hues (OKLCH): blue 239.4 (logo), neutral 250, amber 66, green 158, red 29 (green and red for status only). Hex values: `tokens.css`; hues and neutrals: `tools/palette.py`. Red 700 and 800 are never used.

### Drawing colours

Light from the top: top face lightest, left middle, right darkest. Drawing roles are for drawings only; generators read them through `tools/palette.py` (`pal.TOP` …), never a typed hex.

| Role | Token |
| --- | --- |
| box top / left / right | `--iso-top` / `--iso-left` / `--iso-right` |
| box edge (at 0.3 opacity) | `--iso-edge` |
| amber box top / left / right | `--iso-hi-top` / `--iso-hi-left` / `--iso-hi-right` |
| amber box edge | `--iso-hi-edge` |
| blue box top / left / right | `--iso-sky-top` / `--iso-sky-left` / `--iso-sky-right` |
| green box top / left / right | `--iso-green-top` / `--iso-green-mid` / `--iso-green-dark` |
| ground (map platform) | `--iso-ground` |
| floor grid | `--iso-grid` |
| unlit window | `--iso-window` |
| lit window, white LED | `--iso-light` |
| drop shadow (at 0.35) | `--iso-shadow` |
| green LED, online dot | `--iso-led` |

`tools/gen_light.py` makes the light drawings by role; lines (not fills) take a darker step:

| Dark line | Light | Where |
| --- | --- | --- |
| amber `#FFAD51` | `#C37600` | amber lines; amber fills stay `#FFAD51` |
| sky `#97C8EA` | `#1F75A6` lines, `#4A93C1` fills, `#005D8A` words | network lines, labels |
| online `#A9E9C3` | `#198152` | online and LED dots |
| screen | `#222E3A` | a monitor stays dark, so what is drawn on it keeps its dark colours |
| office floor | `#DCE2E8` | the office slab only; other windows keep `#A1A9B1` |

### Check a colour change

Measure with a script (WCAG 2 and APCA), both modes: `--c-text` on every ground is 4.5:1 (Lc 75); muted, link, success, and accent ink are 4.5:1 (Lc 60); `--c-alert` is 4.5:1; the amber label is 7:1; `--c-edge` and the focus outline are 3:1; box faces keep top > left > right; one amber fill per view.

## Spacing

Spacing `--sp-1`–`--sp-9`, type `--fs-1`–`--fs-8`; pixels at a 16px root (`--fs-root` grows to 125% past 1440px).

| Token | `--sp-1` | `--sp-2` | `--sp-3` | `--sp-4` | `--sp-5` | `--sp-6` | `--sp-7` | `--sp-8` | `--sp-9` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pixels | 4 | 8 | 12 | 16 | 24 | 32 | 48 | 64 | 96 |

### R0. Stay on the scale

Every margin, padding and gap is a `--sp-*` token, `0`, or a `calc()` of size tokens. Exceptions need a `stylelint-disable` comment saying why.

### R1. Section padding

- **Flow section** (`.section`): `--section-y` top and bottom: `--sp-8` on phone and tablet, `--sp-9` on desktop.
- **Fold section** (desktop, one screen tall, `fold.css`): `--fold-pad`, which follows the screen's height: `--sp-5` up to 760px tall, `--sp-7` up to 1080px, `--sp-8` from 1080px. The content is centred. A fold must fit one screen from 1080px tall; on shorter screens it may run past (owner, November 10, 2026).
- **The first section under the header:** `--sp-6` at the top; a fold hero can drop to `--sp-5`. A text-only page's top (`.page-intro`): `--sp-7`, or `--sp-8` on desktop.
- Alternate banded and plain sections so gaps don't double.

### R2 to R4. Headings

| From | To | Space |
| --- | --- | --- |
| Section heading block | Its content | `--sp-6` at every size (R2) |
| Eyebrow | Its heading | `--sp-4`, everywhere (R3) |
| H1 or H2 | Its lead paragraph | `--sp-4` (R4) |
| Card or panel title | Its text | `--sp-2` (R4) |
| Title | Its own meta line (name and role, title and date) | `--sp-1` (R4) |
| H3 in running text (`.prose`) | — | `--sp-6` above, `--sp-3` below (R4) |

Space below a heading is smaller than above.

### R5. Card padding

The same on all four sides:

- **Small** (list rows, contact channels, feature rows): `--sp-4`.
- **Card** (steps, stats, people, Grow cards): `--sp-5`.
- **Panel** (call-to-action band, forms, big panels): `--sp-6`, or `--sp-7` from 1100px.
- **Picture cards** (`.card`): `--sp-3` round the picture and the body.

Gaps inside a card are smaller than its padding.

### R6. Grid gaps

- **Card grids:** `--sp-4`, or `--sp-5` from 1100px (`.card-row`, `shared-blocks.css`). Every card grid on a page uses the same gap.
- **Text beside a picture or a second column** (`.split`, page grids): an `--sp-8` column gap on desktop.
- **Form fields:** `--sp-4`.

### R7. Line height

Tokens only.

| Text | Sizes | Line height |
| --- | --- | --- |
| Page and section headings | `--fs-8`, `--fs-7` | `--lh-display` (0.95) |
| Display-font titles that can wrap: card titles, H3, H4 | `--fs-6` to `--fs-4` | `--lh-title` (1.1) |
| One line in a fixed-height box: buttons, key caps, chips, tiles | any | `--lh-tight` (1) |
| Running text at 22px and up: big leads, intros | `--fs-5` and up | `--lh-snug` (1.3) |
| Running text | `--fs-1` to `--fs-4` | `--lh-body` (1.6) |
| Two-line meta under a title | `--fs-1`, `--fs-2` | `--lh-snug` |

Controls sit on the 4px scale: `--tap` 44px, `--control-h` 48px, `--header-h` 64px.

### Checks

`npm run lint` refuses raw lengths; `npm run verify:spacing` (against `npm run serve`) checks computed spacing. After a spacing change: `npm run verify:styles -- OLD_URL NEW_URL`.

## Corners, boxes, and layout

Take the Overwatch 2 menus' layout (boxes, corners, spacing, filling 21:9 and 1080p), never their colours or brand.

- **Small corners.** `--r-1` (0.125rem) key caps and tiny tags; `--r-2` (0.25rem) buttons, inputs, tiles, image wells; `--r-3` (0.5rem) cards, panels, dialogs. Only status items are round (`--r-pill`).
- **No slanted or skewed boxes.** The current header tab is a straight, full-height block: square corners, a lighter fill, and a short accent line along the bar's bottom edge (`src/styles/header.css`).
- **No left-side accents** on cards or tabs (colour rule 11).
- **One centred block.** On a `fold` screen, `--container` is `max(94rem + 2 * var(--gutter), 85vw)`: the full width up to 1,600px, 85% of a wider screen. Elsewhere it's 80rem. The header, the hero, and the footer's stage and base bar run full width. Extra width goes to the art and the margins, never to the text.
- **Text follows the screen in one place only**, the root size (`--fs-root`), capped at 125% ([`.claude/rules/css.md`](../.claude/rules/css.md)).
