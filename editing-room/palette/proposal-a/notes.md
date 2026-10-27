# Proposal A: logo-locked

Everything is built from one number: the logo blue's OKLCH hue, 239.4.
`build.py` makes every value, writes `tokens.css` and `preview.html`, and prints the numbers below.

## Colour theory

**One key hue.** The logo blue `#1F75A6` sits at OKLCH hue 239.4. The blue ramp and every neutral use that exact hue. Page, text, lines and box faces are all tinted blue-grey from the logo. Nothing drifts to the old indigo navy (hue 259).

**Warm split-complement for action.** The complement of 239.4 is 59.4. Amber sits 15 degrees past it, at 74.4 (blue minus 165). That is a narrow split-complement. It keeps amber the clear opposite of the logo, but on the golden side, away from the logo crimson (hue 20). The old amber was at 68; this moves it 6 degrees toward gold.

**Status hues hang off the same wheel.** Alert is at 29.4, the classic split arm (blue plus 150). It is 45 degrees from amber, so red and amber stay apart. Green is at 149.4, a square (90 degrees) from blue. Info uses the blue itself.

**Same lightness steps in every ramp.** All five ramps (neutral, blue, amber, green, coral) share the same OKLCH L per step: 50 = 0.975 down to 950 = 0.225. So `amber-300` and `blue-300` have the same weight, and swapping a step swaps hue only. Chroma peaks near each ramp's natural home and tapers toward white and black. The blue ramp keeps the exact logo blue at step 600. The dark amber steps turn 10 degrees toward orange so they read as bronze, not olive.

**Neutrals.** Chroma 0.006 + 0.03 x (1 - L): about 0.029 in the page navy, about 0.007 in the near-white. Tinted enough to feel related to the logo, not enough to feel coloured.

**60/30/10.** About 60% navy neutrals (page and bands), 30% surfaces, text and blue (cards, info, the blue boxes), 10% amber (one call to action per view, the selected state, highlighted boxes). Amber is the only warm colour in the chrome.

**Light mode is its own design.** Not an inversion. The page is a cool near-white (`neutral-50`); dialogs are pure white; text is the dark-mode page colour, so both modes share one ink. Amber cannot be text on white, so light `--c-accent` is `amber-700`, a bronze that holds 4.5:1 as text and carries white button labels. Bright amber stays in the light-mode drawings (`--iso-hi-*`) and in tints, so the warmth survives. Light info blue is `blue-700`, one step under the logo blue, because the logo blue itself drops to 4.4:1 on its own tint.

**Roles.** Each token has one job, as in `tokens-current.css`. One addition: `--c-edge`, a form-control and ghost-button edge set to exactly 3:1. `--c-line-2` stays a soft divider.

## Measured

<!-- measured:start -->
Hues: blue 239.4 (logo) | amber 74.4 = blue-165 | alert 29.4 = blue+150 | green 149.4 = blue-90 | neutrals on 239.4.
Light accent = amber-700.

### Core values (hex, then OKLCH L C H)

| role | dark | light |
|---|---|---|
| `bg` | `#0E1E28` (0.23 0.029 237) | `#F3F7FB` (0.97 0.007 248) |
| `bg-band` | `#13222D` (0.24 0.029 241) | `#EAEFF3` (0.95 0.008 242) |
| `solid` | `#1C2E39` (0.29 0.031 236) | `#FFFFFF` (1.00 0.000 90) |
| `text` | `#F3F7FB` (0.97 0.007 248) | `#0E1E28` (0.23 0.029 237) |
| `muted` | `#CBD2D7` (0.86 0.010 239) | `#536069` (0.48 0.022 238) |
| `accent` | `#FBAB18` (0.80 0.165 74) | `#825200` (0.48 0.104 71) |
| `on-accent` | `#0E1E28` (0.23 0.029 237) | `#FFFFFF` (1.00 0.000 90) |
| `sky` | `#8FC5EB` (0.80 0.078 240) | `#006494` (0.48 0.109 240) |
| `ok` | `#A5E9B1` (0.87 0.103 149) | `#025724` (0.40 0.110 150) |
| `alert` | `#FD8C7C` (0.76 0.140 29) | `#B63C2F` (0.53 0.160 29) |

### Text and UI pairs

Translucent tokens are composited over the page colour before measuring. Body text passes at 4.5:1; APCA Lc 75+ is the body-text target, 60-75 is fine for short text and labels. UI rows need 3:1.

