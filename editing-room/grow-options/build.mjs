// Builds the mockup pages. Rounds 1-2: the real tower drawing (src/components/home/grow-tower.svg) inlined at
// <!--TOWER-->, shrunk with the site's own SVGO settings. Round 6: the place scenes (places/*.svg, written by
// tools/gen_places.py) inlined at <!--SCENES--> as <template id="scene-NAME">, as written (SVGO would drop the
// r="0" anchor circles the tags sit on). Round 7: the growing world (places/world.svg) at <!--WORLD-->.
// Run from the project root: python tools/gen_places.py editing-room/grow-options/places && node editing-room/grow-options/build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { optimize } from 'svgo';
import { SVGO } from '../../scripts/svgo-config.mjs';

const here = new URL('.', import.meta.url);
const raw = readFileSync(new URL('../../src/components/home/grow-tower.svg', here), 'utf8');
const tower = optimize(raw, SVGO).data;
const scenes = ['office', 'home', 'road', 'second', 'all']
  .map((n) => `<template id="scene-${n}">${readFileSync(new URL(`places/${n}.svg`, here), 'utf8')}</template>`).join('\n');
const world = `<template id="world">${readFileSync(new URL('places/world.svg', here), 'utf8')}</template>`;
const PAGES = { 'template.html': 'mockups.html', 'round2.template.html': 'round2.html', 'round6.template.html': 'round6.html', 'round7.template.html': 'round7.html', 'round8.template.html': 'round8.html' };
for (const [from, to] of Object.entries(PAGES)) {
  const page = readFileSync(new URL(from, here), 'utf8').replace('<!--TOWER-->', () => tower).replace('<!--SCENES-->', () => scenes).replace('<!--WORLD-->', () => world);
  writeFileSync(new URL(to, here), page);
  console.log(`${to}: ${(page.length / 1024).toFixed(0)} KB`);
}
