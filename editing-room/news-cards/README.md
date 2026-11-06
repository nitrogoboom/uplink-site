# Home hero news cards (mockups)

The problem (John, 5 Nov 2026): the two news cards under the hero drawing don't look settled. The picture sits top
left, the pill pushes the words below the top of the picture, and the two never line up. Mockups first, no site
changes until one is picked.

`mockups.html` is built from `template.html` with the site's own card drawings inlined:

    node editing-room/news-cards/build.mjs

Served in the app browser by the `news-cards` entry in `.claude/launch.json` (http://localhost:8791/mockups.html).
Each option shows the cards at the size they are on a 1440 desktop (two, 368 px each) and on a phone (one, 358 px),
with the card height measured under it.

## Round 1

- **Now**: 100 px desktop, 123 px phone.
- **A, pill above the picture** (John's idea, refined with him): the pill centred above the picture in its own row;
  the title and line centred on the picture beside it, never on the pill's line. 130 px both.
- **B, pill on the picture**: the pill on the picture's corner, as on the service and work cards; picture the card's
  full height, words centred. 106 px both.
- **C, pill and title on top**: a headline row, then picture and line side by side. 134 px both.

John turned all three down: the alignment was off and they left blank gaps.

## Round 2 (in the page now; round 1's A/B/C replaced)

Rules every option keeps: one spacing value inside the card; the picture as tall as the card (no gap under it);
label, title and line as one block centred beside the picture; both cards in a row the same height. Measured:
equal space above and below the picture and the words in every card.

- **A, framed picture**: today's card fixed. 104 px desktop, 127 px phone.
- **B, picture panel**: the picture edge to edge on the left, a thin line, then the words. 135 px both.
- **C, panel with a label**: B with the pill swapped for a dot-and-word label. 122 px both.

**Picked: C** (John, 5 Nov 2026). Built in `hero.css` and `Hero.astro` on branch `news-cards-panel`. Measured on
the site at 375, 768, 1024, 1440, 1920 and 3440 wide, and at 200% text: the panel is the card's full height and the
words have the same space above and below in every card. The hero ends where it did before at every size (it is
one screen tall; the drawing gives up the extra 22 px). verify_footer, verify_text (200% and 100%) and lint pass.

The site's file is `src/components/home/hero.css` (`.news` rules); the markup is in `src/components/home/Hero.astro`.
