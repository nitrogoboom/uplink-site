// Finishes dist/_headers after `astro build` (npm run build runs it). public/_headers is the hand-written
// template; this fills in the parts that depend on the build:
//   {script-hashes}   a 'sha256-…' for every inline <script> in the built pages (today: the one line in every
//                     head that adds html.js and the saved text size). Change that line and the hash follows.
//   {style-hashes}    the same for every inline <style>: Astro's inlined CSS, the drawings inlined in the home
//                     page, and the <style> blocks in the hero drawings and the footer's campus map (home.js and
//                     footer.js insert those SVGs into the page, so their styles count as the page's). style-src
//                     has no 'unsafe-inline'.
//   the Early Hints block   one rule per built page, so Cloudflare sends the first-screen fonts as a 103
//                     before the HTML. The font list is read from the home page's preloads (Base.astro).
// It refuses to finish if a page or the hero drawing has a style="" attribute: no hash covers one, so the CSP
// would block it. Scripts set styles through the CSSOM (el.style.x = …) instead, which the CSP allows.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const DIST = 'dist';
// Both lists are read from the built home page, so they can't drift from their sources: the drawings home.js puts
// into the page (the stage's data-hero* addresses, HERO in src/lib/site.ts, the phone cut's dashes included), the one
// footer.js puts in (the footer's data-fc-map, CAMPUS) and the fonts every screen preloads (Base.astro's preloads with
// no media).
const home = readFileSync(join(DIST, 'index.html'), 'utf-8');
const INSERTED = [...home.matchAll(/\sdata-(?:hero[a-z-]*|fc-map)="\/([^"?]+)/g)].map((m) => m[1]);
const FIRST_FONTS = [...home.matchAll(/<link rel="preload" href="(\/assets\/fonts\/[^"]+)"[^>]*>/g)].filter((m) => !/\smedia=/.test(m[0])).map((m) => m[1]);
if (!INSERTED.some((f) => f.includes('hero')) || !INSERTED.some((f) => f.includes('campus')) || !FIRST_FONTS.length) throw new Error('dist/index.html: no data-hero* / data-fc-map drawings or font preloads found');
const HINT = FIRST_FONTS.map((f) => `<${f}>; rel=preload; as=font; type="font/woff2"; crossorigin`).join(', ');

const pages = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith('.html')) pages.push(p);
  }
};
walk(DIST);

const sha = (text) => "'sha256-" + createHash('sha256').update(text).digest('base64') + "'";
const hashes = new Set();
const styles = new Set();
const attrs = [];
const styleBlocks = (file, text) => {
  for (const m of text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) styles.add(sha(m[1]));
  const n = [...text.matchAll(/<[a-zA-Z][^>]*\sstyle=["']/g)].length;   // inside a tag, not prose about one
  if (n) attrs.push(`${relative(DIST, file)} (${n})`);
};
for (const file of pages) {
  const html = readFileSync(file, 'utf-8');
  // every inline script the browser runs: no src, and no type or a script type (JSON-LD and the like run nothing)
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    const type = m[1].match(/\stype=["']?([^"'\s>]+)/)?.[1];
    if (!/\ssrc=/.test(m[1]) && (!type || /^(module|text\/javascript)$/i.test(type))) hashes.add(sha(m[2]));
  }
  styleBlocks(file, html);
}
for (const f of INSERTED) styleBlocks(join(DIST, f), readFileSync(join(DIST, f), 'utf-8'));
if (attrs.length) throw new Error(`style="" attributes the CSP would block: ${attrs.join(', ')}`);

// pages that are served at a path: index.html → /, services/help-desk.html → /services/help-desk (format 'file').
// 404.html is served at any missing address, so no rule can name it; soon is noindex but still a page people see.
const paths = pages
  .filter((f) => !f.endsWith(`${sep}404.html`))
  .map((f) => '/' + relative(DIST, f).split(sep).join('/').replace(/index\.html$/, '').replace(/\.html$/, ''))
  .sort();
const hints = paths.map((p) => `${p}\n  Link: ${HINT}\n`).join('');

const src = readFileSync(join(DIST, '_headers'), 'utf-8');
if (!src.includes('{script-hashes}') || !src.includes('{style-hashes}') || !/# @early-hints[^\n]*\n[\s\S]*?# @end early-hints\n/.test(src)) {
  throw new Error('public/_headers needs the {script-hashes} and {style-hashes} placeholders and the @early-hints block');
}
const out = src
  .replaceAll('{script-hashes}', [...hashes].join(' '))
  .replaceAll('{style-hashes}', [...styles].join(' '))
  .replace(/(# @early-hints[^\n]*\n)[\s\S]*?(# @end early-hints\n)/, `$1${hints}$2`);
writeFileSync(join(DIST, '_headers'), out);

const rules = out.split('\n').filter((l) => /^\S/.test(l) && !l.startsWith('#')).length;
const longest = Math.max(...out.split('\n').map((l) => l.length));
if (rules > 100 || longest > 2000) throw new Error(`_headers over Cloudflare's limits: ${rules} rules (max 100), longest line ${longest} (max 2000)`);
console.log(`_headers: ${hashes.size} script hash(es), ${styles.size} style hash(es), Early Hints for ${paths.length} pages, ${rules} rules, longest line ${longest}`);
