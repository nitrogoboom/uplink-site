# DESIGN.md: Navy & Amber

A portable colour spec. Hand this file to an agent to recolour a site, a document, a deck, an email or a drawing.

**It changes colour only.** It never changes fonts, type sizes, spacing, layout, corner radius or motion. Those stay whatever the project already uses.

It does not belong to one project. Each project maps its own names onto the roles below. See "Name maps" at the end.

- Version: 1.0 (2026-10-27)
- Colour values: approved by an independent colour-theory and accessibility review. All 12 checks pass. Measured by `palette/final/build.py`.

---

## 1. How an agent uses this file

1. Read the whole file before changing anything.
2. Find the project's existing colour tokens, theme or styles. Map each one to a role in section 5. Write the map down before you edit.
3. Leave every non-colour property alone: fonts, sizes, weights, spacing, layout, radius, motion.
4. Change values through the roles. Never paste a hex into a component when a role exists.
5. Where something has no role, use the nearest neutral role and mark the spot with `DESIGN-GAP: <what was missing>`. Don't invent a colour. List every gap at the end of your report.
6. Run the checks in section 9. Report what passed, what failed and what you couldn't check.
7. Don't commit, publish or deploy unless the person asked you to.

Precedence: the person's own words, then this file, then the project's habits.

---

## 2. Intent

- A competent technology services firm. Calm, clear and reliable.
- Colour personality comes from the illustrations and one warm action colour. Text and grounds stay quiet.
- Rule of thumb: **the art can be colourful; text and controls should be coloured like a bank's.**
- Dark first. Light is a full mode of its own, not an inversion.

---

## 3. Logo

- Two fixed colours: **blue `#1F75A6`** and **crimson `#8D242E`**.
- Wordmark files: white text for dark grounds, near-black `#15181C` text for light grounds. A triangle mark works alone at small sizes.
- **Copy logo files, never retype SVG path data.** If you can't reach the file, stop and say so.
- Never recolour the logo. Don't turn its fills into variables.
- **Crimson lives inside the logo only.** It never appears in UI, text, fills or charts.
- Clear space: 25% of the mark's width on all sides. Below 120px wide, use the mark alone.
- Where the files live is per project. Record the path in the name map.

---

## 4. Colour system

### 4.1 How it is built

- One anchor hue: the logo blue, OKLCH hue 239.4.
- **Neutrals** sit at hue 250, just past the blue. Dark greys read navy, not petrol. Their chroma rises as they get darker.
- **Amber** sits at hue 66, near the blue's exact complement (59). That makes it the strongest figure on a blue ground. It is the only warm colour in the UI.
- **Green** (158) and **red** (29) are for status only.
- All five ramps share one lightness ladder. A given step has the same visual weight in every hue.
- Balance by area: about **60% neutrals, 30% the blue family, 10% or less amber.** Status colours appear only where there is a status.

Ramp lightness (OKLCH L): 50 0.975 · 100 0.94 · 200 0.88 · 300 0.81 · 400 0.73 · 500 0.635 · 600 0.535 · 700 0.455 · 800 0.375 · 900 0.295 · 950 0.215

### 4.2 Ramps

Raw sources. Components use roles (section 5), not ramp steps.

