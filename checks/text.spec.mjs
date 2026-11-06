// Text size check (WCAG 1.4.4 with technique G178, the Settings pop-up): every page at every size with the text at
// 200% (localStorage uplink.text, as the pop-up saves it), looking for what W3C's failure F69 names: text that is
// clipped (partly cut by a box that hides its overflow), overlapping (drawn over other text), or out of reach (above
// or left of the page, where nothing scrolls to it), and sideways scroll. Pages are read as they load, and Home also
// with its Grow section at each of its six steps (picked with its dots); a label that only slides in on hover (home
// services' "View service") is not seen in its shown state. Text in drawings (SVG), hidden and screen-reader-only
// text, and things faded out (the Grow steps not open) are left out. Text in a bar (the sticky header, the phone tab
// bar) is checked against its own bar only, not against the page that scrolls under it; a fixed bar's text is also
// checked against the screen's edges.
// One test per page and size; each fails on any finding.
// usage: npm run build && npm run serve   (wrangler dev on 8787)   then   npm run verify:text [-- --text 2] [--base URL]
//   --text 1 runs the same check at the default size (it should find nothing: a check on the check)
import { test } from '@playwright/test';
import { BASE, SIZES, option, pad, pages } from './lib.mjs';

const TEXT = option('--text', '2');
const PATHS = await pages(BASE);

const PROBE = () => {
  const out = { clip: [], over: [], away: [], sideways: document.documentElement.scrollWidth - innerWidth };
  const name = (el) => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const fixed = (el) => { for (let a = el; a; a = a.parentElement) if (getComputedStyle(a).position === 'fixed') return true; return false; };
  // the bar a text sits in, if any: the sticky header or a fixed bar (the phone tab bar), which the page scrolls under
  const layer = (el) => el.closest('.site-header') || (fixed(el) ? 'fixed' : null);
  const skip = (el) => {
    if (el.closest('svg, script, style, template, dialog:not([open]), .sr-only, .toasts, .skip-link')) return true;
    if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return true;
    for (let a = el; a; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (+cs.opacity < 0.05) return true;
      if (a.offsetWidth <= 1 && a.offsetHeight <= 1 && cs.overflow !== 'visible') return true; // a 1px screen-reader clip
      if (cs.clipPath && cs.clipPath.startsWith('inset(50%')) return true;
    }
    return false;
  };
  const boxes = [];
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.nodeValue.trim() ? 1 : 2) });
  for (let n, i = 0; (n = walk.nextNode()); i++) {
    const el = n.parentElement;
    if (!el || skip(el)) continue;
    const r = document.createRange(); r.selectNodeContents(n);
    const fx = fixed(el), ly = layer(el);
    for (const b of r.getClientRects()) if (b.width > 2 && b.height > 2) boxes.push({ n: i, el, b, fx, ly, t: n.nodeValue.trim().slice(0, 28) });
  }
  const sy = scrollY, sx = scrollX;
  for (const x of boxes) {
    // out of reach: above or left of the page's start (a fixed bar's text: off the screen)
    if (x.fx ? x.b.top < -2 || x.b.left < -2 || x.b.right > innerWidth + 2 || x.b.bottom > innerHeight + 2 : x.b.top + sy < -2 || x.b.left + sx < -2) out.away.push(`${name(x.el)} "${x.t}" at ${Math.round(x.b.left + sx)},${Math.round(x.b.top + sy)}`);
    // clipped: a box between the text and the page hides overflow and the text runs past its edge. Text wholly
    // outside the box is tucked away on purpose (a label that slides in on hover or focus), not cut: left out
    for (let a = x.el; a && a !== document.body; a = a.parentElement) {
      const cs = getComputedStyle(a);
      const hx = /hidden|clip/.test(cs.overflowX), hy = /hidden|clip/.test(cs.overflowY);
      if (!hx && !hy) continue;
      const c = a.getBoundingClientRect();
      if (x.b.right <= c.left || x.b.left >= c.right || x.b.bottom <= c.top || x.b.top >= c.bottom) break;
      const past = Math.max(hx ? Math.max(c.left - x.b.left, x.b.right - c.right) : 0, hy ? Math.max(c.top - x.b.top, x.b.bottom - c.bottom) : 0);
      if (past > 2) { out.clip.push(`${name(x.el)} "${x.t}" cut ${Math.round(past)}px by ${name(a)}`); break; }
    }
  }
  // overlapping: the middle of two lines of text (the top and bottom quarter are left out: glyph boxes are taller than
  // tight line-heights, so lines of one heading touch there without the letters meeting)
  const core = (b) => ({ l: b.left, r: b.right, t: b.top + b.height * 0.25, b: b.bottom - b.height * 0.25 });
  for (let i = 0; i < boxes.length; i++) {
    const A = boxes[i], a = core(A.b);
    for (let j = i + 1; j < boxes.length; j++) {
      const B = boxes[j];
      // the same text node's own lines, or a bar and the page: content scrolls under the header and tab bar by design
      if (A.n === B.n || A.ly !== B.ly) continue;
      const b = core(B.b);
      const w = Math.min(a.r, b.r) - Math.max(a.l, b.l), h = Math.min(a.b, b.b) - Math.max(a.t, b.t);
      if (w > 2 && h > 2) out.over.push(`${name(A.el)} "${A.t}" / ${name(B.el)} "${B.t}"`);
    }
  }
  return out;
};

test.describe(`text at ${Math.round(Number(TEXT) * 100)}%`, () => {
  for (const path of PATHS) {
    for (const { n, w, h } of SIZES) {
      test(`${path} ${n}`, async ({ browser }) => {
        test.setTimeout(180_000);
        const ctx = await browser.newContext({ viewport: { width: w, height: h } });
        await ctx.addInitScript((t) => {
          try {
            localStorage.setItem('uplink.text', t);
          } catch {
            /* no storage: the default size */
          }
        }, TEXT);
        const pg = await ctx.newPage();
        await pg.goto(BASE + path, { waitUntil: 'networkidle' });
        await pg.waitForTimeout(600);
        const r = await pg.evaluate(PROBE);
        // the home Grow section shows one step's card and tags at a time: open each with its dot and read it
        const dots = await pg.evaluate(() => document.querySelectorAll('#grow .grow-dot').length);
        for (let i = 0; i < dots; i++) {
          await pg.evaluate((i) => {
            const g = document.querySelector('#grow');
            g.scrollIntoView();
            g.querySelectorAll('.grow-dot')[i].click();
          }, i);
          await pg.waitForTimeout(3000);
          const s = await pg.evaluate(PROBE);
          for (const k of ['clip', 'over']) r[k].push(...s[k].filter((x) => !r[k].includes(x)).map((x) => `(Grow step ${i + 1}) ${x}`));
        }
        await ctx.close();
        const found = [
          ...['clip', 'over', 'away'].filter((k) => r[k].length).map((k) => `${r[k].length} ${k}`),
          ...(r.sideways > 0 ? [`${r.sideways}px sideways`] : []),
        ];
        const lines = [`${pad(path, 28)} ${pad(n, 6)} ` + (found.length ? found.join(', ') : 'ok')];
        for (const k of ['clip', 'over', 'away']) {
          lines.push(...r[k].slice(0, 4).map((x) => `    ${k}: ${x}`));
          if (r[k].length > 4) lines.push(`    ${k}: … ${r[k].length - 4} more`);
        }
        console.log(lines.join('\n'));
        if (found.length) throw new Error(lines.join('\n'));
      });
    }
  }
});
