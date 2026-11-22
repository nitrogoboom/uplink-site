---
paths:
  - "tools/**"
  - "public/assets/img/**"
  - "src/components/Drawing.astro"
  - "src/styles/theme-drawings.css"
  - "src/styles/theme-light.css"
  - "src/styles/tokens.css"
  - "requirements.txt"
---

# Drawings

- Every illustration is written by `tools/gen_*.py`, the hero (`gen_office.py`), Grow (`gen_grow.py`) and the footer map (`gen_campus.py`) included; the SVGs are outputs. Change the numbers in the script and rerun it. The one hand-edited SVG, `tools/office_parts/hero_cloud.svg`, is an input part `gen_office.py` fills in.
- `tools/gen_light.py` makes each `NAME-light.svg` and `src/styles/theme-drawings.css`. Show a picture through `<Drawing src="/assets/img/NAME.svg" … />`, which writes both copies. Colour new CSS from tokens, which `theme-light.css` swaps.
- Timings in a drawing become classes (`hoist_styles` in `tools/isogen.py`). A drawing shown as a picture keeps them in its own `<style>`; one that goes inside the page (the hero's layers, the footer map) has none, and the tool writes its rules to `src/styles/hero-drawing.css` or `campus-drawing.css`, which the component imports.
- A drawing ships as the tool saves it: the build doesn't shrink or change it. Keep the tools' output lean.
- True isometric, per "Drawing rules" in `docs/drawing-tools.md`. After touching a drawing, run `tools/check.py` and `tools/painter.py` on it (each `rules_NAME.py` gives the command), and look at its `NAME-compact.svg` phone cut.
- Drawings change only locally, when the owner wants them changed; CI and the build don't touch them. A colour change in `tokens.css` changes drawing colours too: rerun the generators. After changing one, `python tools/regen.py --check` reruns every generator and check, and `git diff` must show only the drawings you meant to change. Commit the SVGs with the script.