| Step | Neutral | Blue | Amber | Green | Red |
|---|---|---|---|---|---|
| 50 | `#F2F7FC` | `#F0F8FE` | `#FFF5EC` | `#E3FFED` | `#FFF4F2` |
| 100 | `#E6ECF2` | `#D8EFFF` | `#FFE6CF` | `#CCF7DD` | `#FFE4E0` |
| 200 | `#D2D8DE` | `#B7DDF8` | `#FFCD9B` | `#A9E9C3` | `#FFC8C0` |
| 300 | `#BBC2C9` | `#97C8EA` | `#FFAD51` | `#82D6A6` | `#FFA699` |
| 400 | `#A1A9B1` | `#73AFD9` | `#E5922B` | `#5ABF89` | `#EF8677` |
| 500 | `#838C95` | `#4A93C1` | `#C37600` | `#3BA16E` | `#D66254` |
| 600 | `#656E78` | **`#1F75A6`** (logo) | `#9B5D00` | `#198152` | `#B24438` |
| 700 | `#4D5863` | `#005D8A` | `#7C4900` | `#00683F` | `#952E24` ✕ |
| 800 | `#37424E` | `#004669` | `#5E3600` | `#004F2E` | `#781811` ✕ |
| 900 | `#222E3A` | `#00304A` | `#422500` | `#00371F` | `#5B0000` |
| 950 | `#0E1A27` | `#001C2E` | `#281400` | `#002010` | `#390000` |

✕ = too close to the logo crimson. Never give these a role.

---

## 5. Roles

Every colour has one job. If you need a second job, you need a second role.

### 5.1 Grounds, text and lines

| Role | Dark | Light | Job |
|---|---|---|---|
| `page` | `#0E1A27` | `#F2F7FC` | page ground (the 60%) |
| `band` | `#14202D` | `#E6ECF2` | alternate section band |
| `raised` | `#222E3A` | `#FFFFFF` | opaque ground: dialogs, toasts, menus |
| `surface` | `rgb(242 247 252 / 0.05)` | `rgb(255 255 255 / 0.72)` | card and panel fill |
| `surface-hover` | `rgb(242 247 252 / 0.09)` | `rgb(34 46 58 / 0.045)` | hover, selected, icon tile |
| `well` | `rgb(0 0 0 / 0.18)` | `rgb(34 46 58 / 0.05)` | input fill, image well |
| `line` | `rgb(242 247 252 / 0.1)` | `rgb(34 46 58 / 0.12)` | decorative divider, card border |
| `line-strong` | `rgb(242 247 252 / 0.18)` | `rgb(34 46 58 / 0.24)` | soft divider, hover border, link underline |
| `edge` | `rgb(242 247 252 / 0.46)` | `rgb(34 46 58 / 0.58)` | border of anything you can click or type in (3:1) |
| `text` | `#F2F7FC` | `#0E1A27` | body text, headings |
| `text-muted` | `#BBC2C9` | `#4D5863` | secondary text |
| `glass` | `rgb(14 26 39 / 0.88)` | `rgb(242 247 252 / 0.86)` | sticky header |
| `glass-raised` | `rgb(34 46 58 / 0.92)` | `rgb(255 255 255 / 0.92)` | phone bottom bar |
| `backdrop` | `rgb(14 26 39 / 0.62)` | `rgb(34 46 58 / 0.4)` | scrim behind pop-ups |

### 5.2 Action, links and status

| Role | Dark | Light | Job |
|---|---|---|---|
| `action` | `#FFAD51` | `#FFAD51` | amber **fill**: primary button, selected tile |
| `on-action` | `#0E1A27` | `#0E1A27` | label on the amber fill (9.5:1) |
| `action-ink` | `#FFAD51` | `#88520A` | amber as **ink**: amber words, icon strokes, focus outline |
| `action-tint` | `rgb(255 173 81 / 0.14)` | `rgb(255 173 81 / 0.18)` | selected card or chip fill |
| `action-faint` | `rgb(255 173 81 / 0.06)` | `rgb(255 173 81 / 0.08)` | highlighted table column |
| `action-ring` | `rgb(255 173 81 / 0.3)` | `rgb(136 82 10 / 0.3)` | focus halo, always beside a solid `action-ink` outline |
| `on-action-tint` | `rgb(14 26 39 / 0.08)` | `rgb(14 26 39 / 0.16)` | dark chip sitting on the amber fill |
| `link` | `#97C8EA` | `#005D8A` | links and info text (the logo-blue family) |
| `link-tint` | `rgb(151 200 234 / 0.16)` | `rgb(0 93 138 / 0.07)` | info message and chip fill |
| `success` | `#A9E9C3` | `#004F2E` | success / online text and icon |
| `success-tint` | `rgb(169 233 195 / 0.16)` | `rgb(0 79 46 / 0.1)` | success message and chip fill |
| `error` | `#FF897E` | `#B24438` | error text and icon |

