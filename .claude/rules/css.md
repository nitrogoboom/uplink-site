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
- Lint (`.stylelintrc.json`) refuses: raw spacing; a text size in `px` or screen units; a line height that isn't a `--lh-*` token; a breakpoint not in `em`; any `border-left` or `border-inline-start` (no left-side accents). Don't switch a rule off to get past it; fix the value.
- Text sizes are `--fs-*` tokens, in `rem`. The root size is `--fs-root` (`tokens.css`): the visitor's own font size up to a 1440 window, then it grows with the window to 125%, so text, controls and spacing fill a big screen together. Don't raise the 125% cap and don't size any other text by the screen (`vw`, `svh`): the cap is what keeps zoom working (at least 150% at 200% zoom, 200% by 250%).
- Order matters: a later file wins a tie; `src/styles/global.css` is the cascade order. A section's CSS sits beside its component, desktop layout at the end; a block more than one page uses lives in `src/styles/`.
- After moving CSS, compare before and after by eye: the `check` skill, "Before and after".
- Breakpoints use range syntax (`(width < 43.75em)`): the names in `src/lib/media.js`, one-off queries the same way.
- A box sized to the screen sets a minimum height (`min-height: var(--fold-inner)`), never a fixed one; its picture takes what is left (`flex: 1; min-height: REM_FLOOR`, an absolute `<img>`), so longer words grow the box.
- Headings fit their column (`min(var(--fs-8|7), var(--fit))` against the nearest `container-type: inline-size` box). A heading with a word of 10 letters or more needs `class={fit(text)}` (`src/lib/fit.js`); the site check fails one without it. No heading may get smaller on screen as zoom grows: a `vw` part needs a non-negative rem part, and its column a rem floor. Details: `src/README.md`, "Styles".
- Text size (WCAG 1.4.4) is the browser's zoom and font setting; the site has no text-size option (review C13). A new display option goes in Settings, beside the theme. A language isn't one: French gets `/fr/` addresses.
- Look: no "AI slop" tells.
