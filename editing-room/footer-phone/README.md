# Footer on phones (mockups)

The problem (John, 5 Nov 2026): on a phone the footer's tabs sit above the campus map and the links they open sit
below it. Every tap means scrolling down to see what changed and back up to tap again. Measured at 390 × 844 on the
site: the Support links start 660 px below the top of the tabs, so after a tap only the title shows. Only 3½ of the
6 tabs fit across; Resources and Follow are off the right edge. Mockups first, no site changes until one is picked.

`mockups.html` is built from `mockups.template.html` with the site's own map (`public/assets/img/campus.svg`) inlined:

    node editing-room/footer-phone/build.mjs

Four phones, clickable, each starting on Support. Under each, a line measures the tap: how far below it the first
link lands and how many links are on screen (header 64, tab bar 65; the bar hides scrolling down, like the site).
On a real phone the page shows one option at a time, full size (`#now`, `#a`, `#b`, `#c`).

## Round 1

- **Now**: tabs in one sideways row, map, links.
- **A, links first, map last**: six tabs in a 3 × 2 grid, links right under, map at the end. Small change (CSS).
- **B, map beside the title** (pick): the grid, and a small map window next to the panel title; the camera still
  flies on each tap. The window holds still between flights (no loops, so no pause button). Medium change.
- **C, open in place**: six rows under a 2:1 map strip; a tap opens the links under the row. Larger change (tabs on
  desktop, rows on phones).
- Dropped: scroll for you after a tap; tabs pinned to the bottom of the screen; no map on phones.

Tablet and desktop stay as they are in every option.

## Measured (390 × 844, Support)

Now: first link about 500 px below the tap, 1 of 4 on screen. A: 195 px, 4 of 4. B: 240 px, 4 of 4. C: 54 px, 2 of 4
(the row opens near the bottom). Checked in Chromium at 1440 wide and at phone size: no script errors, no sideways
scroll, B's small map shows the lit building for all six sections.

## Round 2 (built)

John picked C and dropped the map on phones. Built in `Footer.astro`, `footer.css` and `footer.js`: under 700 px the
roster is six rows; a tap opens that section under its row (one at a time, tap again to close); the map is hidden and
never fetched. footer.js moves each panel under its row and swaps the tab roles for aria-expanded; it puts them back
when the screen widens. Opening a row keeps it where it was on screen. Tablet and desktop unchanged.