### 5.3 Atmosphere (optional)

Use these only where a page has a hero or a lit scene.

| Role | Dark | Light | Job |
|---|---|---|---|
| `glow-warm` | `rgb(255 173 81 / 0.07)` | `rgb(255 173 81 / 0.12)` | warm light behind a main call to action |
| `glow-cool` | `rgb(151 200 234 / 0.09)` | `rgb(0 93 138 / 0.07)` | cool light behind an illustration |
| `glow-cool-2` | `rgb(151 200 234 / 0.11)` | `rgb(0 93 138 / 0.08)` | stronger cool glow (maps, footers) |
| `cool-surface` | `rgb(216 239 255 / 0.05)` | `rgb(216 239 255 / 0.4)` | panel fill inside a cool-lit area |
| `cool-surface-hover` | `rgb(216 239 255 / 0.1)` | `rgb(216 239 255 / 0.7)` | its hover |
| `cool-text-muted` | `#ADC5D6` | `#455A69` | secondary text on cool surfaces |

### 5.4 Illustration (isometric)

Light comes from the top. On every box: **top lightest, left middle, right darkest.** This order holds in both modes and under all three colour-blindness simulations.

| Role | Dark | Light | Job |
|---|---|---|---|
| `box-top` / `box-left` / `box-right` | `#4D5863` / `#37424E` / `#222E3A` | `#FFFFFF` / `#D2D8DE` / `#BBC2C9` | plain box faces |
| `box-edge` | `#E6ECF2` | `#37424E` | face outline, drawn at 0.3 opacity |
| `box-hi-top` / `-left` / `-right` | `#FFCD9B` / `#FFAD51` / `#C37600` | same | amber (highlighted) box |
| `box-hi-edge` | `#FFF5EC` | `#7C4900` | amber box outline |
| `box-blue-top` / `-left` / `-right` | `#B7DDF8` / `#97C8EA` / `#73AFD9` | `#97C8EA` / `#4A93C1` / `#005D8A` | blue box |
| `box-green-top` / `-left` / `-right` | `#82D6A6` / `#3BA16E` / `#198152` | `#82D6A6` / `#3BA16E` / `#00683F` | green box, trees |
| `ground` | `#15212E` | `#E6ECF2` | map platform |
| `grid` | `#2B3743` | `#D2D8DE` | floor grid lines |
| `window` | `#182431` | `#A1A9B1` | unlit window |
| `window-lit` | `#FFF5EC` | `#FFF5EC` | lit window, white LED |
| `shadow` | `#000000` | `#0E1A27` | drop shadow, drawn at 0.35 opacity |

Illustration roles are for drawings only. Never use them for text, even where a value matches a text role.

---

## 6. Colour rules

1. **One amber fill per view.** Amber means "do this". Don't use it for decoration, status or emphasis.
2. **Amber fill vs amber ink.** Bright amber is a fill with a dark label. On a light ground, amber text uses `action-ink` (`#88520A`), never the fill colour.
3. **Links are blue, not amber.** Links in body text are underlined (`line-strong`).
4. **Status is never colour alone.** Every status message carries an icon *and* a word: ✓ "Done", ⓘ "Info", ⚠ "Error". Amber and red, and green and red, merge for some colour-blind readers.
5. **Error text placement.** On `page` and `band`, an error message can be all `error` colour. On cards, dialogs and hover fills, only the word "Error", the icon and a 1px border use `error`. The message itself uses `text`. Error text is 16px or larger, weight 500 or more.
6. **Edges that matter use `edge`.** Inputs, selects and ghost buttons need 3:1. `line` and `line-strong` are decoration only.
7. **Focus** is a 2px solid `action-ink` outline with a 2–3px offset. `action-ring` may sit outside it as a halo, never instead of it.
8. **No crimson**, and no red ramp step 700 or darker, anywhere outside the logo.
9. **No new colours.** No extra tints or "10% variants" beyond the roles above. If you need one, it's a `DESIGN-GAP`.
10. **Headline accent.** One word in a headline may take `action-ink`. One word, no glow, no underline.
11. **Cards.** Border `line`, fill `surface`. No coloured left-edge accents. At most one selected card, shown with `action-tint` plus a label.
12. **Grounds stay calm.** Grounds and text stay under OKLCH chroma 0.04. Saturation belongs to the action, status and illustration roles.

