# Grow section, option C: the steps as a list (mockup)

The problem (John, November 6, 2026): on desktop (1100 px wide and up), the Home "We grow with you" section's left column has the heading at the top and the card at the bottom, with about 450 px of empty space between them. John picked option C from a sketch: fill the middle with the six steps as a list you can click. The idea comes from a game's play screen, where the modes are listed on the left and the big picture reacts to the one you pick.

Nothing here is part of the site build.

> **Note:** John approved option C on November 6, 2026, and it's built into the site: `src/components/home/Grow.astro`, `grow.css` and `src/scripts/grow.js`. The real rows are `.grow-item` (the mockup's `.grow-step`, renamed so it isn't confused with the arrows' `.grow-step-btn`), and each has the dots' `aria-label` ("1 of 6: Your office"). "Building it for real" below is the plan it followed.

## What the mockup shows

- On desktop, the six steps from `src/data/grow.json` sit in the left column as a list between the heading and the card. Each row shows the number, the place and the team size.
- The open step is lit: amber border, filled amber number. Steps already built are dimmed amber. Steps still to come are grey. These are the same three states the dots use today.
- Clicking a row jumps the story to that step: the world, the tags, the card and the team count all change, just as a dot click does today.
- While the story plays, a thin amber bar fills along the bottom of the open row over the step's 4.5 seconds.
- The list replaces the dots and arrows under the picture, so the picture gets that row's height back (about 16 px taller at 1440 × 900).
- Phones and tablets are unchanged: the list stays hidden and the dots work as they do today.
- The **Option C / Today** switch in the stand-in header turns option C's CSS off, so you can compare it with today's section at the same size.

It's made from the site's own parts, so it looks and moves like the site: the real tokens, fonts, `grow.css`, the drawing (`src/components/home/grow-world.svg`), the copy (`src/data/grow.json`) and `src/scripts/grow.js` as it is. Option C adds two small files on top: `grow-list.css` and `grow-list.js`.

## Open it

1. In the Claude app, start the `grow-list` entry from `.claude/launch.json`. It serves this folder at http://localhost:8792.
2. Open http://localhost:8792/preview.html. The buttons along the top load the page at an exact size, scaled to fit your window: phone 390 × 844, tablet 820 × 1180, desktop 1440 × 900 and desktop 1920 × 1080.
3. Click the steps in the list. The play button on the picture plays the story from the start.

You can also open `section.html` on its own, in any browser and at any window size. It's one self-contained file with the fonts embedded. Add `?v=now` to the address to open it on today's layout.

## Rebuild it

`section.html` is built and committed, so you don't need to rebuild it to look. After you change `template.html`, `grow-list.css`, `grow-list.js` or any of the site files it reads, rebuild it from the project root:

```
node editing-room/grow-list/build.mjs
```

## Building it for real

**Files**

- `src/components/home/Grow.astro`: add the list, an `<ol class="grow-list">` with one `<button>` a step, between `.grow-head` and `.grow-player`. That's about 8 lines. The markup is in `build.mjs`.
- `src/components/home/grow.css`: add `.grow-list { display: none; }` with the phone rules. In the `@media (--desktop)` block, replace the current layout lines with the ones in `grow-list.css` and add the row styles. That's about 40 lines. The card loses its bottom margin, which was there to line it up above the dots, and the picture loses the `- var(--tap) - var(--sp-2)` it kept for the dots row.
- `src/scripts/grow.js`: no new script. Treat the list buttons as a second set of dots: where it collects `.grow-dot`, collect `.grow-step` too, and set `aria-pressed` and `is-done` on both in `show()`. That's about 5 changed lines. The timing bar needs one class toggled in `go()`. `grow-list.js` here copies the dots' state with a `MutationObserver` only so that `grow.js` could stay untouched for the mockup; don't carry it over.
- `src/README.md`: one line on the list in the Home section notes.
- About 55 lines in all, and no new files.

**Accessibility**

- Each row is a real `<button type="button">` with `aria-pressed`, the same as the dots. The list's `aria-label` ("Where your people work") matches the dots' group. Because CSS shows the list on desktop and the dots below it, only one of them is ever in the accessibility tree, so a screen reader never hears the steps twice. `aria-current="step"` on the open row is the other reasonable choice. I kept `aria-pressed` so the list and the dots announce the same way.
- Each row's text reads as "1 Your office Team of 8". If that sounds cluttered, give the button an `aria-label` like the dots' ("1 of 6: Your office") and hide the team size from screen readers.
- Each row is at least `--tap` (44 px) tall. The text sizes are the site's `--fs-*` tokens, so the rows grow with the visitor's text size (Settings). At the largest size, check that the left column still fits beside the picture. The section can already grow past one screen there (`:root[data-text]`).
- Contrast: the grey rows use `--c-muted` and the open row `--c-text`. The dimmed rows are amber at 70%, about 5:1 for the small team text. Don't go lower than that. Measure it again with the palette tool when building.
- The timing bar doesn't move with reduced motion (`prefers-reduced-motion`), and the rows don't fade.
- Keyboard: Tab moves through the six rows, and Enter or Space opens a step. Up and down arrow keys within the list would be a nice extra, but the dots don't have them either.

**Checks after building**

`npm run ci`, then `python tools/verify_footer.py out/` and `python tools/verify_text.py` (at 200% and `--text 1`). Check at 1440 × 900, 1920 × 1080 and a short laptop screen (1280 × 720), where `--fold-inner` is smallest and the left column is tightest.
