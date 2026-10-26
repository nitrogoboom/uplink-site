# Notes: open items

Things to fix, polish or decide. Remove a line when it's done; add new ones as they come up.

## Drawings
- [ ] VoIP: the headset is still small and tucked against the monitor (mic boom about 10px); the desk phone's handset sits flat rather than raised in a cradle.
- [ ] Hero 3D cloud is still hand-drawn (`tools/office_parts/hero_cloud.svg`), with ~99 checker flags. Rebuild it in `gen_office.py`.
- [ ] Hero on phones is a still picture (`office-compact.svg`): no build animation, no cloud.
- [ ] Office plan: ~153 one-grid-step near-miss flags because the furniture is half size there. Not visible; tidy if the props get a half-size grid.
- [ ] Office phone cut: the FIREWALL RACK title runs over the room's front edge (outlined to stay readable), and its leader doubles back.
- [ ] Network phone cut: the VOIP PHONES leader crosses the back monitor.
- [ ] Network: the access point's ceiling rod barely shows, so it can read as sitting low.
- [ ] Security: the roof unit could use a fan or vent; the door could use a step.
- [ ] Cloud: the phone's call buttons are small; the OLD SERVER dot crowds the server front.
- [ ] Backup: the drive bays turn to texture at phone size; the OFFSITE COPY leader points at the wall, not the lock.
- [ ] Strategy: the IT BUDGET leader is long and steep.
- [ ] Tower: trees and bushes are plain stacked cubes; the rooftop unit is a plain box.
- [ ] HQ phone cut: the building sits right of centre to make room for the label.
- [ ] Trees are coded twice (tower and hq). Move one tree into `tools/isoprops.py`.

## Site
- [ ] Home services grid: with 7 cards the last row on laptops holds one card on its own.
- [ ] Hero leaves an empty gap at around 1000px wide.
- [ ] `index.html` still has 11 inline `style="animation-duration…"` attributes in the hero; move them into CSS.
- [ ] CSP `style-src` needs `'unsafe-inline'` because of the hero's inline `<style>` blocks and `style=""` attributes. Drop it once they move into CSS.
- [ ] Unused CSS classes: `btn--block`, `dlg-close`, `num`, `section--tight`, `tk-1`, `tk-2`, `tk-3`.
- [ ] Self-host the Barlow fonts instead of loading Google Fonts.
- [ ] `src/styles/desktop.css` is still one block for every page. Split it per section (each with its own `@media`) and move each piece next to its section; check computed styles match after.
- [ ] The `<head>` is copied in each `src/pages/*/page.html`. Make it one shared layout with per-page title, description and scripts (the Astro move does this anyway).

## Before going live
- [ ] Forms are mockups: contact, book-a-call and newsletter send nothing. Left as mockups for now (26 Oct 2026). When wanted: a Pages Function in `functions/` that emails each submission to one inbox.

## Copy to confirm
- [ ] VoIP service wording ("Phones & Teams calling" section, card and footer).
- [ ] Plans table row "Teams Phone and desk phones": add-on / add-on / included.
- [ ] Backup drawing subline: "a separate, locked site".
- [ ] Network drawing label VOIP PHONES "calls over your network" (replaced CORE SWITCH).
