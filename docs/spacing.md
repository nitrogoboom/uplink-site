# Spacing and line height

*Last updated: November 7, 2026*

This page sets the rules for space and line height on the site: which spacing step goes where, and how the rules are checked. Read it before you add or change a margin, padding, gap, or line height.

The spacing scale is `--sp-1` to `--sp-9`, and the type scale is `--fs-1` to `--fs-8`. Both are in `src/styles/tokens.css`.

The pixel values on this page are at a 16 px root: the browser's default font size. The root is the visitor's own font size on every screen, so a value grows with their zoom and font setting, never with the screen. What grows with a big screen is the room round the text: the width of the centred block, the padding of a one-screen section (R1), and the pictures.

| Token | `--sp-1` | `--sp-2` | `--sp-3` | `--sp-4` | `--sp-5` | `--sp-6` | `--sp-7` | `--sp-8` | `--sp-9` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pixels | 4 | 8 | 12 | 16 | 24 | 32 | 48 | 64 | 96 |

## Rules

### R0. Stay on the scale

Every margin, padding, and gap is one of these:

- a `--sp-*` token
- `0`
- a `calc()` of tokens and other size tokens, such as `--icon` or `--tap`

Reset browser defaults, such as the margin on `<dl>` or the padding on `<button>`, to `0` or a token.

An exception needs a `stylelint-disable` comment that says why. There are two today: the 1 px clip on `.sr-only` (`base.css`), and the footer icon nudge (`footer.css`).

### R1. Section padding

There are two kinds of section, and each has one rhythm:

- **Flow section** (`.section`): `--section-y` at the top and bottom. That's `--sp-8` on phone and tablet, and `--sp-9` on desktop.
- **Fold section** (desktop, one screen tall, `fold.css`): `--fold-pad` (`tokens.css`), a step that follows the screen's height: `--sp-5` up to 760 px tall, `--sp-7` up to 1080 px, and `--sp-8` from 1080 px. The content is centred, so the gap you see is bigger.

Two more cases:

- **The first section under the header** gets `--sp-6` at the top. A fold hero can drop to `--sp-5` to fit the screen. The top of a text-only page (`.page-intro`) uses `--sp-7`, or `--sp-8` on desktop.
- **Two sections with the same background** that touch would show a double gap. Avoid it. The service and project pages alternate a banded section with a plain one, so this doesn't happen there.

### R2. Section heading to content

Use `--sp-6` at every size. A heading block shouldn't sit further from its content on a phone than on a desktop.

### R3. Eyebrow to heading

Use `--sp-4`, for every eyebrow on every page.

### R4. Heading to body

The space below a heading is smaller than the space above it, so the heading reads with what follows.

| From | To | Space |
| --- | --- | --- |
| H1 or H2 | Its lead paragraph | `--sp-4` |
| Card or panel title | Its text | `--sp-2` |
| Title | Its own meta line, such as name and role, or title and date | `--sp-1` |
| H3 inside running text (`.prose`) | — | `--sp-6` above, `--sp-3` below |

### R5. Card padding

Padding is the same on all four sides. There are three sizes:

- **Small** (list rows, contact channels, feature rows): `--sp-4`.
- **Card** (steps, stats, people, Grow cards): `--sp-5`.
- **Panel** (call-to-action band, forms, big panels): `--sp-6`, or `--sp-7` from 1100 px.

Picture cards are the one exception: `--sp-3` around the picture and the body (`.card`).

Inside a card, gaps are smaller than its padding. Related lines (see R4) sit closer than separate blocks.

### R6. Grid gaps

- **Card grids:** `--sp-4`, or `--sp-5` from 1100 px, as `.card-row` does (`shared-blocks.css`). Every card grid on a page uses the same gap.
- **Text beside a picture or a second column** (`.split`, page grids): an `--sp-8` column gap on desktop.
- **Form fields:** `--sp-4`.

### R7. Line height for each type size

| Text | Sizes | Line height |
| --- | --- | --- |
| Page and section headings | `--fs-8`, `--fs-7` | `--lh-display` (0.95) |
| Display-font titles that can wrap: card titles, H3, H4 | `--fs-6` to `--fs-4` | `--lh-title` (1.1) |
| One-line text in a fixed-height box: buttons, key caps, chips, tiles | Any | `--lh-tight` (1) |
| Running text at 22 px and up: big leads, intros | `--fs-5` and up | `--lh-snug` (1.3) |
| Running text | `--fs-1` to `--fs-4` | `--lh-body` (1.6) |
| Two-line meta under a title | `--fs-1`, `--fs-2` | `--lh-snug` |

Write line heights as tokens, never as numbers.

## Why the scale is 4 px steps

Keep the 4 px scale. Don't move to a Fibonacci scale (8, 13, 21, 34, 55, 89). This was decided on October 28, 2026, for these reasons:

- **Problems come from picking the wrong step, not from the steps.** Every spacing fix so far was made by choosing a different existing token.
- **Fibonacci drops the steps the site uses most.** `--sp-4` (16) and `--sp-5` (24) are the two most used tokens, with about 106 and 98 uses. Neither is a Fibonacci number, and neither are 4 and 12, which carry chip and icon spacing.
- **13 and 21 are off the 4 px grid.** The controls are 44 px (`--tap`), 48 px (`--control-h`), and 64 px (`--header-h`, `--control-lg`). Body lines are 25.6 px. Fibonacci gaps would never line up with any of them.
- **The top of the scale already grows like Fibonacci.** 16, 24, 32, 48, 64, and 96 step up by ×1.33 to ×1.5. Fibonacci steps by ×1.6. Big gaps already feel proportional, and the small ones need the even grid.
- **Moving would change every value on the site:** about 530 token uses. The styles check (`npm run verify:styles`) would show every page changed.

The one gap in the scale was line height (R7). Two tokens closed it on October 28, 2026: `--lh-tight` (1) and `--lh-title` (1.1).

## How the rules are checked

- **`npm run lint`:** Stylelint refuses a raw length, negative ones included, in `margin*`, `padding*`, `gap`, `row-gap`, `column-gap`, `scroll-margin*`, and `scroll-padding*` (`.stylelintrc.json`).
- **`npm run verify:spacing`**, against `npm run serve`: every margin, padding, and gap the browser computes, on every page at four sizes, must be a step of the scale. It catches what lint can't: browser defaults, and `calc()` sums that land between steps. It reads the scale from `tokens.css`. Allowed exceptions are in its `SKIP` list, each with a reason.

## Change spacing safely

Change spacing on one page per pull request. Each pull request proves itself:

1. Build `main` and your branch, and serve them on two ports.
2. Run `npm run verify:styles -- OLD_URL NEW_URL`. The only differences should be the ones you meant to make.
3. Run `npm run verify`: no sideways scroll, the footer one screen tall, the hero and Grow section working, and axe clean.
4. Run `npm run verify:spacing`: no new values off the scale.

> **Note:** The audit of spacing problems measured on October 28, 2026 (items A1 to D3) was removed from this page on November 5, 2026, because every item was fixed. It's in the git history of this file.
