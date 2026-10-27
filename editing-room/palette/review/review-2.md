# Palette review 2: final sign-off

## Verdict: APPROVED

There are two conditions, both rules for `src/`. Neither needs a token change. See "Conditions" below.

## How I checked

- I updated `review/measure.py` so the blue box left face uses `--iso-sky-left` when that token exists. Before, it always used `--c-sky`. The CVD set now includes `--c-accent-text`.
- I ran `python review/measure.py final`. Output: `review/measure-final.txt`.
- I checked token names against `inputs/tokens-current.css`.
- I looked at `final/preview.html` in both modes. The logo shows as alt text only in the browser's static snapshot. The `../inputs/` path is correct, so this is not a palette defect.

## Acceptance criteria (from review-1)

| # | Criterion | Result | Measured |
|---|---|---|---|
| 1 | Every name has a dark and light value; only 3 new names | PASS | None missing in either mode. New: `--c-accent-text`, `--c-edge`, `--iso-sky-left`. |
| 2 | Text 4.5:1 and Lc 75 on every ground | PASS | Dark min 12.60 / Lc 97. Light min 14.76 / Lc 93. |
| 3 | Muted, cool-muted, accent-text, sky, ok: 4.5:1 and Lc 60 | PASS | Dark worst: accent-text on cool-surface-2, 7.34 / Lc 63. Light worst: accent-text on band, 5.42 / Lc 70. |
| 4 | Alert 4.5:1 everywhere; Lc 55 dark, 65 light | PASS with deviation | Dark ratio min 5.90. Dark Lc is 55-56 on page grounds and 52.5-54 on cards and dialogs. Light min 4.67 / Lc 65.3. |
| 5 | On-accent on accent 7:1 | PASS | 9.49 in both modes. |
| 6 | Edge and focus 3:1 | PASS | Edge: dark 3.97 min, light 3.60 min. Focus: dark 7.47 min, light 5.98 min. |
| 7 | Status pairs 10 dE normal; dark accent/alert 7 under all simulations; pairs under 5 listed | PASS | Dark accent/alert: 11.1 normal, worst 7.3 tritan. Light accent fill/alert 29.1. Light accent-text/alert is 9.9 normal (text ink, not a status pair; noted). Light protan accent-text/alert 4.3 is listed in the builder's notes. |
| 8 | Iso: order holds in all 4 visions, steps 0.06-0.20, right face 5 dE from ground | PASS | All 8 sets in order under every simulation. Steps 0.07-0.18. Dark box right face to ground: 5.3 dE (was 5.0 before the ground nudge). |
| 9 | Logo blue 3:1 dark, 4.5:1 light; crimson only in the logo token | PASS | 3.47 / 4.69. `#8D242E` appears only as `--logo-crimson`. |
| 10 | Hue bands | PASS | Neutrals 248-251. Blues 239.0-239.6. Amber 65.7-66.2. Alert vs crimson: dark 32.6 dE, light 10.5 dE. |
| 11 | One job per token | PASS | `--c-sky` no longer paints a drawing face. Some hex values are shared (iso-hi-left = dark accent, iso-sky-left = dark sky), but the tokens are separate, so each can move on its own. |
| 12 | Eye check | PASS | The amber button looks the same in both modes. Navy reads as a firm, not a game screen. Status rows carry an icon and a word. Light boxes read as lit objects. |

## Builder's deviations

- **Dark alert `#FF897E`** (L 0.757, C 0.145, h 26.6). Accepted. It beats my `#FA887D` on Lc and keeps CVD separation from amber (7.3 or more).
- **Dark `--iso-ground` `#15212E`.** Accepted. The right face of the plain box now clears the ground (5.3 dE).
- **Five ramp steps moved one hex unit.** Accepted. That is below what anyone can see (under 0.5 dE).
- **Error text on cards and dialogs.** Accepted as professional practice. There, the message is set in `--c-text`, and `--c-alert` is kept for the icon, the border and the word "Error" at 16px+, weight 600.
  - Large design systems do this: the red marks the state, and neutral ink carries the reading.
  - The red word still passes WCAG 2 (5.90:1 or more).
  - Lc 52.5 for one bold 16px word is above the APCA spot-reading floor (Lc 45). Body-length red text is what Lc 60 protects, and this rule removes it.
  - A pale pink would fail the brief. Errors would stop reading as errors.

## Conditions (rules for `src/` when the palette lands; no token changes)

1. **Error rule.** On `--c-solid`, `--c-surface`, `--c-surface-2` and cool surfaces, never set more than the one word "Error" (16px+, weight 600) in `--c-alert`. The message goes in `--c-text`. Error states always carry the icon, plus a border in `--c-alert`.
2. **Accent ink.** In `src/`, every use of `color:` / `stroke:` / `outline:` / focus `border-color:` with `--c-accent` moves to `--c-accent-text`. Light `--c-accent` is 1.72:1 on the page and must stay a fill under a `--c-on-accent` label. The footer map's `.f-l` face moves to `--iso-sky-left`.

Known and accepted:
- Light protan accent-text/alert is 4.3 dE. Amber links and error words must not sit side by side without the error icon.
- Light-mode drawings keep `--iso-edge` at 0.3. Without it, the white box top is 6.1 dE from the ground.
