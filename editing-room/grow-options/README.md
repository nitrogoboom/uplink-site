# Grow section mockups (in progress)

Redesign of the Home "We grow with you" section, worked out in mockups before anything is built. Nothing here is part of the site build. Open items are in `notes.md` (Page structure).

## Where it stands (4 Nov 2026)

Chosen so far, round 8: one isometric world that grows in five steps by where people work (your office, working from home, on the road, a second office, all of it). New parts drop in and glow; nothing rebuilds. The camera follows growth (close on the office first, pulling back). Dashed lots show what's coming. Pills jump between steps; a card says what to watch for and what we handle. No scroll lock.

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
python tools/gen_places.py editing-room/grow-options/places
node editing-room/grow-options/build.mjs
```

- `tools/gen_places.py` draws `places/*.svg`: the five place scenes (round 6) and `world.svg`, the growing world (rounds 7 and 8). Same kit and rules as the other drawings; check each with `tools/check.py` and `tools/painter.py ... 0 0 20 tools/rules_places.py`.
- `build.mjs` inlines the real tower (rounds 1-2) and the place drawings (rounds 6-8) into the templates.
