---
name: release
description: Ship a release of the Uplink site, or get ready for launch day. Use when the owner says "release", "tag a release", "run the release checklist", "full checks before launch" or "launch". Not for an ordinary merge, which needs none of this.
---

# Release the site

A release is a merge with every look done, a filled-in checklist as proof, and a tag. `docs/release.md` owns every detail; this file is the order to do them in. Read only the section a step names.

The owner doesn't run commands. You run each step, and hand over only the parts that need their eyes or their devices.

## Before the merge

1. Run, once:

   ```bash
   npm run quick
   python tools/regen.py --check
   ```

   `python tools/regen.py --check` needs the Python tools (docs/drawing-tools.md, "Install the Python drawing tools"). `git diff` must be empty after it.

2. Do the looks in the `check` skill on the pull request's preview, every page. "Before and after" against the live site comes first: tell the owner which pages changed, in plain words, and make sure each change is meant.

## Merge and tag

Follow `docs/release.md`, "Ship a release", steps 1 to 4. Read the deploy job's summary before you tag: it names the version that went live, or says why nothing did. A failed live check rolls back by itself; anything else is in `docs/ops.md`, "Roll back a bad deploy".

## The checklist

1. Copy `docs/release.md`, "Release checklist", to `docs/history/releases/YYYY-MM-DD.md`.
2. Do parts A, B and D yourself and paste the proof each line asks for.
3. Part C is by hand, about 15 minutes: real phones, a screen reader listen, judgement calls. Give the owner the preview link and the list, one line each, and write down what they report.
4. Part E is the owner's sign-off. Don't tick it for them.

## Launch day only

`docs/release.md`, "Before launch" lists what's still open, and "Launch day" is the runbook: the day before, the launch, straight after, and how to back out. Read those two sections in full before you start, and settle "Choose how to retire `workers.dev`" with the owner first.

## When something here is wrong

`docs/release.md` and the code win over this file. Fix this file in the same pull request.
