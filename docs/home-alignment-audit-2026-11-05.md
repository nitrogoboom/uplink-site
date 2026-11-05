# Home: alignment and style audit (5 Nov 2026)

Home only. Measured on the dev server at 1440×900, 820×1180 and 375×812, then checked against the CSS and the rules in `docs/spacing.md` (R0 to R7). Pixel values are at the 1440×900 reference. We fix one fold at a time; tick a line off when its fold is done.

Fold order: 1 Hero, 2 Services, 3 Grow, 4 Work, 5 Proof.

## Across the page (decide once, apply in each fold)

| # | What | Now | Rule / suggestion |
|---|---|---|---|
| X1 | Where a fold's heading sits | Services and Grow start at the top of the fold (48 down). Work is centred, so its heading sits about 130 down. Scrolling fold to fold, the heading jumps. | Pick one. Suggest: every fold pins its head to the top (`--sp-7` padding) and the content fills or centres below it. |
| X2 | Heading block to its content | Services 32. Grow 24 (`.grow-head` margin set to 0, grid `row-gap` instead). Work 56 (`.stack-5` gap 24 + `.section-head` margin 32, both at once). Phone: Services 48, Grow 12, Work 56. | R2: 32 at every size. One method: `.section-head`'s margin. Wrappers add no gap of their own. |
| X3 | Same job, different classes: a heading block | `.section-head`, `.section-head--split > :first-child`, `.hero-top`, Proof's `.stack`. All give 16 between eyebrow, heading and lead. | Result is right. Keep `.section-head` for section heads; the hero and the call-to-action band can keep theirs. |
| X4 | Card grid gaps | Hero news 12 at every size. Services 16 tablet, 24 desktop. Work 24 from tablet. | R6: 16, 24 from 1100. Work's `.card-row` steps up at 700 instead of 1100 (`shared-blocks.css:37`). Hero news at 12 is the odd one. |
| X5 | 12px uppercase labels: five recipes | `.eyebrow` and `.label`: body font, 0.12em. `.chip`: body, 0.08em. `.svc-go`: body, 0.12em. Grow's `.grow-lbl`, `.grow-tag`, `.grow-place`, `.grow-team`: condensed font, 0.08em. Hero captions: 0.06em. | Two recipes: label (body, 0.12em) and chip (body, 0.08em). Grow moves to the body font. |
| X6 | Display titles at the same size, different treatment | 22px: Grow `h3` and the small service tile title have 0.02em tracking; `.card-title` has none. 28px: big service title is italic, 0.02em, line height 1.1; hero menu `.mi-title` is upright, no tracking, line height 1. | One title recipe per size. The big service title's italic breaks `base.css:51` (italic is for h1 and h2 only). |
| X7 | Raw numbers | `line-height: 1` at `grow.css:18` and `:38`; `.grow-tag-i` is `1.4em` square. | R7: `--lh-tight`. |
| X8 | Two dot strips | Services phone dots (`.svc-dots i`) and Grow dots (`.grow-dot i`): same look, two sets of rules. | One shared dots block. Low priority. |

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
- [ ] **W2. Heading sits about 160 down; Services and Grow sit 48 down** (X1). The content is under 500 tall in a 900 fold, centred. Open: a design call (see below).
- [x] **W3. Cards 24 apart on tablet.** Done: `.card-row` is 16, 24 from 1100, as every card grid (also the row on service pages).
- [x] **W4. `.card-title` has no tracking.** Done: `--tracking-1`, as every display title. Shared, so the cards on Services, Work, Contact and the service pages change too.
- Note: the section is a placeholder (`notes.md`), so keep fixes here small.

## Fold 5: Proof (call-to-action band)

- Not a fold: `--section-y` padding (96 desktop, 64 below), band padding 48 desktop / 32 below. All on the rules.
- [ ] **P1. Buttons 8 apart** (`.cta-band .row`), the plain `.row` is 12. Small; check it reads right on phone where they stack.

## Not measured

Short laptops (under 760 tall, fold padding `--sp-5`) and 3440×1440. Check both when each fold is fixed (`verify_footer.py`, `verify_text.py`).
