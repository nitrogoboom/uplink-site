# Proposal B: evolve Uplink

The current look stays. Only hue moves, and only where the blues fought the logo. Run `python build.py` to regenerate `tokens.css` and `preview.html` and print the numbers below.

## Colour theory

**The problem.** The logo blue `#1F75A6` sits at OKLCH hue 239. The site's navy sits at 259 and leans violet. The sky sits at 243. Side by side, the logo looked like a guest on the page.

**Change 1: neutrals move from hue 259 to 247.** Lightness and chroma stay exactly as they are. Only hue moves. At chroma 0.03, 12 degrees reads as "same navy, less purple". Going all the way to 239 tips the navy into petrol (`#10202A`). 247 is the smallest move that puts every neutral within 8 degrees of the logo. That is my test for "same family" at low chroma. `--c-text` does not change in practice (`#F1F4F8` is near white).

**Change 2: chromatic blues snap to the logo hue, 239.** Sky, the blue box faces and the hero's cool light. At high chroma, a few degrees of hue show more than they do in the navy. Sky becomes step 400 of a ramp built on the logo blue. Its lightness (0.763) does not change.

**What does not change in dark mode.** Amber `#F4A340` (hue 68). It sits 9 degrees from the exact complement of the logo blue (59). That is a near-complement: warm against cool, with a slight yellow lean that keeps it amber, not orange. Moving it would cost recognition and buy nothing measurable. Green and coral status colours, all amber and green box faces, the warm window light and all alpha values stay.

**Ramps.** Five ramps, 11 steps, one lightness scale (L .97 to .233). Step 400 is the current sky lightness. Step 950 is the current page lightness. Chroma peaks at the anchor and tapers both ways, so pale steps never go neon and dark steps never go muddy. The amber ramp drifts from hue 72 (light) to 56 (dark). Real amber pigments do this, and it lands the dark steps on the blue's exact complement. Crimson gets no ramp: it has no UI job.

**Balance (60/30/10).** About 60% navy neutrals, 30% text and surfaces, 10% signal. Amber is the only call to action. Blue is info and the illustrations' cool light. Green and coral are status only.

**Light mode, designed on its own.** Page `#F6F9FC`, band `#ECF2F7`, dialogs pure white. All tinted to hue 247. Text `#131D26` sits beside the wordmark ink `#15181C`. Amber at its dark-mode lightness cannot be text on a light page (about 2:1). The one `--c-accent` token is both link text (17 uses in `src/`) and button fill (19 uses). So light accent is a deep amber, `#A65800`. The script solves it as the lightest amber that passes 4.5:1 both as text and under white button text. Light sky is the logo blue, deepened from L .537 to .505 so it still passes on tinted chips. Light green and red are darker text-grade steps. Iso boxes go pale with dark edges: top lightest, left mid, right darkest, as in dark mode.

## Roles

| Token | Job |
|---|---|
| bg, bg-band, solid | page, alternate band, dialogs |
| surface, surface-2, well | cards, hover/selected, inputs |
| line, line-2 | dividers, control edges |
| text, muted, cool-muted | body, secondary, secondary in the hero |
| accent / on-accent | the one call to action, links, focus |
| sky | info, the cool light, blue box left face |
| ok | online, success |
| alert | errors |
| iso-* | drawing faces only |
| logo blue, logo crimson | logo only |

## Measurements

WCAG 2 ratio. APCA Lc (APCA-W3 0.0.98G; negative means light text on dark). Alpha tokens are composited over the page, or over the band where noted. Targets: 4.5:1 for text, 3:1 for icons, edges and focus.

## Contrast: text on background (both modes)

