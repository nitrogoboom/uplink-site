# Editing room

Side jobs, finished or in progress. Nothing here is part of the site build.

## `404-comic/` (draft, in progress)

A three-panel heist comic for the 404 page. Script, status and next steps in its `README.md`.

## `footer-phone/` (mockups, in progress)

The footer on phones: the tabs sit above the map and the links below it, so every tap means scrolling. Round 1 has three fixes beside today's footer, clickable, with a measure under each phone. Where it stands in its `README.md`.

## `grow-list/` (done, built into the site November 6, 2026)

Home "We grow with you" on desktop, option C: the six steps as a clickable list in the left column's empty middle, in place of the dots under the picture. Phones and tablets keep the dots. The mockup and how it was built, in its `README.md`.

## `grow-options/` (done, built into the site 4 Nov 2026)

Redesign of the Home "We grow with you" section, eight rounds of mockups. The record, and how to build the pages, in its `README.md`.

## `news-cards/` (done, picked C, 5 Nov 2026)

The home hero's two news cards, two rounds of mockups at desktop and phone size. Round 2's C (picture as a full-height panel, a dot-and-word tag) is on the site. The rounds and the measures in its `README.md`.

## `palette/` (done, applied 28 Oct 2026)

The Navy & Amber colour work.

- **`palette/DESIGN.md` is live.** It is the colour spec: the roles that `src/styles/tokens.css` and `tools/palette.py` use. Edit a colour there first, then in `tokens.css`, then rerun the drawing scripts.
- `palette/final/` is the measured result (`build.py` checks the twelve contrast and harmony criteria and writes `tokens.css`, `notes.md`, `preview.html` beside it). Rerun it if a colour changes.
- `palette/inputs/` holds the logo colour sheet (`logo-palette.html`).
- `BRIEF.md`, `proposal-a/`, `proposal-b/`, `proposal-c/` and `review/` are the record of how the palette was chosen. The rules in `BRIEF.md` ("work only in this folder", "don't commit") applied to that job and are over. Don't take design direction from the proposals; proposal C plus the review is what `final/` and `DESIGN.md` carry.
