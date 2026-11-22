// Takes the <style> blocks out of the drawing a script inserts into a page (the footer's campus map: the
// data-fc-map address) and out of the drawings written inside a page (the Home hero's layers, Grow), and links them as one
// CSS file per set of pages instead. A <style> block needs its own hash in the CSP, and Cloudflare caps that
// _headers line at 2,000 characters, so a new drawing would grow it; a linked file needs none ('self').
// Runs after svgo() and before head(), which puts Home's linked files back inside Home. The drawings in public/ keep
// their <style>, so `npm run dev` and the drawing tools see them as written.
// Each block is moved as it was: unlayered, so it still wins over the site's layered CSS, as a drawing's own <style>
// did. The generators name each hoisted class after its rules (s-06ced6), so the same name in two drawings is the
// same rules: a block two drawings share is kept once. Two different rules for one selector stop the build.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const STYLE = /<style[^>]*>([\s\S]*?)<\/style>/g;
const INSERTED = /\sdata-fc-map="\/([^"?]+)/g;

/** the top-level blocks of a stylesheet: `sel{…}` and `@media …{…}` */
const blocks = (/** @type {string} */ css) => {
  const out = [];
  let depth = 0;
  let start = 0;
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) {
      out.push(text.slice(start, i + 1).trim());
      start = i + 1;
    }
  }
  if (depth !== 0) throw new Error('drawcss: a drawing <style> has unbalanced braces');
  return out.filter(Boolean);
};

/** @param {string} DIST the built site's folder (dist/) */
export function drawcss(DIST) {
  const pages = readdirSync(DIST, { recursive: true, encoding: 'utf-8' })
    .filter((name) => name.endsWith('.html'))
    .map((name) => ({ name, html: readFileSync(join(DIST, name), 'utf-8') }));

  // which pages use each inserted drawing
  /** @type {Map<string, string[]>} */
  const users = new Map();
  for (const page of pages)
    for (const m of page.html.matchAll(INSERTED)) users.set(m[1], [...(users.get(m[1]) ?? []), page.name]);

  /** @type {Map<string, { css: string[], pages: Set<string> }>} one stylesheet per set of pages */
  const sheets = new Map();
  const add = (/** @type {string[]} */ names, /** @type {string} */ css) => {
    const key = [...new Set(names)].sort().join('|');
    const sheet = sheets.get(key) ?? { css: [], pages: new Set(names) };
    sheet.css.push(css);
    sheets.set(key, sheet);
  };

  for (const [file, names] of users) {
    const svg = readFileSync(join(DIST, file), 'utf-8');
    const css = [...svg.matchAll(STYLE)].map((m) => m[1]);
    if (!css.length) continue;
    css.forEach((c) => add(names, c));
    writeFileSync(join(DIST, file), svg.replace(STYLE, ''));
  }
  // a drawing written inside a page: its <svg>'s <style> blocks
  for (const page of pages) {
    const html = page.html.replace(/<svg\b[\s\S]*?<\/svg>/g, (svg) => {
      for (const m of svg.matchAll(STYLE)) add([page.name], m[1]);
      return svg.replace(STYLE, '');
    });
    if (html !== page.html) page.html = html;
  }

  let moved = 0;
  for (const sheet of sheets.values()) {
    /** @type {Map<string, string>} selector -> its block, for the clash check */
    const seen = new Map();
    const kept = [];
    for (const block of sheet.css.flatMap(blocks)) {
      const sel = block.slice(0, block.indexOf('{')).trim();
      const had = seen.get(sel);
      if (had === block) continue;
      if (had !== undefined && !sel.startsWith('@'))
        throw new Error(`drawcss: two drawings give "${sel}" different rules; rename one class in its generator`);
      seen.set(sel, block);
      kept.push(block);
    }
    const css = kept.join('\n');
    const href = `/_astro/drawings.${createHash('sha256').update(css).digest('hex').slice(0, 8)}.css`;
    writeFileSync(join(DIST, href), css);
    const link = `<link rel="stylesheet" href="${href}">`;
    for (const page of pages)
      if (sheet.pages.has(page.name)) page.html = page.html.replace('</head>', link + '</head>');
    moved += kept.length;
  }
  for (const page of pages) writeFileSync(join(DIST, page.name), page.html);
  console.log(`drawcss: ${moved} drawing rule(s) moved into ${sheets.size} linked file(s)`);
}
