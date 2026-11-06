// Writes public/favicon.ico from public/favicon.svg, by hand when the icon changes: node scripts/favicon-ico.mjs
// Browsers use the SVG (Base.astro's <link rel="icon">), but some, and link previews, still ask for /favicon.ico
// whatever the page says; without the file they got the whole 404 page. Chromium (Playwright) draws the SVG at 16,
// 32 and 48 px on a clear background, and each PNG goes into the .ico as it is (every browser since Windows Vista
// reads PNG inside an .ico).
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const SVG = readFileSync('public/favicon.svg', 'utf8');
const SIZES = [16, 32, 48];

const browser = await chromium.launch();
const pngs = [];
for (const size of SIZES) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${SVG}`);
  pngs.push(await page.screenshot({ omitBackground: true }));
  await page.close();
}
await browser.close();

// the .ico: a 6-byte header, a 16-byte entry per size (width, height, 32 bits, length, offset), then the PNGs
const head = Buffer.alloc(6 + 16 * pngs.length);
head.writeUInt16LE(0, 0);
head.writeUInt16LE(1, 2);
head.writeUInt16LE(pngs.length, 4);
let offset = head.length;
pngs.forEach((png, i) => {
  const at = 6 + 16 * i;
  head.writeUInt8(SIZES[i], at);
  head.writeUInt8(SIZES[i], at + 1);
  head.writeUInt16LE(1, at + 4);
  head.writeUInt16LE(32, at + 6);
  head.writeUInt32LE(png.length, at + 8);
  head.writeUInt32LE(offset, at + 12);
  offset += png.length;
});
const ico = Buffer.concat([head, ...pngs]);
writeFileSync('public/favicon.ico', ico);
console.log(`public/favicon.ico: ${SIZES.join(', ')} px, ${ico.length} bytes`);
