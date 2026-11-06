// Builds the Our work phone mockups: mockups.template.html with the six projects (src/content/projects/*.json, in
// their order) and each one's card drawing (public/assets/img/NAME-card.svg) inlined at /*PROJECTS*/, so the page is
// one file. The drawings go in as data: URLs, so their ids and styles stay apart.
// Run from the project root: node editing-room/work-phone/build.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const here = new URL('.', import.meta.url);
const root = new URL('../../', here);
const dir = new URL('src/content/projects/', root);
const projects = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => ({ id: f.slice(0, -5), ...JSON.parse(readFileSync(new URL(f, dir), 'utf8')) }))
  .sort((a, b) => a.order - b.order)
  .map(({ id, name, tag, clientShort, result, image }) => {
    const svg = readFileSync(new URL(`public/assets/img/${image}-card.svg`, root));
    return { id, name, tag, clientShort, result, src: `data:image/svg+xml;base64,${svg.toString('base64')}` };
  });
const page = readFileSync(new URL('mockups.template.html', here), 'utf8')
  .replace('/*PROJECTS*/', () => JSON.stringify(projects));
writeFileSync(new URL('mockups.html', here), page);
console.log(`mockups.html: ${(page.length / 1024).toFixed(0)} KB, ${projects.length} projects`);
