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

## Next

Not yet checked in a browser (written, built, script parses). Check all four phones render and measure, fix what's
off, publish as an Artifact so John can try it on his phone, then round 2 from his answer.
