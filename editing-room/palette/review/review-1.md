# Palette review 1

Reviewer: independent colour and accessibility review. I re-measured everything with my own code.

- `review/measure.py` reads each `tokens.css`. It prints WCAG 2 ratios, APCA Lc (0.0.98G-4g), OKLCH, Machado 2009 CVD at full severity (OKLab dE x100), isometric face order and logo contrast. Full output: `review/measure-out.txt`.
- `review/candidates.py` tests the merge values below. Output: `review/candidates-out.txt`.
- Pairs come from how `src/` uses the tokens today. Translucent tokens are composited over the page. Edges are composited over the surface they sit on.

Where my numbers differ from the designers': A's `--c-edge` fails on dialogs (2.96:1 dark, on `--c-solid`). A did not test that ground. Everything else matched within 0.05.

## Scores

### A, logo-locked: 7/10

Good:
- Cleanest theory. One hue (239.4) drives everything. Shared lightness ladder across ramps.
- Brightest dark muted text (Lc 73-77). Best secondary-text reading of the three.
- Adds `--c-edge` for 3:1 control edges and keeps `--c-line-2` soft. That is the right split.
- Honest CVD write-up. Status needs an icon and a word, not hue alone.

Problems:
- The page navy at hue 237 leans petrol next to the logo. Today's site is 259. C's 251 reads as navy and still sits in the logo family.
- Dark accent `#FBAB18` has chroma 0.165 at hue 74. It reads as caution-tape gold, more game than firm.
- Light accent `#825200` is brown-olive. Light-mode buttons lose all warmth.
- Light protan: ok and alert collapse (dE 2.7). Light deutan: accent and alert collapse (dE 5.5).
- `--c-edge` is 2.96:1 on `--c-solid`, so inputs in dialogs fail.
- Dark alert Lc is only 52-56.

### B, minimal change: 5/10

Good:
- Lowest risk. Hue fixes are well argued (neutrals 259 to 247, blues snapped to 239).
- Keeps today's amber `#F4A340`. That is the closest to the Overwatch warmth.

Problems:
- Dark muted is Lc 56-59 on every ground. That is under 60 for the most-used text colour (34 uses).
- Dark sky, accent and alert sit at Lc 48-60. A lot of small text is borderline.
- No 3:1 control edge at all. `--c-line-2` is 1.6-1.8:1 in both modes. Input borders fail.
- Light accent `#A65800` sits at hue 58. It is 9.1 dE from the alert red for normal vision.
- Light accent text fails 4.5:1 on `--c-surface-2` (4.45).
- Light iso faces reuse the dark amber and green values. The light box top is 3.0 dE from the ground, so boxes melt into the floor.
- Light iso blue box: top-to-left step is 0.31 L, then 0.11. The light is uneven.

### C, professional-first: 7.5/10

Good:
- Best navy. Neutrals at hue 251, chroma rising as lightness falls. Professional and still in the logo family.
- Best dark contrast overall: text 16.3:1, muted Lc 65-68, alert Lc 62-66.
- Darkest page, so the logo blue gets its best ratio (3.47:1 dark).
- Shared lightness ladder. Clear primary-button study. Every token has a comment with its job.
- Only proposal where control edges pass 3:1 in both modes.

Problems:
- `--c-line-2` is pushed to 3:1, but it has other jobs: secondary-button hover fill, link underline, card hover border. Those become heavy mid-grey. One token, too many jobs.
- Dark accent `#FFAD51` and dark alert `#FFA699` are both L 0.81. They are 8.7 dE apart for normal vision and 1.3 under tritan. Errors look like highlights.
- Light `--c-accent` does two jobs (fill and text). It fails 4.5:1 on `--c-bg-band` (4.46). The light button is burnt orange, not amber.
- Light iso blue right face `#00304A` is near-black (steps 0.27 then 0.16). Light green steps are 0.09 then 0.18. The lighting is uneven.
- `--c-sky` is also the blue box left face. In light mode that ties a drawing face to the link colour.

## Decision

Base: **C**. Take the token split idea from A and the warmth argument from B.

## Merge spec

Values are hex. "C" means keep proposal C's value. Ramps: keep C's ramps unchanged.

### Changed or new tokens

