# Grow section mockups (done: built into the site)

Redesign of the Home "We grow with you" section, worked out in mockups before it was built. Nothing here is part of the site build. Open items are in `notes.md` (Page structure).

## Where it stands (4 Nov 2026): built into the site

Built into Home on 4 Nov 2026 (`src/components/home/Grow.astro`, `src/scripts/grow.js`, `src/data/grow.json`), from round 8 and the draft that followed it (`section.template.html`): one isometric world that grows in six steps by where people work (your office, working from home, on the road, a second office, all of it, covered by the dome). New parts drop in and glow; nothing rebuilds. The camera follows growth. The picture and its controls (arrows and a dot a step, as the Services carousel's) are one player that sticks under the header on phones while the card scrolls below. No scroll lock.

## Seeing it at real size

- `section.html` (built from `section.template.html`): the round 8 section on its own page at real size, between a stand-in header, the section before and the section after, with the site's fonts, tokens and breakpoints (phone < 700, tablet 700-1099, desktop >= 1100, one screen tall). Resize the window to move between layouts; the mockup controls (bottom right) show the size and switch the camera and the lots.
- `grow-section.html` (built): the same page as one self-contained file, fonts embedded, nothing to fetch. Published as the working draft: [Grow Section Draft](https://claude.ai/artifact/1TCG1i8DrdXK8987tDZdT7) (private to John's account). Republish the same file to keep the link.
- `preview.html`: loads `section.html` at an exact size (phone 390 × 844, tablet 820 × 1180 and 1180 × 820, desktop 1440 × 900, or your own), scaled to fit the window.
- Local server: the `grow-mockups` entry in `.claude/launch.json` (`python -m http.server 8790 --directory editing-room/grow-options`), then http://localhost:8790/preview.html.

## The rounds

| Round | Idea | Page | Published |
|---|---|---|---|
| 1 | Four layouts on the real tower: tabs, slider, sticky scroll, three-up | `template.html` → `mockups.html` | [link](https://claude.ai/artifact/GtZ1QNjvAUyUHbHkEubSqk) |
| 2 | Hybrids: watch it grow + boxes, self-playing slider, scroll without lock | `round2.template.html` → `round2.html` | [link](https://claude.ai/artifact/TGpndPV5craJpDbrr2437D) |
| 3 | Fix the shape: square diorama vs tall and wide cuts | `round3.html` | [link](https://claude.ai/artifact/PmZC7rxiwZ6zTSCm33X9pX) |
| 4 | Story by place: one scene per place, pills, Watch for / We handle | `round4.html` | [link](https://claude.ai/artifact/MUa6GNfeExR48ePDcxF6Lc) |
| 5 | Tags flip red (risk) to green (fix); tablet frame | `round5.html` | [link](https://claude.ai/artifact/WgwL6mMXjgbtDbovecYFQG) |
| 6 | Real drawings, one per place | `round6.template.html` → `round6.html` | [link](https://claude.ai/artifact/5SqRTZUpMZi885MZVuwU8V) |
| 7 | One world that grows (feedback: separate scenes read as rebuilds) | `round7.template.html` → `round7.html` | [link](https://claude.ai/artifact/3JQ9mAsHxVSX9HGFQNt7GR) |
| 8 | Future lots, team counter, more people, follow camera | `round8.template.html` → `round8.html` | [link](https://claude.ai/artifact/7GrqyEqv26ZA3ZxMbpkomZ) |

The published links are private to John's account.

## Building the pages

Pages with a template are built (the built `.html` is not committed). From the project root:

```
python tools/gen_grow.py editing-room/grow-options/places
node editing-room/grow-options/build.mjs
```

- `tools/gen_grow.py` draws the site's world (`src/components/home/grow-world.svg`, which rounds 7, 8 and the draft read) and, given this folder, `places/*.svg`: the five place scenes (round 6). Same kit and rules as the other drawings; check each with `tools/check.py` and `tools/painter.py ... 0 0 20 tools/rules_grow.py`.
- `build.mjs` inlines the drawings into the templates (rounds 6-8 and the draft). Rounds 1-2 used the old tower, now removed: their templates are a record only.