| fg | on | use | dark ratio | dark Lc | light ratio | light Lc | dark | light |
|---|---|---|---:|---:|---:|---:|---|---|
| `text` | `bg` | body | 15.80 | -101 | 15.80 | 99 | ok | ok |
| `text` | `bg-band` | body | 15.07 | -100 | 14.69 | 94 | ok | ok |
| `text` | `solid` | body | 13.01 | -98 | 17.00 | 104 | ok | ok |
| `text` | `surface` | body | 13.85 | -99 | 16.73 | 103 | ok | ok |
| `text` | `surface-2` | body | 12.24 | -97 | 14.29 | 92 | ok | ok |
| `text` | `glass` | body | 15.80 | -101 | 15.80 | 99 | ok | ok |
| `muted` | `bg` | body | 11.12 | -77 | 6.01 | 77 | ok | ok |
| `muted` | `bg-band` | body | 10.61 | -76 | 5.59 | 72 | ok | ok (Lc 60-75: short text) |
| `muted` | `solid` | body | 9.16 | -74 | 6.47 | 82 | ok (Lc 60-75: short text) | ok |
| `muted` | `surface` | body | 9.75 | -75 | 6.37 | 81 | ok | ok |
| `muted` | `surface-2` | body | 8.62 | -73 | 5.44 | 70 | ok (Lc 60-75: short text) | ok (Lc 60-75: short text) |
| `cool-muted` | `bg` | body | 9.14 | -66 | 6.03 | 77 | ok (Lc 60-75: short text) | ok |
| `cool-muted` | `cool-surface-2` | body | 7.01 | -62 | 5.46 | 70 | ok (Lc 60-75: short text) | ok (Lc 60-75: short text) |
| `accent` | `bg` | body | 8.86 | -64 | 6.18 | 77 | ok (Lc 60-75: short text) | ok |
| `accent` | `surface` | body | 7.77 | -63 | 6.55 | 81 | ok (Lc 60-75: short text) | ok |
| `accent` | `accent-tint` | body | 7.14 | -62 | 5.49 | 70 | ok (Lc 60-75: short text) | ok (Lc 60-75: short text) |
| `on-accent` | `accent` | body | 8.86 | 65 | 6.65 | -88 | ok (Lc 60-75: short text) | ok |
| `sky` | `bg` | body | 9.19 | -66 | 6.00 | 76 | ok (Lc 60-75: short text) | ok |
| `sky` | `surface` | body | 8.06 | -64 | 6.36 | 80 | ok (Lc 60-75: short text) | ok |
| `sky` | `sky-tint` | body | 6.50 | -61 | 5.43 | 70 | ok (Lc 60-75: short text) | ok (Lc 60-75: short text) |
| `ok` | `bg` | body | 12.06 | -82 | 8.16 | 84 | ok | ok |
| `ok` | `ok-tint` | body | 8.09 | -76 | 6.94 | 74 | ok | ok (Lc 60-75: short text) |
| `alert` | `bg` | body | 7.46 | -56 | 5.31 | 72 | wcag ok, Lc<60 | ok (Lc 60-75: short text) |
| `alert` | `bg-band` | body | 7.12 | -55 | 4.93 | 68 | wcag ok, Lc<60 | ok (Lc 60-75: short text) |
| `alert` | `surface` | body | 6.54 | -54 | 5.62 | 76 | wcag ok, Lc<60 | ok |
| `ok` | `bg-band` | body | 11.50 | -81 | 7.59 | 80 | ok | ok |
| `sky` | `bg-band` | body | 8.77 | -66 | 5.58 | 72 | ok (Lc 60-75: short text) | ok (Lc 60-75: short text) |
| `accent` | `bg-band` | body | 8.45 | -64 | 5.75 | 73 | ok (Lc 60-75: short text) | ok (Lc 60-75: short text) |
| `muted` | `glass` | body | 11.12 | -77 | 6.01 | 77 | ok | ok |
| `accent` | `bg` | ui | 8.86 | -64 | 6.18 | 77 | ok | ok |
| `accent` | `solid` | ui | 7.30 | -62 | 6.65 | 83 | ok | ok |
| `sky` | `bg` | ui | 9.19 | -66 | 6.00 | 76 | ok | ok |
| `line-2` | `bg` | ui | 1.75 | -8 | 1.64 | 27 | FAIL | FAIL |
| `edge` | `bg` | ui | 3.07 | -22 | 3.06 | 55 | ok | ok |
| `edge` | `surface` | ui | 3.03 | -24 | 3.14 | 58 | ok | ok |
| `accent-ring` | `bg` | ui | 2.15 | -13 | 1.72 | 30 | FAIL | FAIL |

Worst body pair: alert on bg-band (light) at 4.93:1.

### Logo on the page

