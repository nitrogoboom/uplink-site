---
paths:
  - "src/**/*.css"
  - "src/**/*.astro"
  - "src/lib/media.js"
  - "src/lib/fit.js"
  - "postcss.config.mjs"
  - ".stylelintrc.json"
---

# CSS

Read `docs/design.md` before you style anything: colour roles, spacing (`--sp-*` rules R0–R7), line height, corners, layout.

- Values come from tokens in `src/styles/tokens.css`: colours, sizes, timings. Colour by role (`docs/design.md`).
- Use the tokens, not raw numbers: spacing is `--sp-*`, text size `--fs-*` (never `px` or screen units), line height `--lh-*`. Breakpoints are in `em`. No left-side accent borders (`border-left`, `border-inline-start`). `npm run lint` warns on a raw `px` spacing or text size, a breakpoint not in `em`, and a left border (`.stylelintrc.json`); a warning never stops the build. A one-off exception (a 1px clip, `env()`'s `0px` fallback, an optical nudge) gets a `stylelint-disable` comment saying why.
- Text sizes are `--fs-*` tokens, in `rem`. The root size is `--fs-root` (`tokens.css`): the visitor's own font size up to a 1440 window, then it grows with the window to 125%, so text, controls and spacing fill a big screen together. Don't raise the 125% cap and don't size any other text by the screen (`vw`, `svh`): the cap is what keeps zoom working (at least 150% at 200% zoom, 200% by 250%).
- Cascade layers decide which file wins, whatever the selectors' weight: tokens, base, layout, blocks (`src/styles/`), sections (`src/components/`), theme (light), motion, print (`docs/design.md`, "Layers"; the order is in `src/styles/global.css`). To change a shared block on one page, write the rule in that section's file; don't lengthen a selector. A section's CSS sits beside its component, desktop layout at the end; a block more than one page uses lives in `src/styles/`.
- After moving CSS, compare before and after by eye: the `check` skill, "Before and after".
- A block inside the page's column (cards, card rows, steps, call-to-action bands, stats) lays itself out by the column's width: `@container column (--col-medium)`, names in `COLUMN` (`src/lib/media.js`). Page-wide things (the header, tab bar, side margins, one-screen folds) use the window: `@media (--desktop)`, names in `MEDIA`. Both in range syntax.
- **Folds and the fold scale (Home; words in `GLOSSARY.md`).** Each Home section is a fold, and its vertical space comes from the fold scale (`docs/design.md`, "Fold scale"): `--fold-space-1` inside a block, `--fold-space-2` between blocks and under a heading, `--fold-space-3` around a fold. A new space takes one of these steps; never add a section's own height curve or `@media (height …)` rule. The only height switches are the named ones in `MEDIA` (`fold`, `foldMenu`, `foldMenuShort`). The fit is promised from 1280×720 up; below that a fold may scroll, by choice, and must still look right. To check a change, look in the `astro` dev server at 1280×720, 1366×768, 1280×800, 1440×900, 1920×1080 and 2560×1440 (each fold fits), and 1100×700 and 1100×800 (may scroll). A fold that runs over where promised goes in your report with a screenshot; the owner decides. Never write a test or script for the fit.
- A box sized to the screen sets a minimum height (`min-height: var(--fold-inner)`), never a fixed one; its picture takes what is left (`flex: 1; min-height: REM_FLOOR`, an absolute `<img>`), so longer words grow the box.
- Headings fit their column (`min(var(--fs-8|7), var(--fit))` against the nearest `container-type: inline-size` box). A heading with a word of 10 letters or more needs `class={fit(text)}` (`src/lib/fit.js`), or it can overflow its column. No heading may get smaller on screen as zoom grows: a `vw` part needs a non-negative rem part, and its column a rem floor. Details: `src/README.md`, "Styles".
- Text size (WCAG 1.4.4) is the browser's zoom and font setting; the site has no text-size option (review C13). A new display option goes in Settings, beside the theme. A language isn't one: French gets `/fr/` addresses (`src/lib/i18n.ts`).
- Look: no "AI slop" tells.
