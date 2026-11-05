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

- [ ] **S1. Phone: heading to first card is 48** (`services.css:99-100`: negative margin plus scroller padding, so card shadows aren't clipped). Everywhere else 32. Can drop to 32 if the shadow still fits.
- [ ] **S2. Big card title** is italic, 28px, line height 1.1; small tile title upright 22px; Work's card titles 22px with no tracking (X6).
- [ ] **S3. Small tile hides its line with its own clip** (`services.css:62`) instead of `.sr-only`. Same job, second method.
- [ ] **S4. `.svc-go` label** is its own 12px recipe (X5).
- OK: heading to cards 32, grid 16/24, the fold fills the screen top to bottom.

## Fold 3: Grow

- [ ] **G1. Heading to card is 24** (grid `row-gap`, `grow.css:3-4`); should be 32 (X2). Phone: heading to picture 12, picture to card 12.
- [ ] **G2. Card title to text is 12** on desktop and tablet, 8 on phone (`grow.css:85`, `:124`). R4: 8. Already listed as H2 in `spacing.md`.
- [ ] **G3. Left column stops halfway.** At 1440×900 the heading and card take the top 290; the picture runs the full height, leaving about 360 empty under the card. Options: centre the left column against the picture, or sit the card at the picture's bottom.
- [ ] **G4. Labels in the condensed font** and raw `line-height: 1` (X5, X7). `.grow-lbl` has line height 1.6, the other 12px labels 1.
- [ ] **G5. Phone: card to section end is 96** (card `padding-bottom: --sp-6` + section 64, `grow.css:124`). Other folds end at 64.
- OK: column gap 64, picture to controls 8.

## Fold 4: Work

- [ ] **W1. Heading to cards is 56 at every size** (`Work.astro`: `.container.stack-5` + `.section-head` margin). Drop `stack-5` (X2).
- [ ] **W2. Heading sits about 130 down; Services and Grow sit 48 down** (X1). The content is 500 tall in a 900 fold, centred.
- [ ] **W3. Cards 24 apart on tablet**, Services 16 (X4; `shared-blocks.css:37`).
- [ ] **W4. `.card-title` has no tracking** (X6).
- Note: the section is a placeholder (`notes.md`), so keep fixes here small.

## Fold 5: Proof (call-to-action band)

- Not a fold: `--section-y` padding (96 desktop, 64 below), band padding 48 desktop / 32 below. All on the rules.
- [ ] **P1. Buttons 8 apart** (`.cta-band .row`), the plain `.row` is 12. Small; check it reads right on phone where they stack.

## Not measured

Short laptops (under 760 tall, fold padding `--sp-5`) and 3440×1440. Check both when each fold is fixed (`verify_footer.py`, `verify_text.py`).
