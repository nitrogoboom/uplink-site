# Drawing tools

The drawing generators and their checks: Python 3.12 or later, in `tools/`. Run them from the project root. The order of work is the `drawing` skill, the rules are `.claude/rules/drawings.md`, and the colour roles are in [`design.md`](design.md#drawing-colours).

## Install the Python drawing tools

```bash
pip install -r requirements.txt
python -m playwright install chromium
```

Only `gen_og.py` uses Python's Chromium. `requirements.txt` is pinned by hand. After you change a version, run `python tools/regen.py --check` and read the diff.

## Drawing rules

- **True isometric.** One axis runs right and down at 30°, one runs left and down at 30°, and verticals go straight up.
- **Colours by name.** Every colour comes from `tools/palette.py`, which reads `src/styles/tokens.css`. Scripts use names, never hex values.
- **Box faces.** Top `pal.TOP`, left `pal.LEFT`, right `pal.RIGHT`: the top is lightest and the right is darkest. Edges are `pal.EDGE`, width 1, opacity 0.3.
- **Highlight faces:** `pal.HI_TOP`, `pal.HI_LEFT`, and `pal.HI_RIGHT`.
- **Accents:** `pal.AMBER` and `pal.SKY`.
- **Labels.** A thin leader line (width 1.2, opacity 0.55) ends in a dot of radius 3 with a 1.5 ring of `pal.PAGE`. The title is capitals at 13px, weight 600. The subline is 11px in `pal.GREY`.
- **Windows on walls:** outlined in `pal.SKY`, width 0.9, opacity 0.5.
- **Floor discs** are true isometric circles (height ÷ width = 0.577), with gaps cut around labels.
- **Wi-Fi access points** hang at ceiling height. Their rings are halos at the access point's height, not on the floor.

## Tools

### The projection

```
screen = origin + ((x − y) · cos30° · u,  (x + y) · u/2 − z · u)
```

`tools/iso.py` provides `W(ox, oy, u)` for this. Each generator sets its own origin and unit near the top of the file.

### Generators

| Tool | What it writes |
| --- | --- |
| `gen_NAME.py public/assets/img/NAME.svg` | One scene: `hq`, `strategy`, `backup`, `helpdesk`, `network`, `security`, `cloud`, or `voip`. Also the phone cut `NAME-compact.svg` and the card cut `NAME-card.svg`. |
| `gen_office.py public` | `office.svg`, `office-card.svg`, and the hero: `hero-office.svg`, `hero-office-tablet.svg`, `office-compact-build.svg` (animated phone cut), `office-compact-flows.svg`, `hero-office-phone.svg` (phone still), and `src/components/home/hero-flows.svg`. The animation CSS and the cloud's frame are in `tools/office_parts/`; the cloud's shapes come from `hero_cloud.py`. |
| `gen_grow.py` | `src/components/home/grow-world.svg`. Every part carries the step it arrives on (`data-s`); `src/scripts/grow.js` plays them. |
| `gen_campus.py` | `public/assets/img/campus.svg`, the footer map. No phone cut. `src/styles/footer.css` styles its parts by class. It's decoration: `aria-hidden="true"`, no role or label. |
| `gen_light.py` | The light drawings: `NAME-light.svg` beside each `NAME.svg`, and `src/styles/theme-drawings.css` for the drawings inside the page. `regen.py` runs it last. `--check` fails if an output is out of date. |
| `gen_og.py public` | `og.png` (1200×630) and `apple-touch-icon.png` (180×180): screenshots of a page built from the tokens, fonts, and `office-card.svg`. Rerun it after you change any of those. |

A generator that runs with nothing changed writes the same file, byte for byte.

To run every generator but `gen_og.py` (its screenshots depend on the machine):

```bash
python tools/regen.py
```

CI doesn't run the generators. Before you commit a drawing change, run `python tools/regen.py --check`, and commit the SVGs with the script. A `git diff` that shows a drawing you didn't mean to change is a hand edit, or a script changed without its output.

**Which cut shows where.** The phone cut (`NAME-compact.svg`) is the same scene framed closer, with fewer and bigger labels (`COMPACT` in each generator). Pages swap it in with `<picture>`: on a service's page below 1200 px, and on About below 1600 px. Cards always use `NAME-card.svg`: the phone cut without labels (`isogen.card()`). On phones, the Home hero plays `office-compact-build.svg`, starting on the furnished room (`PHONE_AHEAD` in `gen_office.py`); with reduced motion it stands still, and without script phones show `hero-office-phone.svg`.

When you change a drawing's labels or layout, check its phone cut too.

### Shared drawing code

| Module | What it provides |
| --- | --- |
| `palette.py` | Every drawing colour by name (`pal.AMBER`, `pal.EDGE`, `pal.SCREEN`). Roles are read from `tokens.css`; shades with no role are worked out here (`navy(L)`, `tone(hue, L, C)`). To change a colour, change it in `tokens.css`, then rerun the generators. Part files in `tools/office_parts/` write colours as `{{pal:NAME}}`. |
| `iso.py` | The projection, `W(ox, oy, u)`. |
| `isogen.py` | Boxes (`box()`, which can log each box to the generator's `BOXES`), the document (`doc(crop=)`), labels (`label(scale=)`; a newline wraps a title or subline), the floor gaps round their words (`label_text_gaps()`), the card cut (`card()`), `esc()` for any words written into a drawing, and `hoist_styles`, which turns inline timings into classes in a `<style>` block. |
| `isoprops.py` | Props: office chair, monitor on a stand (`screen_glass`, `app_window`), VoIP desk phone. `on_front`, `on_side`, and `on_top` draw flat details exactly on a box face. Props sit on a grid (x and y in steps of 0.25, z in steps of 0.125); keep the scene around them on the same grid. |
| `hero_cloud.py` | The hero's cloud. |
| `svgfont.py` | Embeds the Barlow letters a drawing uses (an SVG in an `<img>` can't see the page's fonts). The generators call it. Fonts: `tools/fonts/`. Needs `fonttools` and `brotli`. |

### Check a drawing

After you change a drawing, run both checks on it. Each exits with status 1 on any finding.

- **`check.py FILE.svg`** finds edges near an isometric angle but not on it (`ANGLE`), vertices of different shapes that nearly meet (`SNAP`), and vertices that nearly touch another shape's edge (`TJOIN`). It lists where each leader dot sits (`DOT`), which doesn't fail the check. For an SVG inline in an HTML file: `check.py FILE START_LINE END_LINE`.
  - It skips leader lines in `.co` groups, `class="mark"` parts, and the floor grid (`class="floor"` on a line or its group). `class="free"` parts skip only `ANGLE`.
  - A near-miss that a later opaque face covers isn't reported.
  - `<g class="curve">` holds a curved surface cut into flat strips. Its strips aren't checked against each other.
  - `--step PX` counts vertex pairs exactly one grid step apart along an isometric axis, instead of listing them. Use it for drawings whose props sit on a grid finer than 2 px on screen. For the office: `--step 1.758` (0.0625 × 28.127).
- A drawing's CSS, its own `<style>` or the site's, styles parts by class, never by tag: SVGO writes `<polygon>`, `<line>` and `<rect>` as `<path>`. `npm run build` stops on a drawing whose `<style>` breaks this rule.
- **`painter.py`** finds boxes drawn in the wrong order or poking into each other. It fails when it finds no boxes, or when the rules file resolves none of them (usually a wrong origin or unit in the command). Each drawing has a `rules_NAME.py`; its first lines give the exact commands for both checks, on every cut. For Grow:

  ```bash
  python tools/painter.py src/components/home/grow-world.svg 0 0 20 tools/rules_grow.py
  python tools/check.py src/components/home/grow-world.svg
  ```

- **Every check at once:** `python tools/regen.py --check` regenerates the drawings, then runs every command the rules files list. `--checks-only` skips the generators.
- **The tools' own tests:** `python -m pytest tools/tests`.
