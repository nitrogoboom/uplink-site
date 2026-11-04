# Spacing and rhythm

Rules for space on the site, what breaks them today, and how it is checked. The space scale is `--sp-1` to `--sp-9` in `src/styles/tokens.css`. The type scale is `--fs-1` to `--fs-8` there too.

Pixel values below are at the 1440×900 reference (16px root). On bigger desktops the root grows, so every value grows with it.

| Token | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|
| px | 4 | 8 | 12 | 16 | 24 | 32 | 48 | 64 | 96 |

## Rules

**R0. On the scale.** Every margin, padding and gap is a `--sp-*` token, 0, or a `calc()` of tokens and other size tokens (`--icon`, `--tap`). Reset browser defaults (`<dl>` margin, `<button>` padding) to 0 or a token. Exceptions carry a `stylelint-disable` comment that says why. Today there are two: the `.sr-only` 1px clip and the footer icon nudge.

**R1. Section padding.** Two kinds of section, each with one rhythm.
- Flow section (`.section`): `--section-y` top and bottom. That is `--sp-8` on phone and tablet, `--sp-9` on desktop.
- Fold section (desktop, one screen tall, `fold.css`): `--sp-7`, or `--sp-5` on short screens. The content is centred, so the real gap is bigger.
- First section under the header: `--sp-6` top. A fold hero may drop to `--sp-5` to fit the screen. Text-only page tops (`.page-intro`) use `--sp-7`, `--sp-8` on desktop.
- Two sections with the same background touching: one gap, not two (`detail-pages.css` already does this).

**R2. Section head to content.** `--sp-6` at every size. A heading block should not sit further from its content on a phone than on a desktop.

**R3. Eyebrow to heading.** `--sp-4`. Every eyebrow, every page.

**R4. Heading to body.** Space below a heading is smaller than space above it, so it reads with what follows.
- H1 or H2 to its lead: `--sp-4`.
- Card or panel title to its text: `--sp-2`.
- Title to its own meta line (name and role, title and date): `--sp-1`.
- H3 inside running text (`.prose`): `--sp-6` above, `--sp-3` below.

**R5. Card padding.** Three sizes, padding the same on all four sides.
- Small (list rows, contact channels, feature rows): `--sp-4`.
- Card (steps, stats, people, grow cards, next links): `--sp-5`.
- Panel (call-to-action band, forms, big panels): `--sp-6`, `--sp-7` from 1100px.
- Picture cards are the one exception: `--sp-3` around the picture and the body (`.card`).
- Inside a card, gaps are smaller than its padding. Related lines (R4) sit closer than separate blocks.

**R6. Grid gaps.**
- Card grids: `--sp-4`, `--sp-5` from 1100px (as `.svc-cards` and `.work-grid` do). Every card grid on a page uses the same gap.
- Text beside a picture or a second column (`.split`, page grids): `--sp-8` column gap on desktop.
- Form fields: `--sp-4`.

**R7. Line height per type size.**

| Text | Sizes | Line height |
|---|---|---|
| Page and section headings | `--fs-8`, `--fs-7` | `--lh-display` (0.95) |
| Display-font titles that can wrap (card titles, H3, H4) | `--fs-6` to `--fs-4` | `--lh-title` (1.1) |
| One-line text in a fixed-height box (buttons, key caps, chips, tiles) | any | `--lh-tight` (1) |
| Running text at 22px and up (big leads, intros) | `--fs-5`+ | `--lh-snug` (1.3) |
| Running text | `--fs-1` to `--fs-4` | `--lh-body` (1.6) |
| Two-line meta under a title | `--fs-1`, `--fs-2` | `--lh-snug` |

Write line heights as tokens, not numbers.

## What breaks the rules today

Measured on every page at phone (390×844), tablet (820×1180), 1440×900 and 3440×1440. The sizes agree with each other except where noted. The scale itself is used well: only one raw spacing value in all the CSS, and every grid gap lands on a step.

### Every page

| # | Rule | Problem | Where |
|---|---|---|---|
| A1 | R0 | Buttons keep the browser's 1px top and bottom padding (6px sides on `.tile` and `.copy-btn`). | `.btn`, `.hbtn`, `.filter`, `.tile`, `.copy-btn`; reset in `src/styles/base.css` |
| A2 | R0 | `dl.facts` keeps the browser's 1em margin: 14px on About, Work and Contact, 16px on detail pages. | `src/styles/facts.css:2` |
| A3 | R2 | Section head to content is 48px on phone and tablet but 32px on desktop. Bigger gap on the smaller screen. | `layout.css:20` (`--sp-7`), `fold.css:8` (`--sp-6`) |
| A4 | R7 | Line heights typed as numbers in 13 places: `1` (buttons, key caps, footer tiles, brand), `1.05` (card titles, news title, footer lists), `1.2` and `1.3` (footer), `0.92` (footer heading). | `buttons.css`, `key-hints.css`, `header.css`, `footer.css`, `surfaces.css:26`, `hero.css:48,62`, `pick.css:48` |
| A5 | R7 | Same-looking titles, two leadings: `h3` at 22px uses 1.3, `.card-title` at 22px uses 1.05. | `base.css:49`, `surfaces.css:26` |
| A6 | R7 | Footer heading at 0.92 while every other `--fs-8` heading is 0.95. | `footer.css:34` |