---

## 7. Applying it to other media

**Web.** Put the roles on `:root` (dark), redefine them under `[data-theme="light"]`, and optionally follow `prefers-color-scheme`. Section 8 has a drop-in block.

**Documents (Word, PDF, Google Docs).**
- Keep the document's own fonts and layout. Use light mode: `page` white or `#F2F7FC`, `text` `#0E1A27`, `text-muted` `#4D5863`.
- Links use `#005D8A`, underlined. Accent words use `#88520A`.
- Table header fill: `band` `#E6ECF2`. Rules: `#D2D8DE`.
- Amber fills only for one callout or cover band, with dark text.

**Slides.**
- Dark title and section slides; light content slides.
- One amber element per slide at most.
- Charts use, in order: blue `#1F75A6`, amber `#C37600`, green `#198152`, neutral `#838C95`. Never red as a data series.
- Label series directly, not by colour alone.

**Email.** Light mode only. Inline every colour. Use the white-ground logo. The button is amber `#FFAD51` with a `#0E1A27` label.

**Print.** Light mode. The dark grounds don't print well. Treat CMYK as a `DESIGN-GAP` until a printer proofs it.

**Drawings.** Use section 5.4. Keep the face lighting order: top lightest, left middle, right darkest.

---

## 8. Drop-in CSS (generic role names)

```css
:root {
  color-scheme: dark;
  --page: #0E1A27; --band: #14202D; --raised: #222E3A;
  --surface: rgb(242 247 252 / 0.05); --surface-hover: rgb(242 247 252 / 0.09); --well: rgb(0 0 0 / 0.18);
  --line: rgb(242 247 252 / 0.1); --line-strong: rgb(242 247 252 / 0.18); --edge: rgb(242 247 252 / 0.46);
  --text: #F2F7FC; --text-muted: #BBC2C9;
  --action: #FFAD51; --on-action: #0E1A27; --action-ink: #FFAD51;
  --action-tint: rgb(255 173 81 / 0.14); --action-ring: rgb(255 173 81 / 0.3);
  --link: #97C8EA; --link-tint: rgb(151 200 234 / 0.16);
  --success: #A9E9C3; --success-tint: rgb(169 233 195 / 0.16);
  --error: #FF897E;
  --glass: rgb(14 26 39 / 0.88); --backdrop: rgb(14 26 39 / 0.62);
}
:root[data-theme="light"] {
  color-scheme: light;
  --page: #F2F7FC; --band: #E6ECF2; --raised: #FFFFFF;
  --surface: rgb(255 255 255 / 0.72); --surface-hover: rgb(34 46 58 / 0.045); --well: rgb(34 46 58 / 0.05);
  --line: rgb(34 46 58 / 0.12); --line-strong: rgb(34 46 58 / 0.24); --edge: rgb(34 46 58 / 0.58);
  --text: #0E1A27; --text-muted: #4D5863;
  --action: #FFAD51; --on-action: #0E1A27; --action-ink: #88520A;
  --action-tint: rgb(255 173 81 / 0.18); --action-ring: rgb(136 82 10 / 0.3);
  --link: #005D8A; --link-tint: rgb(0 93 138 / 0.07);
  --success: #004F2E; --success-tint: rgb(0 79 46 / 0.1);
  --error: #B24438;
  --glass: rgb(242 247 252 / 0.86); --backdrop: rgb(34 46 58 / 0.4);
}
body { background: var(--page); color: var(--text); }
:focus-visible { outline: 2px solid var(--action-ink); outline-offset: 3px; }
```

