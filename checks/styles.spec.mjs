// Proves a CSS move changed nothing: loads every page from two copies of the built site and compares the computed
// style of every element (and its ::before / ::after) at each screen size. Run it before and after moving CSS around.
// usage: npm run verify:styles -- BEFORE_URL AFTER_URL [PAGE ...]
//   e.g. serve the old build on 8790 (npx wrangler dev --assets OLD_DIST --port 8790) and the new one on 8787, then
//        npm run verify:styles -- http://localhost:8790 http://localhost:8787
// Pages default to the sitemap of AFTER_URL plus /soon and a 404. Animations are frozen (reduced motion) so timing
// can't show up as a difference; the CSP is bypassed so the probe script can run. Fails on any difference.
import { test } from '@playwright/test';
import { lanes, pages, positional } from './lib.mjs';

const SIZES = [
  [390, 844],
  [1280, 720],
  [1440, 900],
  [3440, 1440],
];
// html, body and every element in the body except script/style/link/template (the head's links change when CSS
// moves), in document order: a hash of its computed style, its ::before and its ::after
// (computed url() values are absolute, so the origin is cut out: the two copies run on different ports; and custom
// properties list in no fixed order, so the properties are sorted by name)
const PROBE = (full) => {
  const els = [document.documentElement, document.body, ...document.body.querySelectorAll('*')].filter(
    (e) => !/^(SCRIPT|STYLE|LINK|TEMPLATE)$/.test(e.tagName),
  );
  const o = location.origin;
  const ser = (cs) => {
    const r = [];
    for (let i = 0; i < cs.length; i++) r.push([cs[i], cs.getPropertyValue(cs[i]).split(o).join('')]);
    return r.sort((x, y) => (x[0] < y[0] ? -1 : 1));
  };
  const h = (r) => {
    const s = JSON.stringify(r);
    let x = 5381;
    for (let i = 0; i < s.length; i++) x = (Math.imul(x, 33) ^ s.charCodeAt(i)) >>> 0;
    return x;
  };
  const one = (e) => [null, '::before', '::after'].map((p) => ser(getComputedStyle(e, p)));
  if (full) return full.map((i) => one(els[i]));
  return els.map((e) => [
    e.tagName.toLowerCase() +
      (e.id ? '#' + e.id : '') +
      (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).join('.') : ''),
    ...one(e).map(h),
  ]);
};

test('computed styles match', async ({ browser }) => {
  test.setTimeout(1_800_000);
  const [a, b, ...only] = positional;
  if (!a || !b) throw new Error('usage: npm run verify:styles -- BEFORE_URL AFTER_URL [PAGE ...]');
  const paths = only.length ? only : await pages(b.replace(/\/$/, ''));

  // the page's styles once two readings half a second apart agree (scripts finish their setup late under load)
  const settled = async (pg, url) => {
    await pg.goto(url, { waitUntil: 'networkidle' });
    await pg.evaluate(() => document.fonts.ready);
    let last = JSON.stringify(await pg.evaluate(PROBE, null));
    for (let i = 0; i < 20; i++) {
      await pg.waitForTimeout(500);
      const now = JSON.stringify(await pg.evaluate(PROBE, null));
      if (now === last) break;
      last = now;
    }
    return JSON.parse(last);
  };

  // one browser context per page pair
  const compare = async (w, h, path) => {
    const ctx = await browser.newContext({
      viewport: { width: w, height: h },
      reducedMotion: 'reduce',
      bypassCSP: true,
    });
    const [pa, pb] = [await ctx.newPage(), await ctx.newPage()];
    const [ea, eb] = await Promise.all([settled(pa, a + path), settled(pb, b + path)]);
    const out = [];
    let n;
    if (JSON.stringify(ea.map((e) => e[0])) !== JSON.stringify(eb.map((e) => e[0]))) {
      out.push(
        `${w}x${h} ${path}: the pages differ in markup (${ea.length} vs ${eb.length} elements); compare the HTML first`,
      );
      n = 1;
    } else {
      const bad = ea
        .map((x, i) => (JSON.stringify(x.slice(1)) !== JSON.stringify(eb[i].slice(1)) ? i : -1))
        .filter((i) => i >= 0);
      n = bad.length;
      if (bad.length) {
        const [fa, fb] = await Promise.all([
          pa.evaluate(PROBE, bad.slice(0, 20)),
          pb.evaluate(PROBE, bad.slice(0, 20)),
        ]);
        out.push(`${w}x${h} ${path}: ${bad.length} element(s) differ`);
        bad.slice(0, 20).forEach((i, j) => {
          ['', '::before', '::after'].forEach((part, k) => {
            const px = Object.fromEntries(fa[j][k]),
              py = Object.fromEntries(fb[j][k]);
            const ch = [...new Set([...Object.keys(px), ...Object.keys(py)])]
              .sort()
              .filter((p) => px[p] !== py[p])
              .map((p) => `${p}: ${px[p]} -> ${py[p]}`);
            if (ch.length)
              out.push(`    ${ea[i][0]}${part}: ` + ch.slice(0, 6).join('; ') + (ch.length > 6 ? ' …' : ''));
          });
        });
      }
    }
    await ctx.close();
    if (out.length) console.log(out.join('\n'));
    return n;
  };

  let diffs = 0;
  for (const [w, h] of SIZES) {
    diffs += (await lanes(paths, 6, (path) => compare(w, h, path))).reduce((x, y) => x + y, 0);
    console.log(`${w}x${h}: ${paths.length} pages compared`);
  }
  console.log(`${diffs} difference(s)`);
  if (diffs) throw new Error(`${diffs} difference(s): the lines above say where`);
});
