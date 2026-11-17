// Finishes each built page's <head>. Runs after Astro and before headers.mjs (astro.config.mjs), which hashes the
// pages as this leaves them.
//   Scripts   every script file the page runs is named there (<link rel="modulepreload">): its own <script src> files
//             (at the end of the <body>) and the ones those import (core.js's shared file), so the browser fetches
//             them all as the page starts to arrive, not one found inside another (PageSpeed, "Network dependency
//             tree"). Astro writes the <script src> tags but not these.
//   CSS       Astro links each page's CSS as files (astro.config.mjs, inlineStylesheets): one every page shares and,
//             for Home, one of its own. Home is where a visitor arrives with nothing kept, so its two files go back
//             into the page as <style> blocks and nothing waits on a second request before the first paint (owner,
//             November 17, 2026). Every other page keeps the link: the shared file is fetched once and kept a year,
//             and a page fetched ahead (speculation rules) is its HTML alone. Home names the shared file in a
//             <meta name="later-css">, and home.js asks for it once Home has loaded, so the next page has it. (Not
//             <link rel="prefetch">: the CSP's default-src 'none' refuses one in Firefox, and Safari has none.) A
//             file only Home used is deleted.
import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, posix } from 'node:path';

const HOME = 'index.html';
const SHEET = /<link rel="stylesheet" href="([^"]+)">/g;

/** @param {string} DIST the built site's folder (dist/) */
export function head(DIST) {
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
  const pages = readdirSync(DIST, { recursive: true, encoding: 'utf-8' })
    .filter((name) => name.endsWith('.html'))
    .map((name) => ({ name, html: readFileSync(join(DIST, name), 'utf-8') }));
  const sheets = (/** @type {string} */ html) => [...html.matchAll(SHEET)].map((m) => m[1]);
  // the CSS files the other pages link: the ones Home fetches ahead for them
  const shared = new Set(pages.filter((p) => p.name !== HOME).flatMap((p) => sheets(p.html)));
  let inlined = 0;
  for (const page of pages) {
    let { html } = page;
    const own = [...html.matchAll(/<script type="module" src="([^"]+)"/g)].map((m) => m[1]);
    const links = [...new Set([...own, ...own.flatMap(imports)])].map(
      (src) => `<link rel="modulepreload" href="${src}">`,
    );
    const mine = page.name === HOME ? sheets(html) : [];
    for (const href of mine) if (shared.has(href)) links.push(`<meta name="later-css" content="${href}">`);
    // The names go in ahead of the page's CSS: its <link>, or on Home the two <style> blocks that take its place.
    // A browser reads a page as it arrives, and after Home's 100 KB of CSS the names came too late to count on a
    // real connection: the <script> tags at the end of the page had asked first (seen on the live site, November
    // 17, 2026). Ahead of the CSS they leave in the page's first bytes, with the fonts.
    const css = html.indexOf('<link rel="stylesheet"');
    const names = links.join('');
    html = css < 0 ? html.replace('</head>', names + '</head>') : html.slice(0, css) + names + html.slice(css);
    if (mine.length) {
      // a function, so a $ in the CSS is never read as a replacement pattern
      html = html.replace(SHEET, (_, href) => `<style>${readFileSync(join(DIST, href), 'utf-8')}</style>`);
      for (const href of mine) if (!shared.has(href)) rmSync(join(DIST, href)); // a file only Home used
      inlined = mine.length;
    }
    if (html !== page.html) writeFileSync(join(DIST, page.name), html);
  }
  if (!inlined) throw new Error(`dist/${HOME}: no linked CSS file found to put back into the page (scripts/head.mjs)`);
  console.log(
    `head: ${pages.length} page(s) name their script files; Home carries its ${inlined} CSS file(s), the rest link ${shared.size}`,
  );
}
