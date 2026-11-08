# Light theme: November 8, 2026

The site has a light theme beside its dark one. Visitors pick it in Settings: **System** (the default, follows the device), **Light**, or **Dark**. It started as a test copy of Home at `/light`; that page is gone now that every page has both themes.

## How it works

It follows the common pattern for a theme switch (web.dev, "Building a theme switch component"; MDN, `prefers-color-scheme`):

1. **One attribute.** `<html data-theme="light">` or `"dark"`. Every light colour hangs off it.
2. **Set before the first paint.** A short inline script in `Base.astro`'s `<head>` reads the saved choice (`localStorage` `uplink.theme`). With no choice, or `system`, it reads `prefers-color-scheme`. So the page never flashes the wrong theme. The CSP allows the script by its hash (`scripts/headers.mjs` adds it, as for every inline script).
3. **Kept right after that.** `core.js`:
   - applies a choice in Settings at once and saves it;
   - follows the device when it switches between light and dark while System is chosen (`matchMedia` `change`);
   - takes a choice made in another open tab (`storage` event);
   - re-reads the choice when the back/forward cache restores a page (`pageshow`, review J12);
   - updates `<meta name="theme-color">`, the colour of the browser's own bar.
4. **The control.** Native radio buttons in a `<fieldset>` with a `<legend>`, so the arrow keys move between them and a screen reader announces the group and each option. The look (`.seg`) is the one the old text-size option used (git `030a4f5^`). The chosen option has an amber tint and a 2px amber border, so it shows by more than colour (WCAG 1.4.1). It takes system colours in forced-colours mode.
5. **Without script** the page is dark, the site's own look.

| Part | File |
| --- | --- |
| Head script | `src/layouts/Base.astro` |
| Settings control | `src/components/SettingsDialog.astro`, `.seg` in `src/styles/forms.css` |
| Theme logic | `src/scripts/core.js` (theme section; exports `theme.ev` for scripts that draw in a colour) |
| Light tokens | `src/styles/theme-light.css` |
| Drawings | `tools/gen_light.py`, `src/components/Drawing.astro`, `src/styles/theme-drawings.css` |
| Check | `checks/site.spec.mjs`, "theme: System, Light and Dark in Settings" |
| Privacy page | `src/data/privacy.md` lists `uplink.theme` |

## Drawings

