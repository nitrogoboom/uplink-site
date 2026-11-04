// Builds the mockup pages. Rounds 1-2: the real tower drawing (src/components/home/grow-tower.svg) inlined at
// <!--TOWER-->, shrunk with the site's own SVGO settings. Round 6: the place scenes (places/*.svg, written by
// tools/gen_places.py) inlined at <!--SCENES--> as <template id="scene-NAME">, as written (SVGO would drop the
// r="0" anchor circles the tags sit on). Rounds 7-8 and section.html: the growing world (places/world.svg) at
// <!--WORLD-->. section.html also gets the site's tokens (<!--TOKENS-->) and fonts (<!--FONTS-->, the woff2 files
// copied to assets/fonts/ here), so it renders at real size the way the site would.
// Run from the project root: python tools/gen_places.py editing-room/grow-options/places && node editing-room/grow-options/build.mjs
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { optimize } from 'svgo';
import { SVGO } from '../../scripts/svgo-config.mjs';

const here = new URL('.', import.meta.url);
const read = (p) => readFileSync(new URL(p, here), 'utf8');
const tower = optimize(read('../../src/components/home/grow-tower.svg'), SVGO).data;
const scenes = ['office', 'home', 'road', 'second', 'all']
  .map((n) => `<template id="scene-${n}">${read(`places/${n}.svg`)}</template>`).join('\n');
const world = `<template id="world">${read('places/world.svg')}</template>`;
const tokens = read('../../src/styles/tokens.css');
const fonts = read('../../src/styles/fonts.css').replaceAll("url('/assets/fonts/", "url('assets/fonts/");

mkdirSync(new URL('assets/fonts/', here), { recursive: true });
const fontDir = new URL('../../public/assets/fonts/', here);
for (const f of readdirSync(fontDir)) if (f.endsWith('.woff2')) copyFileSync(new URL(f, fontDir), new URL(`assets/fonts/${f}`, here));

const PAGES = {
  'template.html': 'mockups.html', 'round2.template.html': 'round2.html', 'round6.template.html': 'round6.html',
  'round7.template.html': 'round7.html', 'round8.template.html': 'round8.html', 'section.template.html': 'section.html',
};
for (const [from, to] of Object.entries(PAGES)) {
  const page = read(from).replace('<!--TOWER-->', () => tower).replace('<!--SCENES-->', () => scenes).replace('<!--WORLD-->', () => world)
    .replace('<!--TOKENS-->', () => tokens).replace('<!--FONTS-->', () => fonts);
  writeFileSync(new URL(to, here), page);
  console.log(`${to}: ${(page.length / 1024).toFixed(0)} KB`);
}

// grow-section.html: the same section page as one self-contained file (fonts embedded as data, nothing to fetch),
// to open on any device or publish. Written without the doctype/html/head/body wrapper, which the publisher adds.
const fontData = (f) => `data:font/woff2;base64,${readFileSync(new URL(f, fontDir)).toString('base64')}`;
const fontsInline = read('../../src/styles/fonts.css').replace(/url\('\/assets\/fonts\/([^']+)'\)/g, (_m, f) => `url('${fontData(f)}')`);
const standalone = read('section.template.html').replace('<!--WORLD-->', () => world).replace('<!--TOKENS-->', () => tokens)
  .replace('<!--FONTS-->', () => fontsInline)
  .replace(/^<!doctype html>\s*<html[^>]*>\s*<head>\s*<meta charset="utf-8">\s*<meta name="viewport"[^>]*>\s*/i, '')
  .replace('<title>Grow section preview</title>', '<title>Grow Section Draft</title>\n<meta name="claude:viewport-fit-sides" content="cover">')
  .replace(/<\/head>\s*<body>/, '').replace(/<\/body>\s*<\/html>\s*$/, '\n');
writeFileSync(new URL('grow-section.html', here), standalone);
console.log(`grow-section.html: ${(standalone.length / 1024).toFixed(0)} KB (self-contained)`);
