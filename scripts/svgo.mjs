// Shrinks the drawings in dist/assets/img/ after `astro build` (npm run build runs it before headers.mjs, which
// hashes the hero's <style> blocks as they are after this). The sources in public/ stay as the generators wrote
// them. What must survive, so a few SVGO defaults are off:
//   ids and classes        home.js, the hero CSS and the footer find parts by them (cleanupIds, collapseGroups)
//   <style> as written     the embedded fonts, and rules for classes the scripts add later, like .is-on
//                          (minifyStyles would drop those as unused; inlineStyles would write style="" attributes,
//                          which the CSP blocks)
//   hidden parts           display="none" paths the hero shows from script (removeHiddenElems)
// (SVGO 4 keeps the viewBox on its own.)
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { optimize } from 'svgo';

const DIR = 'dist/assets/img';
const config = {
  multipass: true,
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          cleanupIds: false,
          collapseGroups: false,
          minifyStyles: false,
          inlineStyles: false,
          removeHiddenElems: false,
          mergeStyles: false,
        },
      },
    },
  ],
};

let before = 0, after = 0;
for (const name of readdirSync(DIR).filter((f) => f.endsWith('.svg'))) {
  const file = join(DIR, name);
  const src = readFileSync(file, 'utf-8');
  const out = optimize(src, { path: file, ...config }).data;
  before += src.length; after += out.length;
  writeFileSync(file, out);
}
console.log(`svgo: drawings ${(before / 1024).toFixed(0)} KB -> ${(after / 1024).toFixed(0)} KB`);
