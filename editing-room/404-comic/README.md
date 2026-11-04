# 404 comic (draft, in progress)

A three-panel comic for the 404 page. Not part of the site build yet.

- `comic.html`: the strip as one SVG (open it in a browser). Hand-drawn look from an SVG wobble filter; lettering is Patrick Hand from Google Fonts.
- `comic.png`: how it looked on 4 Nov 2026.

## The idea

A heist parody (the vault drop: someone lowered on a wire to a glass case), told the way the xkcd sysadmin Die Hard comic works ([xkcd 705](https://xkcd.com/705/)): the joke comes from what the IT person cares about while the drama goes on. Here the 404 *is* the twist: the hacker in the van typed the address wrong.

We parody the situation only. No film characters, names, lines or music, and nothing copied from xkcd (its art is CC BY-NC).

## The script

1. **Outside, 2:14 am.** A van marked FLOWERS outside the VAULT building. Hacker in the van, headset on: "Address typed in. Go, go, go." (plants the typing)
2. **The drop.** A thief in a beanie and goggles hangs on a cable over a glass cover on a pedestal (plaque: THE PAGE). Lasers on the walls. Radio: "Easy... easy..."
3. **The reveal (wider panel).** The thief holds the glass cover aside. On the pedestal, only a card: 404. The thief says nothing (the beat). Radio, bottom right, the last thing read: "...I may have typed "servcies"."

Radio voices use jagged balloons. The punchline stays last and on its own.

## Where it stands (4 Nov 2026)

- Panels 2 and 3 work.
- Panel 1 (the van) doesn't work yet. Rethink how it shows "the hacker typed the address".
- Panel 3: the balloon's jagged edge cuts into the "t" of "typed". Give the text more room.
- Earlier tries, dropped: the lost packet, the Hitchhiker's leopard notice (too few people know it), a flat geometric vault scene and a cutaway basement (not enough to read).

## Lessons from the drafts

- Check every render at the size people will see it, not zoomed in. Thin lines and small figures vanish.
- Clarity beats mood: black fills and tight close-ups hid the objects that tell the story.
- Label what matters (VAULT, THE PAGE, FLOWERS); a word does more than detail.
- Words shouldn't repeat the picture ("It's empty." was cut).

## Before it goes on the site

- Draw it with a `tools/gen_*.py` script like the other drawings, or decide it is the one hand-drawn exception (and record why).
- Colours from `tokens.css` (DESIGN.md roles), light and dark.
- Phone: the panels stack. Text stays real text (scales with Settings, readable aloud), plus a short transcript.
- Under it: the page copy (H1, a "did you mean" guess, Back to home · Services · Contact). Keep the 404 status and `noindex`.
