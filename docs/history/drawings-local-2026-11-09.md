# Drawings are checked locally, not in CI

*November 9, 2026*

**Decision (owner):** CI no longer regenerates or checks the drawings. The `drawings` job is gone from `.github/workflows/site.yml`, and the deploy no longer waits for it.

**Why:** only the owner and the agent change drawings, locally, and only when the owner wants a drawing changed. The site serves the committed SVGs as they are; CI never redrew them, it only reran every generator on a throwaway copy to prove the committed files still matched their scripts. That ran on every pull request and every push to `main`, including copy and layout changes that touch no drawing, and it was one more job that could hold up a deploy. It confused more than it protected.

**What replaces it:**

- Whoever changes a drawing runs `python tools/regen.py --check` and `python -m pytest tools/tests`, checks that `git diff` shows only the drawings they meant to change, and commits the SVGs with the script (`CLAUDE.md`, "Drawings"; README, "Check a drawing").
- The same check is on the release list (`CLAUDE.md`, "Checking a change").

**What you give up:** a drawing script changed without its SVGs, or an SVG edited by hand, is no longer caught by CI. A change to `src/styles/tokens.css` can change drawing colours (`tools/palette.py` reads it), so rerun the generators after a colour token change too.
