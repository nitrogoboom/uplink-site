# Light theme, every other page: contrast review (November 8, 2026)

The same review as Home (`docs/light-theme-home-review-2026-11-08.md`), run on the other 19 pages and on the states you only see after a click. > **Note:** Applied on November 8, 2026: the WCAG fixes and the faint edges (items 1–5 on Home, S1–S2 on the other pages), with one more found by the site check's dot test in light: Grow's dots for steps already shown (1.35:1, now amber ink at 0.8, 3.8:1). The page and band went one step greyer and cards solid white (`docs/light-theme-2026-11-08.md`). The optional items are still open.

At the time of writing, nothing here was applied. It doesn't repeat Home's findings; where one of them also shows on other pages, it says so.

## What was measured

1. Every page in the sitemap except Home, plus `/soon`: light and dark, at 1440×900 and 390×844, 2× pixels, reduced motion.
2. Open states: Settings; the Book dialog with its errors showing; the Contact form with its errors showing; `/work` with a filter chosen; every FAQ open on `/services`; and each footer section open.
3. The same pixel method as Home:
   - the background comes from a screenshot with all text made transparent;
   - the text colour is the glyph pixel farthest from it;
   - controls are measured against what's around them.

**Result:** every line of text on every page and state passes in light, and none is much weaker in light than in dark. That's the main news: the light tokens hold across the site. What's left is the same pattern as Home: **"you are here" marks in pale amber on white**.

## Fix: fails WCAG in light only

| # | Where | Light | Dark | Proposed fix | After |
| --- | --- | --- | --- | --- | --- |
| S1 | **Settings, the chosen theme** (every page) | its amber border on white: **1.85** | 9.5 | In light, the chosen option's border takes `--c-accent-text`, as the open footer tile already does | 6.5 |
| S2 | **`/work`, the chosen filter** | an amber fill is all that marks it: **1.8** against the other chips, 1.7 against the page | 9.1 | In light, add a 2px `--c-accent-text` border to the chosen chip; the fill stays | 6.0 |

Both are WCAG 1.4.11: the mark that shows which option is on needs 3:1. **The open footer tile is the model.** It's an amber tint with a 2px `--c-accent-text` border, and it measures 6:1 in light. S1 and S2, like Home's items 1 and 2 (the current dot and Grow's open step), only need to borrow that border colour. Together the four fixes make one rule for the light theme: **amber can fill, but a mark that carries meaning is drawn in amber ink.**

## Home's findings on other pages

| Home item | Also on | Note |
| --- | --- | --- |
| 5, card edges (`--c-line` at 0.12, 1.25:1) | Every page with cards or panels: Services, Work, About stats and team, Contact channels, the case-study facts, the footer tiles | One token, so the fix reaches every page at once. |
| 4, cool panels (`--c-cool-surface`) | The picture panel on service and case-study pages (`hero-section.css`) | These panels have a visible edge and read well. Only Home's news cards lose theirs. |
| 7, amber buttons | Every page ("Talk to us about this", "Book a check-up", "Send message", "Back to home") | The labels pass at 9.5:1; the amber against white is 1.6–1.8. Optional, as on Home. |
| 8, the footer map's amber tower | Every page | Decoration. Optional, as on Home. |

Home's items 1–3 (the current dot, Grow's open step, the faded Grow row) appear only on Home.

## Checked and fine

- **Every text run on every page, light theme:** passes. Headings, body, labels, links, chips, prices, the case-study "Result" line (amber ink), legal pages, and `/soon`.
- **Forms:** error messages (`#B24438`) are 5.6:1 on white; error borders and focus rings are clear; placeholders and hints pass.
- **Book dialog:** text and both buttons pass. (A first reading was taken while the dialog was still fading in.)
- **The open footer tile:** tint plus a 2px amber-ink border, 6:1. The model for S1 and S2.
- **Contact's queue ring:** the "1 day" arc reads as amber ink in light.
- **The drawings:** every service and case-study picture loads its light copy; labels on them pass.

## Readings that weren't real

The pixel method reports anything it can't see as 1:1. These were checked by hand and dropped:

- **FAQ answers** on the service pages: closed `<details>`, so the answer isn't shown.
- **Footer sections on phones:** closed until tapped.
- **Phone readings near the bottom of a page:** a full-page screenshot draws the fixed tab bar over the page, so its icons land on whatever text is behind them. (The Work card details read 1.4–3.9, but their colour is the normal muted grey, 7:1.)
- **The Book dialog's buttons and Contact's "Reach us directly"** while a dialog or toast was fading.

## In both themes, not light-specific

- The header's ghost buttons and the secondary buttons ("Cancel", the phone number) have a `--c-line` edge (1.2 light, 1.5 dark), where palette rule 6 asks for `--c-edge`. As on Home: their words identify them, so it passes WCAG, but it's a site-wide palette gap.
- The open footer tile's amber icon tile, About's "Since 2011" chip and the `/work` filter's count badges are amber fills behind dark text. The text passes; the fills are decoration.

## Suggested order

Apply Home's 1–3 together with S1 and S2: five small rules in `src/styles/theme-light.css`, all "amber ink for a mark that carries meaning", with no change to dark. Then Home's 4–5 (two token lines, which reach every page). Then look again at the optional items on the preview.
