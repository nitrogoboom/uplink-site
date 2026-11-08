# Light theme for Home (test): November 8, 2026

A light version of Home, to judge the palette's light mode before it becomes a Settings option. It's a copy at `/light`. Home itself (`/`) and every other page are unchanged.

## What you see

- **Address:** `/light` on any build (`npm run build && npm run serve`, then open `http://localhost:8787/light`). It's `noindex`, has no canonical, and isn't in the sitemap or the Markdown copies, like `/soon`.
- **Sections:** the same five as Home, from the same components. Each takes `light`, which swaps its drawings for their light copies. Words and layout are Home's.
- **Header, footer, dialogs:** the shared ones, coloured by the light tokens.

## How it's built

| Part | File | What it does |
| --- | --- | --- |
| Page | `src/pages/light.astro` | Home's sections with `light`, `<Base theme="light">`, and the light preloads. |
| Tokens | `src/styles/theme-light.css` | The palette's light column (`docs/palette.md` 5.1 to 5.4) on the site's token names, under `:root[data-theme='light']`, screen only. |
| Drawings | `tools/gen_light.py` | Writes `NAME-light.svg` beside each dark drawing Home shows (16 files), by swapping colours by role. |
| Hero cuts | `HERO_LIGHT` in `src/lib/site.ts` | The light hero addresses, with the same `?v=` hashes as the dark ones. |
| CSP | `scripts/headers.mjs` | Also hashes the `<style>` blocks of the drawings `light.html` inserts. |

The dark drawings stay the source. A change to a `gen_*.py` reaches the light copies when `gen_light.py` runs, and `tools/regen.py` runs it last.

## Where the palette changed, and why

The palette's light values are used as written, except these. Each is a judgement made on Home, not a palette change yet.

| Token or drawing colour | Palette | Used | Why |
| --- | --- | --- | --- |
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

Checked with axe (WCAG 2.2 AA tags) at 1440×900 and 390×844, after scrolling the whole page:

- `/light` has one finding, the same one `/` has: the faded "Watch for" row in Grow's last step (`opacity: 0.45`, on purpose, as the step moves from risks to fixes).
- Drawing labels, measured by hand against the light page `#F2F7FC`: link blue `#005D8A` 6.6:1, amber ink `#88520A` 6.0:1, grey sublines `#4D5863` 6.7:1, green `#004F2E` 9.0:1.

## To decide

- Make it a real option: move the tokens into Settings (light/dark), follow `prefers-color-scheme`, and give every page light drawings (the other pages' drawings aren't converted yet).
- Fold the changes above back into `docs/palette.md` if they hold up.
- The logo in the header is the amber tile and dark wordmark; the palette's light wordmark file isn't in this repo.