| logo part | dark bg ratio | light bg ratio |
|---|---:|---:|
| wordmark | 17.00 | 16.54 |
| blue | 3.36 | 4.70 |
| crimson | 1.96 | 8.05 |

### Colour-vision simulation (Machado 2009, full severity)

dE is OKLab distance x100 between the two closest status colours. Under 10 reads as "same colour at a glance".

| mode | vision | accent | sky | ok | alert | closest pair | dE |
|---|---|---|---|---|---|---|---:|
| dark | normal | `#FBAB18` | `#8FC5EB` | `#A5E9B1` | `#FD8C7C` | accent/alert | 12.6 |
| dark | protan | `#C7B000` | `#B5C4ED` | `#EADEAE` | `#A79D7A` | accent/alert | 12.2 |
| dark | deutan | `#DAC321` | `#A8BAEA` | `#DFD6B4` | `#C2B57A` | accent/alert | 9.3 |
| dark | tritan | `#FF9692` | `#6DCFD1` | `#9CE6DA` | `#FF7B88` | accent/alert | 5.7 |
| light | normal | `#825200` | `#006494` | `#025724` | `#B63C2F` | accent/alert | 11.8 |
| light | protan | `#625500` | `#4D6596` | `#584E1F` | `#5E552D` | ok/alert | 2.6 |
| light | deutan | `#6E6103` | `#3A5993` | `#4F4828` | `#7D702B` | accent/alert | 5.4 |
| light | tritan | `#8F4645` | `#007075` | `#00554B` | `#C8193A` | sky/ok | 9.7 |

Flags: dark deutan: accent vs alert dE 9.3; dark tritan: accent vs alert dE 5.7; light protan: ok vs alert dE 2.6; light deutan: accent vs alert dE 5.4; light tritan: sky vs ok dE 9.7

### Isometric light order

| mode | set | top L | left L | right L | order holds (all CVD) |
|---|---|---:|---:|---:|---|
| dark | box | 0.47 | 0.39 | 0.33 | yes |
| dark | amber | 0.87 | 0.72 | 0.64 | yes |
| dark | blue | 0.87 | 0.80 | 0.64 | yes |
| dark | green | 0.87 | 0.64 | 0.56 | yes |
| light | box | 1.00 | 0.90 | 0.83 | yes |
| light | amber | 0.87 | 0.80 | 0.72 | yes |
| light | blue | 0.64 | 0.48 | 0.40 | yes |
| light | green | 0.80 | 0.64 | 0.56 | yes |
<!-- measured:end -->

## CVD findings

- Machado 2009 matrices at full severity, applied in linear sRGB. OKLab distance x100 between status colours.
- Dark mode holds up well. Status colours are spaced by lightness on purpose: ok is lightest (0.87), accent and sky at 0.80, alert at 0.76. Red/green stays apart under deutan and protan because of that.
- Dark tritan: amber and alert both turn pink (dE about 6). Dark deutan: amber and alert are close (dE about 9).
- Light mode is the hard case. All text colours must sit between L 0.40 and 0.55 to pass 4.5:1, so there is little lightness left to separate them. Under protan, ok and alert collapse (dE about 3). Under deutan, accent and alert are close (dE about 5). Under tritan, sky and ok are near the limit (dE about 10).
- Rule that fixes it: status never relies on colour. Info, ok and alert always carry an icon shape (circle-i, check, triangle) and a word ("Error:"). Alert also gets a coloured border. The preview shows this.
- Isometric faces keep top > left > right lightness under all four vision types, in both modes.

## Known weaknesses

- Light `--c-accent` is bronze, not bright amber. One token cannot be both a bright fill and readable text on white. If the site later splits it into `--c-accent` (fill, `amber-300` with dark text) and an accent-text token (`amber-700`), light mode gets its Overwatch amber buttons back.
- Dark muted, accent, sky and alert text sit at APCA Lc 55-70. Fine for labels, chips and short lines. Long body copy should use `--c-text`.
- Dark alert is the lowest at Lc about 55. Lifting it closes the gap to amber for CVD users, so I kept it here.
- `--c-line-2` and `--c-accent-ring` are under 3:1. They are decorative. Inputs and ghost buttons should use the new `--c-edge`, and focus must use a solid `--c-accent` outline (passes in both modes).
- Light accent (bronze) and light alert (brick red) are only 12 apart for normal vision. Never put them side by side without the icon.
- The new dark page navy (hue 239) is a little greener than today's (hue 259). That is the point of this direction, but it is a visible change.
- `--iso-top` in light mode is pure white, same as `--c-solid`. A box on a white dialog would lose its top face; draw on the page or band colour.