The dark drawings stay the source. `tools/gen_light.py` swaps their colours by role, so a change to a `gen_*.py` reaches the light theme on the next run (`tools/regen.py` runs it last, and CI's drawings job fails if an output is out of date).

- **Pictures** (`<img>`, `<picture>`): `NAME-light.svg` beside each `NAME.svg`. `Drawing.astro` writes both, each with a class (`.th-dark`, `.th-light`), and CSS hides the one that isn't the theme's. A picture that isn't shown isn't fetched, so a page downloads only its theme's copies (the theme check holds this). Both copies are `loading="lazy"` for that reason, also where the picture used to load eagerly; a lazy picture on the first screen still loads as soon as the page is laid out.
- **Drawings inside the page** (the Home hero, which `home.js` fetches in, its dashes, and the Grow world): no copies. `theme-drawings.css` swaps their colours with CSS: one attribute selector per colour (`[fill='#4d5863' i]`; CSS beats an SVG's `fill=""`), plus a light copy of each colour rule in the drawings' own `<style>`. The switch is instant, and `home.js` and `grow.js` keep one drawing. `home.js` measures its phone captions again on `theme.ev` `change`, since it reads one colour from the page.
- **The footer map** is styled by `footer.css` from the tokens, so it follows them.

## Where the light theme departs from the palette, and why

The palette's light values (`docs/palette.md`, light columns) are used as written, except these.

| Token or drawing colour | Palette | Used | Why |
| --- | --- | --- | --- |
| Grounds and cards ("velvet", November 8, 2026) | page `#F2F7FC`, band `#E6ECF2`, card `rgb(255 255 255 / 0.72)`, line 0.12 | page `#E8EFF7`, band `#DCE5EE`, card `#F8FBFF`, line 0.13 | The light page read over-bright, and white boxes on grey had no depth. Now every neutral is navy, a card is the ground lifted, and a soft layered navy shadow with a top highlight (`--shadow-card`) and light from above (`--card-light`) separate cards, as light and glow do in dark. The palette now holds these values (`docs/palette.md` 4.3, 5.1). |
| Marks that carry meaning (the current dot, Grow's steps, the chosen theme, the chosen `/work` filter) | `--c-accent` (`#FFAD51`) | `--c-accent-text` (`#88520A`); Grow's open step `#C37600` | Bright amber on white is under 3:1 (WCAG 1.4.11). Amber can fill; a mark is drawn in amber ink, as the open footer tile already was. |
| Amber buttons' edge | none (transparent) | 1px amber 500 `#C37600` | Bright amber on white had no edge (1.6–1.8:1) and read as a glow; 3.3:1 now. Not in forced colours. |
| Grow's faded "Watch for" row | `opacity: 0.45` | `0.65` | A fade costs more on a light page; 0.65 matches dark (3:1). |
| Home's news cards' border | `--c-cool-surface-2` | `--c-line` | The border was the fill's own colour (1:1). |
| `--c-surface-2` | `rgb(34 46 58 / 0.045)` | `/ 0.06` | Icon tiles on white cards didn't show. |
| `--iso-grid` | `#D2D8DE` | `#C5CCD3` | The footer map's grid vanished on the `#E6ECF2` ground. |
| `--iso-led` | DESIGN-GAP | `#198152` | Online dots need a darker green on a light ground. |
| `--shadow-*` | not covered | navy, about a third as strong | A near-black shadow reads as dirt on white. |
| Office floor (`window` in `gen_office.py`) | `#A1A9B1` | `#DCE2E8` | The office slab uses the window colour; at `#A1A9B1` the hero was a grey block. Windows elsewhere keep `#A1A9B1`. |
| Screens (`screen`, 5.5) | DESIGN-GAP | `#222E3A` | A monitor is dark in a lit room too, so what's drawn on it keeps its dark-mode colours. |
| Amber lines in drawings | `#FFAD51` | `#C37600` | Bright amber lines disappear on white. Amber fills stay `#FFAD51`. |
| Sky lines in drawings | `#97C8EA` | `#1F75A6` (lines), `#4A93C1` (fills), `#005D8A` (words) | Same reason; the palette's light blue box uses these steps. |
| Online and LED dots in drawings | `#A9E9C3` | `#198152` | Same reason. |
| Grow tags | dark label on `--c-alert` / `--c-ok` | white label | Red and green are dark ink steps in light mode; the dark label was 3.2:1 on red. White is 5.6:1 and 9.7:1. |
| Grow steps already built | amber ink at 0.7 opacity | solid | 0.7 took the amber ink under 4.5:1 on the light page. |

## Accessibility

- axe (WCAG 2.2 AA tags), every page, light and dark, at 1440×900 and 390×844: clean, apart from one finding Home has in both themes: Grow's last step fades its "Watch for" row (`opacity: 0.45`) on purpose, as the step moves from risks to fixes.
- Drawing labels on the light page (then `#F2F7FC`; now `#E8EFF7`, about 0.4 lower): link blue `#005D8A` 6.6:1, amber ink `#88520A` 6.0:1, grey sublines `#4D5863` 6.7:1, green `#004F2E` 9.0:1.
- The site check runs on a dark device (`checks/playwright.config.mjs`), the site's own look; its theme test runs axe on every page in light.

## Still open

- The header's wordmark has no light-ground file in this repo (palette 3). The amber mark works on both grounds.
- Fold the departures above into `docs/palette.md` once signed off.
