# Our work on phones (mockups)

The ask (John, 6 Nov 2026): a mobile pass on "Setups we built and still run", with the project cards laid out
sideways so more fit on a phone screen. Measured at 390 × 844 on the site: each card is 357 px tall, so one is whole
on screen at a time; Home's section (three cards) is 1,420 px, two screens; the Work page's six run about 3½ screens.
The same card (`src/components/work/ProjectCard.astro`) shows on Home, the Work page and each service page's
"Where we've done this", so all three change together. Mockups first, no site changes until one is picked.

`mockups.html` is built from `mockups.template.html` with the six projects (`src/content/projects/`) and their card
drawings (`public/assets/img/NAME-card.svg`, as data URLs) inlined:

    node editing-room/work-phone/build.mjs

Three phones, switchable between Home and the Work page and between text at 100% and 200%. Under each, a line
measures it: cards whole on one screen (first card just under the header, tab bar showing) and the section's height
in screens (one screen is the 715 px between header and tab bar). On a real phone the page shows one version at a
time, full size (`#now`, `#a`, `#b`).

## Round 1

- **Now**: picture on top, words under it.
- **A, rows** (pick): drawing on the left (120 px wide), tag chip, name and client on the right. Home's heading and
  three cards on one screen (695 px); five of six on the Work page. Same words, link and reading order.
- **B, rows with the result**: as A, plus each project's `result` in amber. Four of six per screen; the results are
  sample copy.
- Text at 200%: the rows stack back (picture on top, 2:1, shorter than today's) so long words never squeeze.
- Dropped: a sideways carousel (fewer per screen, not more); two small cards across (titles wrap to three lines); no
  drawings on phones.

Tablet and desktop stay as they are in every option.

How A would be built: the tag chip moves out of `.card-media` to be a sibling in `ProjectCard.astro`, and the card
becomes a grid: on tablet and desktop the chip shares the picture's cell (over it, as now); on phones the picture
spans the rows on the left and the chip and words sit beside it. The client line's parts stay unbroken ("40 staff").
Which `data-text` step stacks the rows gets settled with `tools/verify_text.py`.

## Built (6 Nov 2026)

John picked A, and asked that the inside of each card line up well too. Built:
`.card--project` in `src/styles/surfaces.css`, the chip moved in `ProjectCard.astro`, `--card-thumb` in `tokens.css`,
equal-height rows in `.card-row` (`shared-blocks.css`) and `.work-grid` (`projects.css`). What changed from the
mockup, after side-by-side shots of three ways to place the words:

- The drawing's well is as tall as the row, so the drawing and the words share a top and bottom edge.
- The tag, name and client are one block, centred on the drawing. Top-aligned left a gap under one-line clients;
  pinning the client to the bottom pulled it away from the name (spacing R4: title to its meta line is `--sp-1`).
- Every row in a list is as tall as the tallest (`grid-auto-rows: 1fr`), so drawings line up down the list at any
  width: 120 px at 390, 138 at 360, 156 at 320.
- Titles balance their two lines ("Office move / in a weekend"). The client line keeps "40 staff" whole on every
  screen size, the one change tablet and desktop see.
- Rows hold up to 125% text; from 150% the card stacks (2:1 picture, chip under it).

Checked: tablet and desktop pixel-compared before and after (700 to 2560 wide): no change but "40 staff". On
`main` after #79 (the checks moved to Node in #77): `npm run ci` and `npm run verify:text` at 200%,
100% and 125% pass; `npm run verify:spacing` fails only on `.fc-base`, which `main` already has (notes.md). Not yet
seen on a real phone.
