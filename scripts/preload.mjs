// Names, in each built page's <head>, every script file the page runs: its own <script src> files (at the end of the
// <body>) and the ones those import (core.js's shared file), so the browser fetches them all as the page starts to
// arrive, not one found inside another (PageSpeed, "Network dependency tree"). Astro writes the <script src> tags but
// no <link rel="modulepreload">. Runs before headers.mjs (astro.config.mjs).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, posix } from 'node:path';

/** @param {string} DIST the built site's folder (dist/) */
export function preload(DIST) {
  /** @type {Map<string, string[]>} a script's address -> every address it imports, however deep */
  const known = new Map();
  /** @type {(src: string) => string[]} */
  const imports = (src) => {
    let all = known.get(src);
    if (!all) {
      const js = readFileSync(join(DIST, src), 'utf-8');
      const own = [...js.matchAll(/\b(?:from|import)\s*["'](\.{1,2}\/[^"']+)["']/g)].map((m) =>
        posix.join(posix.dirname(src), m[1]),
      );
      known.set(src, []); // a loop of imports ends here
      all = [...new Set(own.flatMap((d) => [d, ...imports(d)]))];
      known.set(src, all);
    }
    return all;
  };
  let pages = 0;
  for (const name of readdirSync(DIST, { recursive: true, encoding: 'utf-8' })) {
    if (!name.endsWith('.html')) continue;
    const file = join(DIST, name);
    const html = readFileSync(file, 'utf-8');
    const own = [...html.matchAll(/<script type="module" src="([^"]+)"/g)].map((m) => m[1]);
    const links = [...new Set([...own, ...own.flatMap(imports)])].map(
      (src) => `<link rel="modulepreload" href="${src}">`,
    );
    if (!links.length) continue;
    writeFileSync(file, html.replace('</head>', links.join('') + '</head>'));
    pages++;
  }
  console.log(`preload: ${pages} page(s) name their script files`);
}