The illustration and atmosphere roles are left out to keep this short. Copy them from section 5 when a project draws.

---

## 9. Checks before you call a recolour done

| # | Check | Pass |
|---|---|---|
| 1 | `text` on every ground | 4.5:1 and APCA Lc 75 |
| 2 | `text-muted`, `link`, `success`, `action-ink` on every ground they use | 4.5:1 and Lc 60 |
| 3 | `error` | 4.5:1 everywhere; placement per rule 6.5 |
| 4 | `on-action` on `action` | 7:1 |
| 5 | `edge` and the focus outline on every ground | 3:1 |
| 6 | Status messages | icon + word on each one |
| 7 | Box faces | top > left > right, both modes |
| 8 | Logo | right file per ground; no crimson elsewhere |
| 9 | Amber | one fill per view |
| 10 | Every colour | traces to a role; every exception marked `DESIGN-GAP` |
| 11 | Non-colour | fonts, sizes, spacing and layout unchanged |
| 12 | Eye check | both modes beside the logo: calm, professional, not a game HUD |

Measure contrast with a script (WCAG 2 ratio and APCA Lc), not by eye.

---

## 10. Name maps

A project lists its own names here so an agent can apply the roles without guessing.

### Uplink / SVS site (`site/assets/css/tokens.css`)

| Role | Site token |
|---|---|
| page / band / raised | `--c-bg` / `--c-bg-band` / `--c-solid` |
| surface / surface-hover / well | `--c-surface` / `--c-surface-2` / `--c-well` |
| line / line-strong / edge | `--c-line` / `--c-line-2` / `--c-edge` (new) |
| text / text-muted | `--c-text` / `--c-muted` |
| action / on-action / action-ink | `--c-accent` / `--c-on-accent` / `--c-accent-text` (new) |
| action-tint / action-faint / action-ring / on-action-tint | `--c-accent-tint` / `--c-accent-faint` / `--c-accent-ring` / `--c-ink-tint` |
| link / link-tint | `--c-sky` / `--c-sky-tint` |
| success / success-tint / error | `--c-ok` / `--c-ok-tint` / `--c-alert` |
| glass / glass-raised / backdrop | `--c-glass` / `--c-glass-2` / `--c-backdrop` |
| glow-warm / glow-cool / glow-cool-2 | `--c-glow-accent` / `--c-glow-sky` / `--c-glow-sky-2` |
| cool-surface / -hover / cool-text-muted | `--c-cool-surface` / `--c-cool-surface-2` / `--c-cool-muted` |
| box-top / left / right / edge | `--iso-top` / `--iso-left` / `--iso-right` / `--iso-edge` |
| box-hi-* | `--iso-hi-top` / `--iso-hi-left` / `--iso-hi-right` / `--iso-hi-edge` |
| box-blue-* | `--iso-sky-top` / `--iso-sky-left` (new) / `--iso-sky-right` |
| box-green-* | `--iso-green-top` / `--iso-green-mid` / `--iso-green-dark` |
| ground / grid / window / window-lit / shadow | `--iso-ground` / `--iso-grid` / `--iso-window` / `--iso-light` / `--iso-shadow` |

Notes for this project:
- Logo files: `Documents/Design.MD/svs-design/assets/logo/` (copy them; don't use the rest of that folder).
- The drawings come from `tools/gen_*.py`, which hard-code hex values. A recolour there means changing the generator numbers and rerunning, not editing SVGs.
- Ready-made values in the site's names: `palette/final/tokens.css`.

### Adding a new project

Copy the table above, swap in the project's names, and record where its logo files live. If a role has no matching name, add one; don't overload an existing name.
