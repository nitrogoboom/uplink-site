# Drawing tools

Python 3.12+, in `tools/`, run from the project root. Workflow: the `drawing` skill. Colour roles: [`design.md`](design.md#drawing-colours).

## Install the Python drawing tools

```bash
pip install -r requirements.txt
python -m playwright install chromium
```

Only `gen_og.py` needs Chromium. After changing a pinned version, run `python tools/regen.py --check`.

## Drawing rules

- **True isometric.** One axis runs right and down at 30°, one runs left and down at 30°, and verticals go straight up.
- **Colours by name** from `tools/palette.py` (reads `tokens.css`), never hex. Faces `pal.TOP`/`LEFT`/`RIGHT` (highlight `HI_*`), edges `pal.EDGE` width 1 at 0.3, accents `pal.AMBER`, `pal.SKY`.
- **Labels.** A thin leader line (width 1.2, opacity 0.55) ends in a dot of radius 3 with a 1.5 ring of `pal.PAGE`. The title is capitals at 13px, weight 600. The subline is 11px in `pal.GREY`.
- **Windows on walls:** outlined in `pal.SKY`, width 0.9, opacity 0.5.
- **Floor discs** are true isometric circles (height ÷ width = 0.577), with gaps cut around labels.
- **Wi-Fi access points** hang at ceiling height. Their rings are halos at the access point's height, not on the floor.

### Motion in a drawing

What moves in a drawing costs the visitor's processor for as long as it is on screen, so each kind of motion uses the cheapest way that looks the same (measured on Home, November 17, 2026: the hero went from 29% of a slowed phone's main thread to 8%).

- **Fades, pulses and things that grow or slide** animate `opacity` or `transform` in CSS, in steps. The graphics chip runs those by itself.
- **Moving dashes** (data along a cable, a route on the footer map, the band round Grow's dome) do not get a CSS animation. Animating `stroke-dashoffset` makes the browser do a full frame of page work 60 times a second while it runs, however few steps it has. They follow the site's beat: `core.js` counts up about six times a second and writes the count to `--dash` on each line a script registers (`dashes()`), and the drawing's CSS turns it into an offset, `stroke-dashoffset: calc(var(--dash, 0) * -2px)`. The count wraps at 360, so a step times 360 must be a whole number of the line's dash periods. A line that runs the other way sets `--dash-dir: -1` (the hero's `.ob-flow`).
- **Anything else that animates a colour, a stroke or a size** is a per-frame cost of the same kind: do it once (a build, a transition on a tap), never as a loop.
- A drawing shown as an `<img>` has no script, so its dashes stand still.

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
| `gen_office.py public` | `office.svg`, `office-card.svg`, and the hero: its layers in `src/components/home/hero/` (one `<svg>` each, inlined in order by `Hero.astro`) and `src/components/home/hero-place.css` (the phone framing, and where each label's words go). The hero draws no words: its labels' lines and dots are drawn, and the page sets the words (Home's copy) at each line's end. The loop CSS and the cloud's frame are in `tools/office_parts/`; the cloud's shapes come from `hero_cloud.py`. |
| `gen_grow.py` | `src/components/home/grow-world.svg`. Every part carries the step it arrives on (`data-s`); `src/scripts/grow.js` plays them. |
| `gen_campus.py` | `public/assets/img/campus.svg`, the footer map. No phone cut. `src/styles/footer.css` styles its parts by class. It's decoration: `aria-hidden="true"`, no role or label. |
| `gen_light.py` | The light drawings: `NAME-light.svg` beside each `NAME.svg`, and `src/styles/theme-drawings.css` for the drawings inside the page. `regen.py` runs it last. `--check` fails if an output is out of date. |
| `gen_og.py public` | `og.png` (1200×630) and `apple-touch-icon.png` (180×180): screenshots of a page built from the tokens, fonts, and `office-card.svg`. Rerun it after you change any of those. |

Generators are deterministic. `python tools/regen.py` runs all but `gen_og.py`. CI doesn't run them: run `python tools/regen.py --check` and commit the SVGs with the script; an unexpected drawing in `git diff` means a hand edit or a stale output.

**Which cut shows where.** The phone cut (`NAME-compact.svg`) is the same scene framed closer, with fewer and bigger labels (`COMPACT` in each generator). Pages swap it in with `<picture>`: on a service's page below 1200 px, and on About below 1600 px. Cards always use `NAME-card.svg`: the phone cut without labels (`isogen.card()`). The Home hero is one drawing on every screen: phones frame it closer (`PHONE_CROP`) with only the cloud's label, and where it shows small two labels (Teams room, Guest Wi-Fi) go.

Check the phone cut after changing labels or layout.

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

Both exit 1 on any finding. Each `rules_NAME.py` lists the exact commands for every cut.

- **`check.py FILE.svg`**: `ANGLE` (edge near but off an isometric angle), `SNAP` (vertices that nearly meet), `TJOIN` (vertex nearly on another edge); `DOT` lists leader dots (no fail). Skips `.co` leaders, `class="mark"`, the floor grid; `class="free"` skips `ANGLE` only; `<g class="curve">` strips aren't checked against each other; covered near-misses aren't reported. `--step PX` counts one-grid-step pairs (office: `--step 1.758`). Inline SVG: `check.py FILE START END`.
- **`painter.py`**: boxes drawn out of order or overlapping. Fails if it finds or resolves no boxes (usually a wrong origin or unit). Grow: `python tools/painter.py src/components/home/grow-world.svg 0 0 20 tools/rules_grow.py`.
- Drawing CSS styles by class, never by tag (SVGO turns shapes into `<path>`); the build enforces it.
- Everything: `python tools/regen.py --check` (`--checks-only` skips generating).

### Before it ships

The site's scripts trust the drawings and words we make; nothing checks them live. Look once before shipping a change to:

- **The footer map or `footer.json`**: every section's `map` key has a `.dist[data-k]` spot in the map.
- **Grow**: every tag's `data-at` has a `.tg-a[data-a]` anchor in `grow-world.svg`.