| Text | On | Use | Dark WCAG | Dark Lc | Light WCAG | Light Lc |
|---|---|---|---|---|---|---|
| text | bg | body | 15.15 | -99 | 16.14 | 100 |
| text | bg-band | body | 14.49 | -98 | 15.11 | 96 |
| text | solid | body | 12.59 | -96 | 17.05 | 104 |
| text | surface | body | 13.22 | -97 | 16.88 | 103 |
| text | surface-2 | body | 11.68 | -95 | 14.49 | 93 |
| text | cool-surface | body | 13.45 | -97 | 15.52 | 97 |
| text | glass | nav | 15.15 | -99 | 16.14 | 100 |
| muted | bg | body | 7.98 | -59 | 6.30 | 79 |
| muted | bg-band | body | 7.63 | -59 | 5.90 | 75 |
| muted | solid | body | 6.63 | -57 | 6.66 | 83 |
| muted | surface | body | 6.97 | -58 | 6.59 | 82 |
| muted | surface-2 | body | 6.16 | -56 | 5.66 | 72 |
| muted | surface on bg-band | body | 6.62 | -57 | 6.48 | 81 |
| cool-muted | bg | body | 8.36 | -62 | 6.28 | 79 |
| cool-muted | cool-surface | body | 7.42 | -60 | 6.04 | 76 |
| accent | bg | body | 8.08 | -60 | 4.95 | 72 |
| accent | bg-band | body | 7.73 | -60 | 4.63 | 67 |
| accent | surface | body | 7.06 | -59 | 5.17 | 75 |
| accent | accent-tint | body | 6.52 | -57 | 4.51 | 65 |
| on-accent | accent | button | 7.74 | 61 | 5.23 | -81 |
| sky | bg | body | 7.99 | -60 | 5.45 | 74 |
| sky | surface | body | 6.97 | -58 | 5.70 | 78 |
| sky | bg-band | body | 7.64 | -59 | 5.10 | 70 |
| sky | sky-tint | chip | 5.79 | -55 | 4.94 | 68 |
| sky | sky-tint on bg-band | chip | 5.54 | -54 | 4.66 | 64 |
| ok | bg-band | body | 8.75 | -66 | 5.03 | 70 |
| ok | bg | body | 9.15 | -67 | 5.37 | 74 |
| ok | surface | body | 7.99 | -65 | 5.62 | 77 |
| ok | ok-tint | chip | 6.46 | -61 | 4.81 | 67 |
| alert | bg | body | 6.81 | -52 | 5.71 | 75 |
| alert | surface | body | 5.95 | -50 | 5.97 | 78 |

Worst text pairs: light --c-accent on --c-accent-tint 4.51; light --c-accent on --c-bg-band 4.63; light --c-sky on --c-sky-tint over --c-bg-band 4.66; light --c-ok on --c-ok-tint 4.81

## Contrast: non-text (needs 3:1)

| Colour | On | Use | Dark | Light |
|---|---|---|---|---|
| accent | bg | focus ring, ghost button edge | 8.08 | 4.95 |
| accent | surface | focus ring on card | 7.06 | 5.17 |
| sky | bg | info icon, stroke | 7.99 | 5.45 |
| ok | bg | online dot | 9.15 | 5.37 |
| alert | bg | error edge | 6.81 | 5.71 |
| line-2 | bg | input / ghost edge | 1.77 | 1.58 |
| logo blue mark | bg | logo | 3.31 | 4.79 |
| logo crimson mark | bg | logo | 1.93 | 8.20 |

## CVD findings

Machado 2009 matrices at full severity. Distance is OKLab x100. Bold means under 8, where hue alone is not enough.


| Pair | Mode | Normal | Protan | Deutan | Tritan |
|---|---|---|---|---|---|
| c-ok / c-alert | dark | 23 | 14 | **6** | 28 |
| c-ok / c-alert | light | 25 | 10 | **7** | 30 |
| c-ok / c-accent | dark | 19 | 12 | 11 | 25 |
| c-ok / c-accent | light | 19 | **6** | 10 | 24 |
| c-alert / c-accent | dark | 10 | 10 | 8 | **4** |
| c-alert / c-accent | light | 9 | **8** | **3** | **7** |
| c-sky / c-ok | dark | 14 | 13 | 11 | **4** |
| c-sky / c-ok | light | 14 | 13 | 13 | **3** |
| c-sky / c-accent | dark | 23 | 21 | 22 | 23 |
| c-sky / c-accent | light | 24 | 19 | 22 | 24 |
| c-sky / c-alert | dark | 20 | 15 | 15 | 26 |
| c-sky / c-alert | light | 27 | 17 | 19 | 30 |
| iso-hi-left / iso-green-mid | dark | 20 | 9 | 15 | 26 |
| iso-hi-left / iso-green-mid | light | 20 | 9 | 15 | 26 |
| iso-green-mid / c-sky | dark | 17 | 17 | 16 | 13 |
| iso-green-mid / c-sky | light | 18 | 17 | 19 | 11 |

## Iso face order (OKLCH L; top > left > right)

