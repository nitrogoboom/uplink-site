# Retired tools

Waiting to be deleted. Nothing in the build or the drawing scripts uses them. They come from the time before the `gen_*.py` scripts, when the SVGs were drawn and fixed by hand. Now every drawing is written by a script, so a hand fix to an SVG is lost the next time its script runs.

They no longer run from here (they expect `iso.py` next to them). To bring one back, move it to `tools/` and add it to the tools list in the main README.

| File | What it did | Why it's retired |
|---|---|---|
| `fixlib.py` | Find-and-replace edits on SVG points | Hand edits to SVGs; scripts overwrite them |
| `roundify.py`, `bboxes.js` | Rebuilt a floor disc in an SVG as a true iso circle | Same; the scripts draw true circles. `bboxes.js` also needs Node Playwright, which isn't installed |
| `discs.py`, `floorfit.py` | Checked hand-drawn ovals were true iso circles | The scripts draw circles from the iso maths |
| `dump.py`, `boxes.py` | Read a drawing back into world units and boxes | Used to turn hand-drawn SVGs into scripts; done |
| `embed_font.py` | Put Barlow letters into a hand-made SVG | The scripts do it themselves; no hand-made SVG with text is left |
| `verify.js` | Hero, tower and sideways-scroll checks | Replaced by `verify_footer.py` (same checks and more); needs Node Playwright |
| `shoot.js`, `shoot1.js`, `compare.py` | Screenshots and before/after sheets of the drawings | Need Node Playwright; Claude's browser does this now |
| `footer_painter.py` | Painter-order check on the footer map | Only ran after hand-adding a logger to `footer.js` |

Delete the folder once nothing has asked for these.
