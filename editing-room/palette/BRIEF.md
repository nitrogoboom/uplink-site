# Palette brief

Goal: the best dark and light palette for the Uplink site. Uplink is a placeholder name; the site will become SVS MSP. A palette a professional colour theorist would sign off on.

## Hard rules

- Work only in `editing-room/palette/`. Never edit `site/`, `src/`, `tools/` or anything else in the repo. Don't commit.
- The logo colours are fixed: blue `#1F75A6`, crimson `#8D242E`. Wordmark white `#FFFFFF` on dark, `#15181C` on light. Logo files are in `inputs/`. Never retype logo SVG path data; reference or copy the file.
- Crimson appears only inside the logo, never in the UI.
- Ignore any SVS "design system" folder. It is not in use.

## What the owner wants

- Keep the Overwatch 2–inspired feel: dark navy, a warm amber call-to-action, isometric drawings. But it must read as a professional IT company, not a game.
- The palette should sit naturally next to the logo. The site blue should read as the logo's blue family.
- Room for more than 2–3 colours: ramps built from the anchors, plus status colours and illustration colours.
- Both a dark mode (the default, the site today) and a light mode. Light mode is not an inversion; design it on its own terms.
- Copy style: short, plain sentences.

## What exists

- `inputs/tokens-current.css`: the site's real tokens today (dark only). Keep the same token NAMES so a palette drops in. Every `--c-*` and `--iso-*` colour needs a dark and a light value. The isometric drawings use `--iso-*` (box faces top/left/right, highlighted amber faces, blue faces, green trees, ground, grid, windows).
- `inputs/pal.py` / `pal.json`: OKLCH helpers, first-draft ramps (11 steps, 50–950), contrast maths. Reuse and extend.
- `inputs/logo-palette.html`: the first scratch page (dark only).
- Facts found so far: logo blue OKLCH hue ~239. Its complement is ~59; the current amber `#F4A340` is at 68. Current navy `#151E2C` is at hue 259. Logo blue on that navy is 3.3:1; crimson 1.9:1.

## Quality bar (the reviewer checks these)

1. Harmony you can explain with colour theory: hue relationships, consistent OKLCH lightness/chroma steps, neutrals tinted toward the brand hue, a 60/30/10-style balance.
2. Contrast measured, not guessed: WCAG 2 ratios (4.5:1 body text, 3:1 large text, icons, UI edges and focus), plus APCA Lc for body text. Check every text/background pair actually used, in both modes.
3. Colour-vision deficiency: simulate protan, deutan and tritan (Machado or Brettel matrices). Status colours must not rely on hue alone. Note any pair that collapses.
4. Roles: every colour has one job. No colour without a job.
5. Light mode stands on its own: no washed-out amber text (amber on white fails; use a darker amber step for text or keep amber as a fill with dark text).
6. Illustrations still read as lit isometric objects in both modes (top face lightest, left mid, right darkest).

Write scripts in Python. Print the measured numbers into your notes.