| Token | Dark | Light | Why |
|---|---|---|---|
| `--c-accent` | C `#FFAD51` | `#FFAD51` (amber-300) | Fill only: buttons, selected tiles, highlights. Same bright amber in both modes keeps the Overwatch call to action. |
| `--c-on-accent` | C `#0E1A27` | `#0E1A27` | Dark label on amber in both modes. 9.49:1, Lc 68. |
| `--c-accent-text` **(new)** | `#FFAD51` (= accent) | `#88520A` (L 0.49 C 0.105 h 66) | Amber as ink: link-style text, icon strokes, focus outline, focused input border. Light: 5.98 bg, 5.42 band, 5.52 surface-2, 6.45 solid. |
| `--c-edge` **(new)** | `rgb(242 247 253 / 0.46)` | `rgb(34 46 58 / 0.58)` | Input, select and ghost-button borders. C's numbers, A's token. Dark 3.97 on solid, light 3.48 on band. |
| `--c-line-2` | `rgb(242 247 253 / 0.18)` | `rgb(34 46 58 / 0.24)` | Back to a soft divider and hover border. It is also a hover fill and link underline, so it must stay light. |
| `--c-alert` | `#FA887D` (L 0.75 C 0.14 h 27) | C `#B24438` | Dark: pulls error away from amber. dE vs accent 11.4 normal, 7.3 tritan (C had 8.7 and 1.3). Lc 55 on bg: error text must be 16px or larger, weight 500+, with an icon. |
| `--c-accent-tint` | C | `rgb(255 173 81 / 0.18)` | Selected tile in light. `--c-accent-text` on it is 5.18:1. |
| `--c-accent-faint` | C | `rgb(255 173 81 / 0.08)` | Highlighted table column. |
| `--c-accent-ring` | C | `rgb(136 82 10 / 0.30)` | Decorative halo only. Always paired with a solid `--c-accent-text` border or outline. |
| `--c-ink-tint` | C | `rgb(14 26 39 / 0.16)` | Dark chip on the amber fill, both modes now have a dark label. |
| `--c-glow-accent` | C | `rgb(255 173 81 / 0.12)` | Warm key light uses the fill amber, not the brown. |
| `--iso-sky-left` **(new)** | `#97C8EA` | `#4A93C1` (blue-500) | Blue box left face. Frees `--c-sky` from drawing duty. |
| `--iso-sky-top` | C `#B7DDF8` | `#97C8EA` (blue-300) | Light blue box: L 0.81 / 0.64 / 0.46. Even steps. |
| `--iso-sky-right` | C `#73AFD9` | `#005D8A` (blue-700) | As above. Replaces near-black `#00304A`. |
| `--iso-green-top` | C | `#82D6A6` (green-300) | Light green: L 0.81 / 0.64 / 0.46. Even steps. |
| `--iso-green-mid` | C | `#3BA16E` (green-500) | As above. |
| `--iso-green-dark` | C | `#00683F` (green-700) | As above. |

### Kept from C unchanged

`--c-bg`, `--c-bg-band`, `--c-solid`, `--c-surface`, `--c-surface-2`, `--c-well`, `--c-line`, `--c-text`, `--c-muted`, `--c-cool-muted`, `--c-sky`, `--c-ok`, `--c-sky-tint`, `--c-ok-tint`, `--c-glass`, `--c-glass-2`, `--c-backdrop`, `--c-glow-sky`, `--c-glow-sky-2`, `--c-cool-surface`, `--c-cool-surface-2`, all other `--iso-*`, `--logo-blue`, `--logo-crimson`.

### Rules that go with the tokens

- `src/` must switch these uses to the new tokens when the palette lands: `color: var(--c-accent)` and `stroke: var(--c-accent)` become `--c-accent-text`; `.input:focus` border and the 2px focus outline become `--c-accent-text`; input and ghost-button borders become `--c-edge`; the footer map's `.f-l` face becomes `--iso-sky-left`. That is a `src/` job, not part of this folder.
- Status is never colour alone. Info, ok and alert each carry an icon shape and a word. Light deutan accent-text vs alert stays near dE 4; no palette fixes that at text lightness.
- One amber fill per view.
- Crimson stays inside the logo file. Alert red is 10.5 dE from crimson in light mode; never place an alert banner touching the logo.
- Light-mode drawings always draw `--iso-edge` at 0.3. The white box top is only 6.1 dE from the ground without it.

## Acceptance criteria for the final

I sign off when `python review/measure.py final` (pointed at the merged `tokens.css`) shows all of these, in both modes:

1. Every `--c-*` and `--iso-*` name in `inputs/tokens-current.css` has a dark and a light value. New names are only `--c-accent-text`, `--c-edge`, `--iso-sky-left`.
2. `--c-text` on every ground: 4.5:1 or more and |Lc| 75 or more.
3. `--c-muted`, `--c-cool-muted`, `--c-accent-text`, `--c-sky`, `--c-ok`: 4.5:1 or more and |Lc| 60 or more on bg, band, solid, surface, surface-2 and their own tint.
4. `--c-alert`: 4.5:1 on every ground; |Lc| 55 or more dark, 65 or more light.
5. `--c-on-accent` on `--c-accent`: 7:1 or more, both modes.
6. `--c-edge` and the focus colour: 3:1 or more on bg, band, surface and solid.
7. CVD, normal vision: every status pair 10 dE or more. Dark accent vs alert: 7 or more under every simulation. Any pair under 5 is listed in the notes with its icon-and-word fix.
8. Isometric: top > left > right in OKLab L for box, amber, blue and green, in both modes and under all three CVD types. Adjacent face steps between 0.06 and 0.20 L. Right face 5 dE or more from the ground.
9. Logo: blue 3:1 or more on the dark page, 4.5:1 or more on the light page. No crimson-hue token outside `--logo-crimson`.
10. Hues: neutrals 245-252, every blue within 2 degrees of 239, amber 64-70, no UI token within 15 degrees and 10 dE of crimson.
11. One job per token: no token value is used both as a drawing face and as text.
12. Eye check: light and dark previews side by side with the logo. The amber button looks the same in both modes. Nothing reads as a game HUD.
