---
name: drawing
description: Change, add or recolour one of the Uplink site's isometric drawings (service pictures, the hero office, Grow, the footer map), or change a colour token that drawings use. Use when the owner asks for a drawing change, or before you edit anything in tools/ or an SVG in public/assets/img/.
---

# Change a drawing

Every drawing is the output of a Python script. You change numbers in the script and run it; you never edit an output SVG. The rules are in `.claude/rules/drawings.md`; the geometry and each tool's flags are in the README ("Drawing rules", "Tools"). This file is the order of work.

Drawings change only on the owner's machine, and only when the owner asks. CI doesn't check them, so these steps are the only check there is.

## Steps

1. Find the script and how to run it. The README's "Generators" table lists each one, its arguments and every file it writes. A service scene is `python tools/gen_NAME.py public/assets/img/NAME.svg`; the office and hero are `python tools/gen_office.py public`; Grow (`gen_grow.py`) and the footer map (`gen_campus.py`) take no argument.
2. Make sure the tools are installed (README, "Install the Python drawing tools"). If `python tools/regen.py --check` fails before it draws anything, that's the cause.
3. Change the numbers in the script. Colours come from `tools/palette.py`, which reads `src/styles/tokens.css`; don't type a hex value into a generator.
4. Run the script, then both checks on what it wrote. The first lines of `tools/rules_NAME.py` give the exact commands for every cut, for example:

   ```bash
   python tools/gen_office.py public
   python tools/painter.py public/assets/img/office.svg 616.4 240.2 28.127 tools/rules_office.py
   python tools/check.py public/assets/img/office.svg --step 1.758
   ```

   `check.py` reports edges off the isometric angles and near-miss joins. `painter.py` reports boxes drawn in the wrong order. Fix the script until both are clean.

5. If the drawing has a light copy, or you changed a colour, run `python tools/gen_light.py`. It rewrites each `NAME-light.svg` and `src/styles/theme-drawings.css`.
6. Look at the result, including the phone cut `NAME-compact.svg`. Open the page in `npm run dev` in both themes and take a screenshot for the owner. The checks can't tell you whether it looks right.
7. Run everything once:

   ```bash
   python tools/regen.py --check
   python -m pytest tools/tests
   ```

8. Read `git diff --stat`. It must show only the script and the drawings you meant to change. An SVG you didn't mean to touch means a shared number moved: find out why before you commit.
9. Commit the SVGs with the script, then `npm run build`: it stops on a drawing whose `<style>` names a tag instead of a class.

## A colour token change

A change to a colour in `src/styles/tokens.css` changes drawings too. After it, do steps 5 to 9, and expect many SVGs in the diff. Say so to the owner before you start.

## A new drawing

Copy the closest `gen_NAME.py` and its `rules_NAME.py`, show the picture through `<Drawing src="/assets/img/NAME.svg" … />`, and add the new script to the README's "Generators" table and to `SCENES` or `GENERATORS` in `tools/regen.py`, which runs only the scripts it lists.

## When something here is wrong

The scripts and the README win over this file. Fix this file in the same pull request.