### Home

| # | Rule | Problem | Where |
|---|---|---|---|
| H1 | R6 | Card grids differ on one page: service cards 24px apart, steps and stats 16px. | `shared-blocks.css:23,35` |
| H2 | R4 | Grow card title to text is 12px. | `grow.css:65` |
| H3 | — | Not a problem: step text sits 12px under the number tile (on scale). The 20px was measured from the title, which is centred on the taller tile. | `shared-blocks.css:27` |

### Services

| # | Rule | Problem | Where |
|---|---|---|---|
| S1 | R7 | Done: the plans table was removed (2 Nov 2026). | |

### Work

| # | Rule | Problem | Where |
|---|---|---|---|
| W1 | R0 | Facts list margin. Fixed with A2; no Work PR needed. | `facts.css` |

### About

| # | Rule | Problem | Where |
|---|---|---|---|
| B1 | R3, R4 | Eyebrow to H1 and H1 to lead are 24px. Every other page top uses 16px. | `profile.css:10` |
| B2 | — | Not a problem: the profile card is a picture card. The picture sits 16px in and the text 24px, which fits R5. | `profile.css:5` |
| B3 | R4, R5 | Person card: name and role are 8px apart, but at 1.6 line height they look 16px apart, the same as the gap between cards. Name and role read as separate items. | `team.css:5` |
| B4 | R6 | Team grid is 16px apart; stats 12px. | `team.css:2`, `shared-blocks.css:34` |
| B5 | R4 | Timeline title to text is 4px; other card titles get 8 to 12px. | `story.css:8` |

### Contact

| # | Rule | Problem | Where |
|---|---|---|---|
| C1 | R5 | Contact channel rows pad 12px; R5 small is 16px. | `message.css:9` |

### Service and project pages

| # | Rule | Problem | Where |
|---|---|---|---|
| D1 | R4 | H3 in the write-up: 32px above but 16px below, the same as between paragraphs. Should be closer to its text. | `detail-pages.css:11` |
| D2 | R5 | Next link pads 24px top and bottom, 32px sides. | `detail-pages.css:20` |
| D3 | R7 | The service lead and the project intro are 22px at 1.6 line height. | `service-page.css:14`, `project-page.css:16` |

## The scale: keep it

Keep the 4px scale. Don't move to 8, 13, 21, 34, 55, 89.

- **The problems are in which step gets used, not in the steps.** Only one raw value in all the CSS. Every finding above is fixed by picking a different existing token.
- **Fibonacci drops the steps the site uses most.** `--sp-5` (24) and `--sp-4` (16) are the two most used tokens (97 and 89 uses). 16 and 24 are not on the Fibonacci list, and neither is 4 or 12, which carry chip and icon spacing.
- **13 and 21 are off the 4px grid.** The controls are 44 (`--tap`), 48 (`--control-h`) and 64 (`--header-h`, `--control-lg`). Body lines are 25.6px. Fibonacci gaps would never line up with any of them, and they turn into fractions on scaled desktops.
- **The top of the current scale already grows like Fibonacci.** 16, 24, 32, 48, 64, 96 steps up by ×1.33 to ×1.5. Fibonacci steps by ×1.6. Big gaps already feel proportional; the small ones need the even grid.
- **Moving costs every value on the site,** about 480 token uses, and `verify_styles.py` would show every page changed.

The one gap was line height (R7). Two tokens close it (28 Oct 2026): `--lh-tight` (1) and `--lh-title` (1.1).

## How it is checked

- `npm run lint`: Stylelint refuses a raw length in `margin*`, `padding*`, `gap`, `row-gap`, `column-gap`, `scroll-margin*` and `scroll-padding*` (`.stylelintrc.json`). Negative raw values too.
- `python tools/verify_spacing.py` (against `npm run serve`): every margin, padding and gap the browser computes, on every page at the four sizes, must be a step of the scale. This catches what lint can't: browser defaults and `calc()` sums that land between steps. It reads the scale from `tokens.css`. Allowed exceptions are in its `SKIP` list, each with a reason. It fails today on A1 and A2.

## Fixing it

One page per pull request, in this order: every page (A1 to A6), Home, Services, Work, About, Contact, service and project pages. Each one proves itself:

1. Build `main` and the branch; serve them on two ports.
2. `python tools/verify_styles.py OLD_URL NEW_URL`: the only differences are the ones the PR means to make.
3. `python tools/verify_footer.py out/`: no sideways scroll, footer one screen tall, hero and tower working, axe clean.
4. `python tools/verify_spacing.py`: no new off-scale values.
