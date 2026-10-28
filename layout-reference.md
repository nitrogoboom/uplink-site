# Layout reference: Overwatch 2 menus

What to take from the screenshots in `RAW Screenshots/` (git ignores that folder; the files stay on this PC only). Taken at 3440×1440. Numbers in brackets are the file order, oldest first (1 = `000610`, 16 = `001133`).

What we want is the **layout**: how the boxes sit, their corners, the spacing, the sizes, and how one design fills a 21:9 screen and a 1080p screen without breaking. We're **not** taking their colours or backgrounds. We **are** taking how they place one strong image. We're **not** taking the slanted tabs or skewed boxes (see "Skip").

Applied site-wide on 28 Oct 2026: small corners, straight header tab, centred ~94rem block on desktop, edge-to-edge pictures on service cards, bigger stat numbers, steps with the number beside the title.

## How it fits every screen

The menus never reflow. Everything is sized from **screen height**, so a 1440-tall screen is a 1080p screen scaled up by 1.33. Extra width never stretches the content. It goes to the art and to empty space at the sides.

Each item has one of two jobs:

- **Pinned to an edge or corner.** The top bar, the hero copy (top-left), the key hints (bottom corners) and the side panels (right edge) hold a fixed distance from their edge. On a wider screen they just sit further apart.
- **The centred block.** Cards, profile pages and lists sit in one centred block about 94rem wide (in our units; see below). At 3440 that block covers 70% of the width. At 1920×1080 the same block covers about 94%, leaving roughly 58px each side. Same design, no breakpoint.

The image fills the whole screen behind both. The subject sits in the middle or the right, in the space the copy leaves free. [2, 4, 14, 16]

**Our site already scales by height:** `tokens.css` sets the root font to `min(1.1111vw, 1.7778vh)` from 1100px wide, which gives 25.6px at 3440×1440 and 19.2px at 1920×1080. What's missing is the centred block. Desktop sets `--container: none`, so content stretches across all 3440px. The fix would be a block of about `min(94rem, 100% - 2 * var(--gutter))` for card grids and lists, with heroes and the header kept full width.

## Measurements

Measured at 3440×1440, converted to rem at our 25.6px root there.

| Thing | OW at 1440 tall | In rem | Ours now |
|---|---|---|---|
| Top bar height | 94px | 3.7rem | `--header-h` 4rem (close) |
| Button height | 71–80px | 2.8–3.1rem | `--control-h` 3rem (match); `--control-lg` 4rem (bigger than OW) |
| Gap between buttons | 13px | 0.5rem | `--sp-2` |
| Square icon button | 80×80, same height as the buttons beside it | 3.1rem | — |
| Copy inset from the left edge | 133px | 5.2rem | `--gutter` 3rem (we're tighter) |
| Hero copy column | ~665px | ~26rem | `--measure-lead` 56ch (wider) |
| Mode card | 493×693, about 5:7 | 19×27rem | — |
| Gap between cards | 42px | 1.6rem | `--sp-5` 1.5rem |
| Profile banner height | 160px | 6.25rem | — |
| Centred block | 2412px | 94rem | `--container: none` on desktop |
| Key hints | ~60px up from the bottom | 2.3rem | — |

## Corners

The main difference from our site. OW keeps corners **small**:

- Buttons, dropdowns, tabs: square or about 2px. [4, 8, 10]
- Cards and panels: about 8–10px (0.35–0.4rem). Shop art cards about 12px. [1, 5, 6]
- Only status things are round: price pills, check pills, avatars in circles. [4, 5, 9]

Ours: `--r-2` is 0.75rem (19px at 3440) on buttons, and `--r-3` is 1.25rem (32px) on cards. That's two to three times rounder. To get the OW feel, bring them down to about 0.125rem on buttons and inputs and 0.4rem on cards and panels. Leave `--r-pill` as it is.

## Boxes

- **Card = picture + caption.** Title and one short line go at the bottom, over a dark fade on the image. A tiny caps eyebrow goes above the title, and price or status goes in a pill under it. [5, 6]
- **Tall card + short tiles.** Three tall 5:7 cards, then a column of three short tiles whose total height matches one tall card. Main choices large, side choices small, same row. [1]
- **Stat tile.** Outlined box: icon on top, a huge number in the middle, a caps label at the bottom. Laid out 3×2, beside a table. [13]
- **Row lists.** Full-width rows with thin gaps (about 4px) instead of lines between them. A small square picture on the left, the text, then a number on the right. A coloured bar can fill behind the row to show its value. [9, 12]
- **Category list + content.** A narrow list on the left (active row filled, count on the right), and a two-column card list on the right. [11]
- **Button row.** One main button, one other button, and an optional square icon button. All the same height, about 13px apart. [4, 16]
- **Banner across the page.** A full-width band over a dimmed page: copy on the left, picture on the right, and one button centred under it. [3]
- **Menu screen.** Split by one thin vertical line: logo on the left, a stack of full-width buttons on the right, with a gap before the last one. [8]
- **Side drawer.** Full height on the right edge, rows that open and close, a short centred line when empty. [7]

## Type sizes (relative)

- Page title: about 2× the size of section titles. Big, condensed and italic, top-left, with a smaller subline tucked under it. [1, 7, 12, 16]
- Labels, tabs and buttons: small bold caps, the same size everywhere.
- Body: sentence case, short lines (the hero column caps it at about 26rem).

## Skip

- **Slanted nav tabs** (the parallelogram behind the active link) and **skewed thumbnail cards** along the bottom of the home screen. [1, 2, 5, 14]
- **The blue edge on the left of the active mode tab.** It breaks our no-left-accent rule. [1]

Replacement for the slanted tab: a **straight full-height block**. The active link fills the bar's full height edge to edge, with square corners, a lighter fill and a short accent line along the bottom edge of the bar. It's the same look OW uses on its own right-hand icons. [7, 16] Ours now is a rounded chip (`--r-2`) floating in the bar, with a line under it (`src/styles/header.css`).
