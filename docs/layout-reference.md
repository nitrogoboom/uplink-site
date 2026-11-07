# Layout reference: Overwatch 2 menus

*Measured October 28, 2026. Last updated: November 5, 2026.*

This page records what the site takes from the Overwatch 2 menus, and what it leaves out. Read it before you change how boxes sit, their corners, their spacing, or how a page fills a wide screen.

The measurements come from screenshots in `RAW Screenshots/`, taken at 3440×1440. Git ignores that folder, so the files stay on one computer only. Numbers in square brackets, such as [4], point at a screenshot by file order, oldest first: 1 is `000610` and 16 is `001133`.

## What we take and what we skip

| Take | Don't take |
| --- | --- |
| The layout: how boxes sit, their corners, spacing, and sizes. | Their colours and backgrounds. |
| How one design fills a 21:9 screen and a 1080p screen without breaking. | The slanted nav tabs and skewed boxes. See [Skip](#skip). |
| How they place one strong image. | |

### Applied on October 28, 2026

These changes were made site-wide:

- Small corners: `--r-2` is 0.25rem and `--r-3` is 0.5rem.
- A straight header tab.
- A centred block of about 94rem on large desktops (`--container` in `tokens.css`).
- Edge-to-edge pictures on service cards.
- Bigger stat numbers.
- Steps with the number beside the title.

> **Note:** The "Ours before" column and the "Before" notes on this page describe the site before that pass. They're kept to show what changed and why.

## How the menus fit every screen

The menus never reflow. Everything is sized from the **screen height**, so a 1440-tall screen is a 1080p screen scaled up by 1.33. Extra width never stretches the content. It goes to the art and to empty space at the sides.

Each item has one of two jobs:

- **Pinned to an edge or corner.** The top bar, the hero copy (top left), the key hints (bottom corners), and the side panels (right edge) hold a fixed distance from their edge. On a wider screen, they sit further apart.
- **In the centred block.** Cards, profile pages, and lists sit in one centred block about 94rem wide, in our units. At 3440 px, that block covers 70% of the width. At 1920×1080, it covers about 94%, leaving roughly 58 px on each side. It's the same design, with no breakpoint.

The image fills the whole screen behind both. The subject sits in the middle or on the right, in the space the copy leaves free. [2, 4, 14, 16]

### How the site does it

Text doesn't scale with the screen: 1rem is the visitor's own font size on every screen, so browser zoom and the browser's font setting work (review C1; until November 7, 2026, a `fold` screen set the root to `clamp(14px, min(1.1111vw, 1.7778vh), 40px)`, which zoom barely moved). What follows the screen is the room round the text, so each section still fills one screen.

On a `fold` screen, at least 1100 px wide and 700 px tall, `--container` is `max(94rem + 2 * var(--gutter), 85vw)`: one centred block for card grids and lists, the full width up to 1,600 px and 85% of a wider screen. `--fold-pad`, the padding of a one-screen section, steps up with the screen's height, and the hero and Grow pictures are capped by shares of the screen (`--hero-max`, `--grow-stage-max`). The header, the hero, and the footer's stage and base bar run full width. Smaller screens, and desktops shorter than 700 px, keep `--container` at 80rem.

Before October 28, desktop set `--container: none`, so content stretched across all 3,440 px.

## Measurements

Measured at 3440×1440 and converted to rem at the 25.6 px root used there.

| Item | Overwatch 2 at 1440 tall | In rem | Ours before October 28 |
| --- | --- | --- | --- |
| Top bar height | 94 px | 3.7rem | `--header-h` 4rem (close) |
| Button height | 71–80 px | 2.8–3.1rem | `--control-h` 3rem (a match); `--control-lg` 4rem (bigger) |
| Gap between buttons | 13 px | 0.5rem | `--sp-2` |
| Square icon button | 80×80 px, the same height as the buttons beside it | 3.1rem | — |
| Copy inset from the left edge | 133 px | 5.2rem | `--gutter` 3rem (tighter) |
| Hero copy column | about 665 px | about 26rem | `--measure-lead` 56ch (wider) |
| Mode card | 493×693 px, about 5:7 | 19×27rem | — |
| Gap between cards | 42 px | 1.6rem | `--sp-5` 1.5rem |
| Profile banner height | 160 px | 6.25rem | — |
| Centred block | 2,412 px | 94rem | `--container: none` on desktop |
| Key hints | about 60 px up from the bottom | 2.3rem | — |

## Corners

This was the main difference from our site. The menus keep corners **small**:

- Buttons, drop-down menus, and tabs: square, or about 2 px. [4, 8, 10]
- Cards and panels: about 8–10 px (0.35–0.4rem). Shop art cards: about 12 px. [1, 5, 6]
- Only status items are round: price pills, check pills, and avatars in circles. [4, 5, 9]

**Before:** `--r-2` was 0.75rem (19 px at 3440) on buttons, and `--r-3` was 1.25rem (32 px) on cards, two to three times rounder. They're now 0.25rem and 0.5rem. `--r-pill` didn't change.

## Boxes

- **Card: picture and caption.** The title and one short line sit at the bottom, over a dark fade on the image. A tiny capitals eyebrow sits above the title, and a price or status goes in a pill under it. [5, 6]
- **Tall cards and short tiles.** Three tall 5:7 cards, then a column of three short tiles whose total height matches one tall card. Main choices are large and side choices small, in the same row. [1]
- **Stat tile.** An outlined box with an icon on top, a huge number in the middle, and a capitals label at the bottom. Laid out 3×2, beside a table. [13]
- **Row lists.** Full-width rows with thin gaps, about 4 px, instead of lines between them. A small square picture on the left, then the text, then a number on the right. A coloured bar can fill behind the row to show its value. [9, 12]
- **Category list and content.** A narrow list on the left, with the active row filled and a count on the right, and a two-column card list on the right. [11]
- **Button row.** One main button, one other button, and an optional square icon button. All the same height, about 13 px apart. [4, 16]
- **Banner across the page.** A full-width band over a dimmed page: copy on the left, a picture on the right, and one button centred under it. [3]
- **Menu screen.** Split by one thin vertical line: the logo on the left, and a stack of full-width buttons on the right, with a gap before the last one. [8]
- **Side drawer.** Full height on the right edge, with rows that open and close, and a short centred line when it's empty. [7]

## Type sizes

These sizes are relative to each other.

- **Page title:** about twice the size of section titles. Big, condensed, and italic, in the top left, with a smaller subline tucked under it. [1, 7, 12, 16]
- **Labels, tabs, and buttons:** small, bold capitals, the same size everywhere.
- **Body:** sentence case, in short lines. The hero column caps it at about 26rem.

## Skip

- **Slanted nav tabs** (the parallelogram behind the active link) and the **skewed thumbnail cards** along the bottom of the home screen. [1, 2, 5, 14]
- **The blue edge on the left of the active mode tab.** It breaks the site's rule against left-side accents. [1]

**What replaces the slanted tab:** a straight, full-height block. The active link fills the bar's full height, edge to edge, with square corners, a lighter fill, and a short accent line along the bottom edge of the bar. The menus use the same look on their own right-hand icons. [7, 16] That's what `src/styles/header.css` does now. Before October 28, the active tab was a rounded chip floating in the bar.
