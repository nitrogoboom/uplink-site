# Home folds on the wheel grid (4 Nov 2026)

## The problem

On desktop every Home section is one screen tall (`.fold`). Scrolling with the mouse wheel, a fold's top never lined
up with the header. It was always about a centimetre above or below.

## Why

Nothing in the layout was off: each fold was exactly one screen under the header (`--fold-h`). The scroll stops were.

- One wheel notch is 100px. Measured on John's PC (Chrome, Windows, 1920×1080, 100% scaling and zoom): 159 notches,
  every one `deltaY 100` (200 when two merged), every stop a multiple of 100.
- A fold there was 836.9px (901px of window less a 64.06px header; the root font scales with the screen, so sizes
  are fractions). Fold edges at 836.9, 1673.8, 2510.7… never meet stops at 800, 900, 1700… They missed by 8 to 64px.
- Page Down moves 87.5% of the screen under the header (731px at 1440×900), so it falls short every press too.
- The Proof band (about 405px) shifted everything after it, the footer included.

## Not scroll snap

Snap was tried and taken out twice: 26 Oct (`ded4c2d`, proximity snap yanked arrow keys and Page Down) and 2 Nov
(`b061598`, it fought the scroll-driven Grow tower). John doesn't want it back.

## What we did: whole wheel steps

- `--wheel-step: 100px` (`tokens.css`).
- On desktop, `--fold-pitch` is `--fold-h` rounded **up** to whole steps (`round(up, …)`). At 1440×900: 836 → 900.
  Each Home fold is that tall, so from the top or a menu link every fold edge is a wheel stop.
- Rounding up, not down: rounding down leaves a strip of the next section showing under every fold, which is the
  same "centimetre off", only steady. Rounding up puts the extra (under one step) below the content, off screen
  while the fold is lined up.
- The extra is an empty `::after` inside the fold (`fold.css`), not padding, so the content stays centred in the
  screen's height and `verify_spacing.py` never sees an off-scale value.
- Proof is as tall as its words, which CSS can't round, so `home.js` rounds its height up to the next step.
- The footer stays exactly one screen, so the page's end is also a stop and scrolling back up stays on the grid.

Checked with Playwright at 1100×700, 1280×720, 1440×900, 1920×901, 1920×1080 and 3440×1440: every section top and
the page end on a multiple of 100; the wheel meets every fold edge going down and coming back up.

## Limits (known, accepted)

- Home only, desktop only (the `fold` screens). Phones and tablets take each section's own height. With bigger
  text (Settings) sections grow past one screen, so the grid turns off.
- It holds while the wheel does the scrolling. Page Down, arrow keys, the scrollbar, Tab moving focus, find-in-page
  and trackpads leave the grid until the top, the bottom or a menu link. Only snap could pull it back.
- Fits a 100px notch: Chrome and Edge on Windows at 100% zoom. Firefox, Mac mice and browser zoom step other amounts;
  they are no worse than before.
- `round()` needs a current browser; older ones keep `--fold-h` (the old behaviour).
- Each fold has up to 99px of its own background below its content (64px at 1440×900), seen only between folds.
