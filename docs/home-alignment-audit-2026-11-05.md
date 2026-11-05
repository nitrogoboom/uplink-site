# Home: alignment and style audit (5 Nov 2026)

Home only. Measured on the dev server at 1440×900, 820×1180 and 375×812, then checked against the CSS and the rules in `docs/spacing.md` (R0 to R7). Pixel values are at the 1440×900 reference. Fixed one fold at a time, each its own commit on `home-hero-tidy`. All five folds are done; X8 is the one item left.

Fold order: 1 Hero, 2 Services, 3 Grow, 4 Work, 5 Proof.

## Across the page

| # | What | Where it stands |
|---|---|---|
| X1 | Where a fold's heading sits | Done: Services, Grow and Work all start at the top of the fold (48 down at 1440×900). |
| X2 | Heading block to its content | Done: 32 at every size, from `.section-head`'s own margin. Grow and Work no longer add a gap of their own. |
| X3 | Same job, different classes: a heading block (`.section-head`, `.hero-top`, Proof's `.stack`) | Kept: all give 16 between eyebrow, heading and lead. `.section-head` for section heads; the hero and the call-to-action band keep theirs. |
| X4 | Card grid gaps | Done: hero news, Services and Work are all 16, 24 from 1100 (R6). |
| X5 | 12px uppercase labels | Done: two recipes, label (body font, 0.12em) and chip (body font, 0.08em). Grow moved off the condensed font. The hero's phone captions keep 0.06em: they match the drawings' own labels. |
| X6 | Display titles at the same size, different treatment | Done: every display title has `--tracking-1`; titles that can wrap use `--lh-title`; only h1 and h2 are italic. |
| X7 | Raw numbers | Done: `--lh-tight` in Grow. `.grow-tag-i` stays 1.4em on purpose (it grows with the text). |
| X8 | Two dot strips: Services phone dots (`.svc-dots i`) and Grow dots (`.grow-dot i`) | Open: same look, two sets of rules. One shared dots block would do. Low priority. |

## Fold 1: Hero

- [x] **H1. Padding set in five places.** Done: `padding-block` is written once on `.hero`; the screen sizes and the home phone rule set only `--hero-pad-top` / `--hero-pad-bottom`. Same values as before.
- [x] **H2. Button to Services menu is 64.** Kept: the menu is its own group. Commented as the column gap plus the margin.
- [x] **H3. News cards 12 apart.** Done: 16, 24 from 1100 (R6).
- [x] **H4. News card and menu row padding.** Done: `--sp-3` all round. The news card now takes `.card`'s padding; the menu row's icon and arrow line up with the column's edges (the row hangs out by the same `--sp-3`).
- [x] **H5. Titles.** Done: `.mi-title` and `.news-title` take `--tracking-1`; `.mi-title` takes `--lh-title` (it can wrap). The menu still fits at 1280×800, 17px to spare.
- OK: eyebrow to h1 16, h1 to lead 16, column gap 64, phone gaps all 12 (deliberate, to fit one screen).

## Fold 2: Services

- [x] **S1. Phone: heading to first card is 48.** Done: 32. The row reaches 16px further up into the heading, so the shadow keeps its room; the heading sits above the row so "See all services" keeps its whole tap area.
- [x] **S2. Big card title italic.** Done: upright, as every title under h1 and h2 (`base.css:51`). Size, tracking and line height unchanged.
- [x] **S3. Small tile hides its line with its own clip.** Done: the `.sr-only` recipe (without the -1px margin, which the spacing check flags and which isn't needed here).
- [x] **S4. `.svc-go` label.** Not a problem: it is the label recipe (body font, 0.12em), same as the eyebrow.
- [x] **S5. Phone card line at line height 1.3** (14px running text; R7 says 1.6). Done: 1.6, as the other cards' lines. Cards grow about 14px.
- OK: heading to cards 32 at every size, grid 16/24, the fold fills the screen top to bottom.

## Fold 3: Grow

- [x] **G1. Heading to content.** Done: 32 at every size, from the heading's own margin (`.section-head`), as every section. Picture to card is the card's margin: 24 tablet, 12 phone (one unit with the picture).
- [x] **G2. Card title to text.** Done: 8 at every size (R4).
- [x] **G3. Left column stops halfway.** Done: the heading is level with the picture's top and the card with its bottom (above the controls). `verify_spacing.py` skips that margin (`--tap + --sp-2`).
- [x] **G4. Labels in the condensed font.** Done: corner labels and row labels use the label type (body font, 0.12em), tags the chip type (body font, 0.08em); `--lh-tight` instead of 1. Tags are wider; checked all six steps at 375 wide: inside the picture, never overlapping. `.grow-tag-i` stays 1.4em so it grows with the text.
- [x] **G5. Phone: card to section end.** Done: 64, as every section (the leftover padding from the old sticky player is gone).
- OK: column gap 64, picture to controls 8.

## Fold 4: Work

- [x] **W1. Heading to cards is 56.** Done: `stack-5` dropped; 32 at every size from the heading's margin.
- [x] **W2. Heading sits about 160 down; Services and Grow sit 48 down** (X1). Done: on desktop (3:2 and wider, as Services) the heading is at the top and the three cards fill the rest; their pictures take the height left (`work.css`). Top and bottom edges match Services at 1280×720, 1440×900 and 3440×1440. Bigger text: the cards grow and the pictures keep 4:3.
- [x] **W3. Cards 24 apart on tablet.** Done: `.card-row` is 16, 24 from 1100, as every card grid (also the row on service pages).
- [x] **W4. `.card-title` has no tracking.** Done: `--tracking-1`, as every display title. Shared, so the cards on Services, Work, Contact and the service pages change too.
- Note: the section is a placeholder (`notes.md`).

## Fold 5: Proof (call-to-action band)

- Not a fold: `--section-y` padding (96 desktop, 64 below), band padding 48 desktop / 32 below. All on the rules.
- [x] **P1. Buttons 8 apart.** Done: 12, the plain `.row` gap, as every other pair of buttons on the site (404, coming soon, the service page call to action, the contact form). The band is shared, so About and Services change too.

## Sizes

Every fold was checked at 375×812, 820×1180 and 1440×900 by hand, and by the tools (`verify_styles.py`, `verify_footer.py`, `verify_text.py` at 100% and 200% text, `verify_spacing.py`) at 390×844, 1280×720, 1440×900 and 3440×1440.

## Checking tip

`wrangler dev --assets <dir>` still serves `./dist` (the project's `wrangler.jsonc` wins), and stopping a `wrangler dev` here can leave its `workerd` running on the port. To compare an old build: copy `wrangler.jsonc` and `worker/` next to the old `dist/`, run `node_modules/.bin/wrangler dev --config <that folder>/wrangler.jsonc --port <unused port>`, and check the served `index.html` matches the file before trusting the result.
