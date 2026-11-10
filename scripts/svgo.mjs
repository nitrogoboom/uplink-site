// Shrinks the drawings in dist/assets/img/, first of the build's last steps (astro.config.mjs runs it before
// headers.mjs, which hashes the hero's <style> blocks as they are after this). The sources in public/ stay as the
// generators wrote them. The settings, what they keep, and the check that a drawing's own CSS still finds its parts
// (it fails the build otherwise) are in svgo-config.mjs. Every drawing goes through it, the footer's campus map too:
// footer.css styles the map's parts by class, as the drawings' own CSS does.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { shrink } from './svgo-config.mjs';

export function svgo(dist) {
  const DIR = join(dist, 'assets/img');
  let before = 0,
    after = 0;
  for (const name of readdirSync(DIR).filter((f) => f.endsWith('.svg'))) {
    const file = join(DIR, name);
    const src = readFileSync(file, 'utf-8');
    const out = shrink(src, `assets/img/${name}`);
    before += src.length;
    after += out.length;
    writeFileSync(file, out);
  }
  console.log(`svgo: drawings ${(before / 1024).toFixed(0)} KB -> ${(after / 1024).toFixed(0)} KB`);
}

// Run on its own (node scripts/svgo.mjs) only by the tests in scripts/test/, on the folder DIST names. The build
// calls svgo() from the integration in astro.config.mjs.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) svgo(process.env.DIST || 'dist');
