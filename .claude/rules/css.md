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

- Values come from tokens in `src/styles/tokens.css`: colours, sizes, timings. Lint refuses raw spacing. Colour by role (`docs/design.md`).
- Text sizes are in `rem`; the root has no font size of its own, so zoom and the visitor's font setting work everywhere. The screen (`vw`, `svh`) may size pictures, gaps and page width, never text.
- Order matters: a later file wins a tie; `src/styles/global.css` is the cascade order. A section's CSS sits beside its component, desktop layout at the end; a block more than one page uses lives in `src/styles/`.
- After moving CSS, prove nothing changed: build old and new, then `npm run verify:styles -- OLD_URL NEW_URL`.
- Breakpoints are in `em`, in range syntax (`(width < 43.75em)`): the names in `src/lib/media.js`, one-off queries the same way.
- A box sized to the screen sets a minimum height (`min-height: var(--fold-inner)`), never a fixed one; its picture takes what is left (`flex: 1; min-height: REM_FLOOR`, an absolute `<img>`), so longer words grow the box.
- Headings fit their column (`min(var(--fs-8|7), var(--fit))` against the nearest `container-type: inline-size` box). A heading with a word of 10 letters or more needs `class={fit(text)}` (`src/lib/fit.js`); the site check fails one without it. No heading may get smaller on screen as zoom grows: a `vw` part needs a non-negative rem part, and its column a rem floor. Details: `src/README.md`, "Styles".
- Text size (WCAG 1.4.4) is the browser's zoom and font setting; the site has no text-size option (review C13). The zoom check (`npm run verify:zoom`, also part of `npm run verify`) holds it. New display options (EN/FR) go in Settings, beside the theme.
- Cards have even borders, never a left-side accent.
- Look: no "AI slop" tells.
