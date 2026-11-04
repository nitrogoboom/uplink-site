# Editing room

Side jobs, finished or in progress. Nothing here is part of the site build.

## `404-comic/` (draft, in progress)

A three-panel heist comic for the 404 page. Script, status and next steps in its `README.md`.

## `grow-options/` (mockups, in progress)

Redesign of the Home "We grow with you" section, eight rounds of mockups. Where it stands and how to build the pages in its `README.md`.

## `palette/` (done, applied 28 Oct 2026)

The Navy & Amber colour work.

- **`palette/DESIGN.md` is live.** It is the colour spec: the roles that `site/assets/css/tokens.css` and `tools/palette.py` use. Edit a colour there first, then in `tokens.css`, then rerun the drawing scripts.
- `palette/final/` is the measured result (`build.py` checks the twelve contrast and harmony criteria and writes `tokens.css`, `notes.md`, `preview.html` beside it). Rerun it if a colour changes.
- `palette/inputs/` holds the logo files.
- `BRIEF.md`, `proposal-a/`, `proposal-b/`, `proposal-c/` and `review/` are the record of how the palette was chosen. The rules in `BRIEF.md` ("work only in this folder", "don't commit") applied to that job and are over. Don't take design direction from the proposals; proposal C plus the review is what `final/` and `DESIGN.md` carry.
