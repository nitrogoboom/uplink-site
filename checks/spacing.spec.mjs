// Off-scale spacing on the built site: every margin, padding and gap that ends up on screen must be a step of the
// space scale (--sp-1 to --sp-9, read from tokens.css) or 0. Stylelint catches a raw value in our CSS; this catches
// the rest: browser defaults nobody reset (a <dl>'s 1em margin, a <button>'s 1px padding) and calc() sums that land
// between steps. Rules: docs/spacing.md. Fails on anything off scale.
// usage: npm run build && npm run serve   (wrangler dev on 8787)   then   npm run verify:spacing [-- --base URL] [PAGE ...]
// Pages default to the sitemap plus /soon and a 404; sizes are the site check's four. Values print as px at a 16px
// root (the browser's default; a visitor's bigger font scales them all).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from '@playwright/test';
import { BASE, ROOT, SIZES, lanes, pages, positional } from './lib.mjs';

const SCALE = [0, ...[...readFileSync(join(ROOT, 'src/styles/tokens.css'), 'utf8').matchAll(/--sp-\d:\s*([\d.]+)rem/g)].map((m) => Number(m[1]) * 16)];
if (SCALE.length < 2) throw new Error('no --sp-* steps in rem found in src/styles/tokens.css: update the SCALE pattern');
// selector -> why it may sit off the scale. Keep this short; fix the CSS instead where you can.
const SKIP = {
  '.sr-only': 'the 1px clip',
  '.fc-cl--two svg': 'optical nudge onto the first text line (footer.css)',
  'select.input': 'room for the arrow: --sp-4 + --icon + --sp-2 (forms.css)',
  '.mi-go': 'margin-left: auto pushes the arrow to the end of its row (home/hero.css)',
  '.svc-hint': 'pulled up under the swiping cards by their bottom padding: -(--sp-4 + --sp-8) (home/services.css)',
  '.grow-cards': "desktop: level with the picture's bottom, above its controls: --tap + --sp-2 (home/grow.css)",
};
const PROPS = ['marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'rowGap', 'columnGap'];
// values above the biggest step are layout (auto margins, a scroll track sized in svh), not spacing
const PROBE = ([scale, props, skip]) => {
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16, max = Math.max(...scale) * rem, out = [];
  const name = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).join('.') : '');
  for (const e of document.body.querySelectorAll('*')) {
    if (e.closest('svg') && e.tagName.toLowerCase() !== 'svg') continue;
    if (skip.some((s) => e.matches(s))) continue;
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.display === 'contents') continue;
    const centred = Math.abs(parseFloat(cs.marginLeft) - parseFloat(cs.marginRight)) < 0.1; // margin-inline: auto
    for (const p of props) {
      const v = Math.abs(parseFloat(cs[p]));
      if (!v || v > max * 1.01 || (centred && /margin(Left|Right)/.test(p))) continue;
      if (!scale.some((s) => Math.abs(v - s * rem) < 0.05)) out.push([name(e), p.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()), Math.round((v / rem) * 100) / 100]);
    }
  }
  return out;
};

test('spacing on scale', async ({ browser }) => {
  test.setTimeout(600_000);
  const paths = positional.length ? positional : await pages(BASE);
  const found = new Map(); // element -> [{property: Set of values}, Set of 'size page']
  const jobs = paths.flatMap((path) => SIZES.map((s) => ({ path, ...s })));
  await lanes(jobs, 6, async ({ path, n, w, h }) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
    const pg = await ctx.newPage();
    await pg.goto(BASE + path, { waitUntil: 'networkidle' });
    for (const [el, prop, v] of await pg.evaluate(PROBE, [SCALE, PROPS, Object.keys(SKIP)])) {
      if (!found.has(el)) found.set(el, [{}, new Set()]);
      const f = found.get(el);
      (f[0][prop] ??= new Set()).add(v);
      f[1].add(`${n} ${path}`);
    }
    await ctx.close();
  });
  const lines = [];
  for (const el of [...found.keys()].sort()) {
    const [props, at] = found.get(el);
    const where = [...at].sort();
    lines.push(
      el + ': ' + Object.keys(props).sort().map((p) => `${p} ${[...props[p]].sort((a, b) => a - b).join('/')}px`).join(', '),
      `    on ${where.length}: ${where.slice(0, 4).join(', ')}${where.length > 4 ? ' ...' : ''}`,
    );
  }
  lines.push(found.size ? `${found.size} element(s) off scale on ${paths.length} pages x ${SIZES.length} sizes` : 'spacing: all on scale');
  console.log(lines.join('\n'));
  if (found.size) throw new Error(lines.join('\n'));
});
