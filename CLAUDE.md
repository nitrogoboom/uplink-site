# Uplink Technology site

Static mockup site (fake content) for a made-up IT company. Overwatch 2–inspired look. Read `README.md` first.

- The site is `site/`. Plain HTML/CSS/JS, no build step. Preview: `python tools/serve.py`.
- All colours, sizes and timings live in `site/assets/css/tokens.css`. Use the tokens, don't hard-code values.
- Every illustration is written by a script in `tools/gen_*.py` (hero and tower too: `gen_office.py`, `gen_tower.py` splice their block into `site/index.html`). Change the numbers in the script and rerun; don't hand-edit the SVGs. Each script also writes `NAME-compact.svg` (the phone cut, used wherever the drawing shows small); check it when you change a drawing.
- Illustrations are true isometric. Follow "Drawing rules" in README. After touching a drawing, run `tools/check.py` and `tools/painter.py` on it.
- The footer is generated. Edit the lists in `tools/build_footer.py`, then run `python tools/build_footer.py site`. Don't hand-edit the footer in the pages.
- After any CSS or JS edit, run `python tools/stamp.py site` (updates the `?v=` cache stamps; browsers keep CSS and JS for a year).
- After layout changes, run `tools/verify_footer.py out/` (needs the server on 8765) and check for no sideways scroll at phone, tablet, 1440×900 and 3440×1440.
- Style: no "AI slop" tells. No left-side border accents on cards.
- Copy: short, plain sentences.

When working with cloudflare please see glance at agents-cloudflare.md.
- Open items (bugs, fixes, polish, copy to confirm) live in `notes.md`. Add new ones there and remove a line when it is done.
