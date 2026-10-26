# Uplink Technology site

Static mockup site (fake content) for a made-up IT company. Overwatch 2–inspired look. Read `README.md` first.

- The site is `site/`. Plain HTML/CSS/JS, no build step. Preview: `python -m http.server 8765 --directory site`.
- All colours, sizes and timings live in `site/assets/css/tokens.css`. Use the tokens, don't hard-code values.
- The hero drawing and growing tower are inline SVG in `site/index.html`. `office.svg` / `office-build.svg` share the hero's geometry, so keep them in sync.
- Illustrations are true isometric. Follow "Drawing rules" in README. After touching a drawing, run `tools/check.py` and `tools/painter.py` on it.
- The footer is generated. Edit the lists in `tools/build_footer.py`, then run `python tools/build_footer.py site`. Don't hand-edit the footer in the six pages.
- After layout changes, run `tools/verify_footer.py out/` (needs the server on 8765) and check for no sideways scroll at phone, tablet, 1440×900 and 3440×1440.
- Style: no "AI slop" tells. No left-side border accents on cards.
- Copy: short, plain sentences.