| Box | Dark top/left/right | Light top/left/right | Box top vs page (light) |
|---|---|---|---|
| box | 0.43/0.36/0.32 | 0.95/0.86/0.78 | 1.08 |
| amber | 0.82/0.73/0.66 | 0.82/0.73/0.66 | 1.65 |
| blue | 0.82/0.76/0.67 | 0.82/0.51/0.40 | 1.64 |
| green | 0.84/0.63/0.54 | 0.84/0.63/0.54 | 1.47 |

## What moved (dark mode, old -> new, OKLCH hue)

- --c-bg: #151E2C (h259) -> #121F2B (h247)
- --c-bg-band: #18222F (h255) -> #16232E (h245)
- --c-solid: #212D40 (h259) -> #1C2E3F (h248)
- --c-muted: #A9B4C3 (h256) -> #A7B5C2 (h246)
- --c-on-accent: #1B2130 (h267) -> #15232F (h245)
- --c-sky: #7DB9E8 (h243) -> #80BAE2 (h239)
- --c-cool-muted: #ABB8CA (h257) -> #A7BAC8 (h240)
- --iso-top: #405169 (h257) -> #3B5368 (h246)
- --iso-left: #313F54 (h258) -> #2C4053 (h248)
- --iso-right: #283447 (h259) -> #233546 (h248)
- --iso-edge: #D9E4F0 (h250) -> #D8E4F0 (h248)
- --iso-sky-top: #9CCBF0 (h242) -> #9ACCEF (h239)
- --iso-sky-right: #5E9BCB (h244) -> #599CC9 (h240)
- --iso-ground: #1B2534 (h258) -> #182633 (h247)
- --iso-grid: #2C3849 (h257) -> #293948 (h247)
- --iso-window: #1E2938 (h256) -> #1B2A37 (h245)

## Ramps

- blue: 50:#ECF7FF 100:#D2ECFF 200:#B4DEFC 300:#99CBEF 400:#80BAE2 500:#549AC8 600:#1F75A6 700:#036493 800:#004D73 900:#003450 950:#002034
- amber: 50:#FFF3E5 100:#FFE3C3 200:#FFCD97 300:#FFB25A 400:#F4A340 500:#CD7C19 600:#A86000 700:#8A4C00 800:#6C3900 900:#4C2500 950:#311500
- green: 50:#DDFFEB 100:#BDF8D7 200:#9EECC1 300:#6FD3A0 400:#66C997 500:#46A879 600:#27885D 700:#076F48 800:#005636 900:#003B23 950:#002514
- coral: 50:#FFF2EF 100:#FFE0DA 200:#FFC8C0 300:#FFAB9E 400:#EE8A7C 500:#D37366 600:#AF564B 700:#934137 800:#772C24 900:#58150F 950:#3F0101
- neutral: 50:#F2F6F9 100:#E4E8ED 200:#D3D8DD 300:#BFC5CB 400:#ACB3B9 500:#8B939B 600:#6C767F 700:#545F69 800:#3D4954 900:#25323E 950:#111F2B

Light accent: #A65800 L/C/H ['0.542', '0.130', '57.564']

## Known weaknesses

- **Light accent is burnt orange, not amber.** One token does both text and fill, so the fill must be dark enough for white text. A split (a bright amber fill with dark text, and a deep amber for text) would look better, but needs a new token name.
- **Status colours collapse for some readers.** ok/alert under deutan (6 dark, 7 light). Accent/alert under deutan in light mode (3) and tritan in dark (4). Sky/ok under tritan (3 to 4). Most of this is inherited from today's palette. The fix is shape and words, not hue: every status message carries an icon (i, check, !) and a plain label. Never show status by colour alone.
- **`--c-line-2` is 1.8:1 (dark) and 1.6:1 (light).** It fails 3:1 as an input edge. Today's site has the same gap. Inputs are still found by their well fill and label, but WCAG 1.4.11 wants a 3:1 edge on inputs.
- **Dark muted text is APCA Lc 56 to 59.** WCAG passes (6.2 to 8.0). APCA wants 60 for body text. It is the same as today; use muted at 16px and up.
- **Logo crimson on the dark page is 1.9:1.** It is fixed. The white wordmark carries the logo on dark.
- **Light chips sit near the floor.** accent on accent-tint 4.51, sky on sky-tint over the band 4.66. Don't raise those tint alphas.
- **Light box tops nearly match the page (1.08:1).** The dark edge lines and the ground plate carry the shape. Drawings must keep their edges in light mode.
- **Drawing scripts hard-code hex today** (`tools/gen_*.py`). The new iso values only land when those scripts read the tokens.
