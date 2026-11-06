// Builds the news card mockups: template.html with the options filled in at <!--OPTIONS--> and the site's own card
// drawings (public/assets/img/security-card.svg, cloud-card.svg) inlined as data: URLs, so the page is one file.
// Run from the project root: node editing-room/news-cards/build.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const here = new URL('.', import.meta.url);
const read = (p) => readFileSync(new URL(p, here), 'utf8');
const svg = (name) => `data:image/svg+xml;base64,${Buffer.from(read(`../../public/assets/img/${name}-card.svg`)).toString('base64')}`;

const OPTIONS = [
  ['now', 'Now', "Today's card: small picture top left, pill over the title, words wrap beside it. The picture and the words don't line up, and the pill pushes the words lower than the picture."],
  ['a', 'A · <b>Framed picture</b>', "Today's card, fixed. The picture is as tall as the card, so nothing hangs below it. Pill, title and line are one block, centred beside it. Even spacing all round."],
  ['b', 'B · <b>Picture panel</b>', 'The picture becomes a panel, edge to edge on the left, with a thin line between it and the words. The words get the same padding on every side. The usual look for promo tiles.'],
  ['c', 'C · <b>Panel with a label</b>', 'B with the pill swapped for a coloured label (dot and word, like the eyebrows on the site). Quieter and a line shorter. The label still says Free or Guide.'],
];
const block = ([v, name, text]) => `<section class="opt v-${v}" data-v="${v}">
    <div class="opt-head"><h2>${name}</h2><p>${text}</p></div>
    <div class="sizes">
      <div class="size"><p class="size-label">Desktop <span>1440</span></p><div class="dock desk"></div></div>
      <div class="size"><p class="size-label">Phone <span>390</span></p><div class="dock phone"></div></div>
    </div>
    <p class="measure"></p>
  </section>`;

const page = read('template.html')
  .replace('<!--OPTIONS-->', () => OPTIONS.map(block).join('\n\n  '))
  .replace('%SECURITY%', () => svg('security'))
  .replace('%CLOUD%', () => svg('cloud'));
writeFileSync(new URL('mockups.html', here), page);
console.log(`mockups.html: ${(page.length / 1024).toFixed(0)} KB`);
