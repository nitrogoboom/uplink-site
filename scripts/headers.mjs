// Finishes dist/_headers after `astro build` (npm run build runs it). public/_headers is the hand-written
// template; this fills in the parts that depend on the build:
//   {script-hashes}   a 'sha256-…' for every inline <script> in the built pages (today: the one-line
//                     classList.add('js') in every head). Change that line and the hash follows.
//   {style-hashes}    the same for every inline <style>: Astro's inlined CSS, the drawings inlined in the home
//                     page, and the <style> blocks in the hero drawings (home.js inserts those SVGs into the page,
//                     so their styles count as the page's). style-src has no 'unsafe-inline'.
//   the Early Hints block   one rule per built page, so Cloudflare sends the first-screen fonts as a 103
//                     before the HTML. The font list is FIRST_FONTS below and must match Base.astro's preloads.
// It refuses to finish if a page or the hero drawing has a style="" attribute: no hash covers one, so the CSP
// would block it. Scripts set styles through the CSSOM (el.style.x = …) instead, which the CSP allows.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const DIST = 'dist';
// drawings a script puts into the page (home.js: the hero's three cuts, HERO in src/lib/site.ts, and the phone cut's dashes)
const INSERTED = ['assets/img/hero-office.svg', 'assets/img/hero-office-tablet.svg', 'assets/img/office-compact-build.svg', 'assets/img/office-compact-flows.svg'];
const FIRST_FONTS = ['barlow-condensed-700-italic', 'barlow-condensed-700', 'barlow-400', 'barlow-600'];
const HINT = FIRST_FONTS.map((f) => `</assets/fonts/${f}.woff2>; rel=preload; as=font; type="font/woff2"; crossorigin`).join(', ');

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
const noindex = [];
const styleBlocks = (file, text) => {
  for (const m of text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) styles.add(sha(m[1]));
  const n = [...text.matchAll(/<[a-zA-Z][^>]*\sstyle=["']/g)].length;   // inside a tag, not prose about one
  if (n) attrs.push(`${relative(DIST, file)} (${n})`);
};
for (const file of pages) {
  const html = readFileSync(file, 'utf-8');
  for (const m of html.matchAll(/<script(?![^>]*\b(?:src|type)=)[^>]*>([\s\S]*?)<\/script>/g)) hashes.add(sha(m[1]));
  styleBlocks(file, html);
  if (/<meta name="robots" content="[^"]*noindex/.test(html)) noindex.push(file);
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
