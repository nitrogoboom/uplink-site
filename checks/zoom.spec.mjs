// Zoom check (WCAG 1.4.4 resize text, 1.4.10 reflow; review C1): pages at browser zoom and at a bigger default font,
// looking for what W3C's failure F69 names. The cases and what fails: README, "Site checks"; the details sit beside
// CASES and PROBE below. Known failures are marked test.fail with the review item that fixes them (KNOWN, below).
// usage: npm run build && npm run serve   then   npm run verify:zoom [-- --all] [--base URL]
//   (npm run verify runs it too, after the site check)
import { test } from '@playwright/test';
import { BASE, MISSING, flag, pad, pages } from './lib.mjs';

// Cases: a 1280 x 720 laptop at 100% (the shortest one-screen desktop: its sections grow past one screen rather than
// cut their words); 200% zoom on a 1280 x 720 laptop, a 1920 x 1080 and a 2560 x 1440 desktop and an 820 x 1180 tablet (the
// phone layout, 410 CSS pixels wide); 400% zoom on a 1280 x 1024 desktop (320 x 256 CSS pixels, the reflow case WCAG
// names); a 20px default font on a 430 x 932 phone, 24px on a 1920 x 1080 desktop and 32px on a 2560 x 1440 one (both
// wide enough for the one-screen layout at that font). Each case keeps at least 20em (320px at 16px) of width, the
// narrowest the site checks: a phone at 200% zoom or with a 24px font is narrower than that (notes.md).
// Pages: Home, Services, a service page, About, Contact, Work and Privacy (a table); --all: every page the build wrote.
const CASES = [
  { n: '1280x720', w: 1280, h: 720 },
  { n: '1280x720 zoom 200%', w: 1280, h: 720, zoom: 2 },
  { n: '1920x1080 zoom 200%', w: 1920, h: 1080, zoom: 2 },
  { n: '2560x1440 zoom 200%', w: 2560, h: 1440, zoom: 2 },
  { n: '1280x1024 zoom 400%', w: 1280, h: 1024, zoom: 4 },
  { n: '820x1180 zoom 200%', w: 820, h: 1180, zoom: 2 },
  { n: '430x932 font 20', w: 430, h: 932, font: 20 },
  { n: '1920x1080 font 24', w: 1920, h: 1080, font: 24 },
  { n: '2560x1440 font 32', w: 2560, h: 1440, font: 32 },
];
const SOME = ['/', '/services', '/services/security', '/about', '/contact', '/work', '/privacy'];
const PATHS = flag('--all') ? await pages(BASE) : SOME;
/** @type {Record<string, string>} */
const KNOWN = {};

// For each page and case below, it fails on:
//   root size     the root font size (1rem) is not the default font size: 16px, or the 24px or 32px set
//   text growth   at zoom, body text on screen is not at least (zoom) times its size at 100% on the same screen
//   clipped       text partly cut by a box that hides its overflow (text wholly outside the box is tucked away on
//                 purpose, a label that slides in on hover: left out)
//   overlapping   the middle half of two lines of text drawn over each other
//   out of reach  text or a control (link, button, field) above or left of the page's start, where nothing scrolls
//                 to it; in a fixed bar (the phone tab bar), off the screen
//   sideways      the page is wider than the screen
// Text in drawings (SVG), hidden and screen-reader-only text, and things faded out are left out. Text in a bar (the
// sticky header, the phone tab bar) is checked against its own bar only, not against the page that scrolls under it.
// Home is also read with its Grow section at each of its steps (picked with its dots).
// runs in the page: the findings, and the size of body text and the root
const PROBE = () => {
  const out = { clip: [], over: [], away: [], sideways: document.documentElement.scrollWidth - innerWidth };
  const name = (el) =>
    el.tagName.toLowerCase() +
    (el.className && typeof el.className === 'string'
      ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
      : '');
  const fixed = (el) => {
    for (let a = el; a; a = a.parentElement) if (getComputedStyle(a).position === 'fixed') return true;
    return false;
  };
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
  const sy = scrollY,
    sx = scrollX;
  const off = (b, fx) =>
    fx
      ? b.top < -2 || b.left < -2 || b.right > innerWidth + 2 || b.bottom > innerHeight + 2
      : b.top + sy < -2 || b.left + sx < -2;
  const boxes = [];
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.nodeValue.trim() ? 1 : 2),
  });
  for (let n, i = 0; (n = walk.nextNode()); i++) {
    const el = n.parentElement;
    if (!el || skip(el)) continue;
    const r = document.createRange();
    r.selectNodeContents(n);
    const fx = fixed(el),
      ly = layer(el);
    for (const b of r.getClientRects())
      if (b.width > 2 && b.height > 2) boxes.push({ n: i, el, b, fx, ly, t: n.nodeValue.trim().slice(0, 28) });
  }
  for (const x of boxes) {
    if (off(x.b, x.fx))
      out.away.push(`${name(x.el)} "${x.t}" at ${Math.round(x.b.left + sx)},${Math.round(x.b.top + sy)}`);
    for (let a = x.el; a && a !== document.body; a = a.parentElement) {
      const cs = getComputedStyle(a);
      const hx = /hidden|clip/.test(cs.overflowX),
        hy = /hidden|clip/.test(cs.overflowY);
      if (!hx && !hy) continue;
      const c = a.getBoundingClientRect();
      if (x.b.right <= c.left || x.b.left >= c.right || x.b.bottom <= c.top || x.b.top >= c.bottom) break;
      const past = Math.max(
        hx ? Math.max(c.left - x.b.left, x.b.right - c.right) : 0,
        hy ? Math.max(c.top - x.b.top, x.b.bottom - c.bottom) : 0,
      );
      if (past > 2) {
        out.clip.push(`${name(x.el)} "${x.t}" cut ${Math.round(past)}px by ${name(a)}`);
        break;
      }
    }
  }
  // controls with no text of their own (icon buttons, fields) must be in reach too
  for (const el of document.querySelectorAll(
    'a[href], button, input:not([type="hidden"]), select, textarea, summary',
  )) {
    if (skip(el)) continue;
    const b = el.getBoundingClientRect();
    if (b.width > 2 && b.height > 2 && off(b, fixed(el)))
      out.away.push(`${name(el)} (control) at ${Math.round(b.left + sx)},${Math.round(b.top + sy)}`);
  }
  // the top and bottom quarter of each line are left out: glyph boxes are taller than tight line heights, so lines of
  // one heading touch there without the letters meeting
  const core = (b) => ({ l: b.left, r: b.right, t: b.top + b.height * 0.25, b: b.bottom - b.height * 0.25 });
  for (let i = 0; i < boxes.length; i++) {
    const A = boxes[i],
      a = core(A.b);
    for (let j = i + 1; j < boxes.length; j++) {
      const B = boxes[j];
      if (A.n === B.n || A.ly !== B.ly) continue; // a text's own lines; a bar and the page (it scrolls under the bars)
      const b = core(B.b);
      const w = Math.min(a.r, b.r) - Math.max(a.l, b.l),
        h = Math.min(a.b, b.b) - Math.max(a.t, b.t);
      if (w > 2 && h > 2) out.over.push(`${name(A.el)} "${A.t}" / ${name(B.el)} "${B.t}"`);
    }
  }
  return out;
};
// body text: the first paragraph in <main> that isn't a small label
const SIZE = () => {
  const p = [...document.querySelectorAll('main p')].find(
    (e) => !e.closest('.eyebrow, .small, svg') && e.checkVisibility(),
  );
  return {
    root: parseFloat(getComputedStyle(document.documentElement).fontSize),
    body: p ? parseFloat(getComputedStyle(p).fontSize) : 0,
  };
};

// two frames on: what the page lays out from script (ResizeObserver, a picked step) is in place. Motion is reduced.
const FRAMES = () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));

// Browser zoom as the browser does it: a screen of (screen ÷ zoom) CSS pixels drawn at (zoom) device pixels each. The
// default font is the browser setting (Chrome: Settings, Appearance, Font size), set over the DevTools protocol.
async function open(browser, path, { w, h, zoom = 1, font }) {
  const ctx = await browser.newContext({
    viewport: { width: Math.round(w / zoom), height: Math.round(h / zoom) },
    deviceScaleFactor: zoom,
    reducedMotion: 'reduce',
  });
  const pg = await ctx.newPage();
  if (font) {
    const cdp = await ctx.newCDPSession(pg);
    await cdp.send('Page.setFontSizes', { fontSizes: { standard: font } });
  }
  await pg.goto(BASE + path, { waitUntil: 'networkidle' });
  await pg.evaluate(() => document.fonts.ready);
  await pg.evaluate(FRAMES);
  return { ctx, pg };
}

for (const path of PATHS) {
  for (const c of CASES) {
    test(`zoom ${path} ${c.n}`, async ({ browser }) => {
      const known = KNOWN[`${path} ${c.n}`];
      test.fail(!!known, known);
      const where = path.endsWith(MISSING) ? '404' : path;
      const found = [];
      const { ctx, pg } = await open(browser, path, c);
      const size = await pg.evaluate(SIZE);
      const want = c.font || 16;
      if (Math.abs(size.root - want) > 0.05) found.push(`root font ${size.root}px, not the default ${want}px`);
      if (c.zoom) {
        const plain = await open(browser, path, { w: c.w, h: c.h });
        const at100 = await plain.pg.evaluate(SIZE);
        await plain.ctx.close();
        // on screen, in device pixels: CSS px × zoom
        const ratio = (size.body * c.zoom) / at100.body;
        if (ratio < c.zoom * 0.98)
          found.push(
            `body text ${at100.body}px at 100%, ${size.body}px at ${c.zoom * 100}%: ${Math.round(ratio * 100)}% on screen, not ${c.zoom * 100}%`,
          );
      }
      const r = await pg.evaluate(PROBE);
      // Home's Grow section shows one step's card and tags at a time: open each with its dot and read it
      const dots = await pg.evaluate(() => document.querySelectorAll('#grow .grow-dot').length);
      for (let i = 0; i < dots; i++) {
        await pg.evaluate((i) => {
          const g = document.querySelector('#grow');
          g.scrollIntoView();
          g.querySelectorAll('.grow-dot')[i].click();
        }, i);
        await pg.evaluate(FRAMES);
        const s = await pg.evaluate(PROBE);
        for (const k of ['clip', 'over', 'away'])
          r[k].push(...s[k].filter((x) => !r[k].includes(x)).map((x) => `(Grow step ${i + 1}) ${x}`));
        r.sideways = Math.max(r.sideways, s.sideways);
      }
      await ctx.close();
      found.push(...['clip', 'over', 'away'].filter((k) => r[k].length).map((k) => `${r[k].length} ${k}`));
      if (r.sideways > 0) found.push(`${r.sideways}px sideways`);
      const lines = [
        `${pad(where, 20)} ${pad(c.n, 20)} root ${size.root}px body ${size.body}px  ` +
          (found.length ? found.join(', ') : 'ok'),
      ];
      for (const k of ['clip', 'over', 'away']) {
        lines.push(...r[k].slice(0, 4).map((x) => `    ${k}: ${x}`));
        if (r[k].length > 4) lines.push(`    ${k}: … ${r[k].length - 4} more`);
      }
      console.log(lines.join('\n'));
      if (found.length) throw new Error(lines.join('\n'));
    });
  }
}

// Headings and big numbers on screen as zoom goes up (review C1: "at 150% the Home h1 is smaller than at 100%"). Every
// h1, h2, stat number and footer heading, at 110, 125, 150, 175 and 200% on four desktop screens: on screen (CSS px x
// zoom) it is at least as big as at the step before, so no step of zoom makes it smaller, and at 200% it is at least
// FLOOR times its size at 100%. A heading may size to its column (cqi) or the screen's width (the vw slope of --fs-7
// and --fs-8), but a narrower column at zoom must never undo the zoom. Each run prints the least and most growth at
// 200% (200% where the heading is at its rem cap at half the width).
const STEPS = [1, 1.1, 1.25, 1.5, 1.75, 2];
const FLOOR = 1.5;
const HEADS = () => {
  const out = {};
  for (const e of document.querySelectorAll('main h1, main h2, main .stat-val, .fc-head h3')) {
    if (!e.checkVisibility({ opacityProperty: true, visibilityProperty: true }) || e.closest('svg, .sr-only')) continue;
    const k = `${e.tagName.toLowerCase()} "${e.textContent.trim().replace(/\s+/g, ' ').slice(0, 30)}"`;
    if (!(k in out)) out[k] = parseFloat(getComputedStyle(e).fontSize);
  }
  return out;
};
for (const path of PATHS) {
  for (const [w, h] of [
    [1280, 720],
    [1440, 900],
    [1920, 1080],
    [2560, 1440],
  ]) {
    test(`headings grow with zoom ${path} ${w}x${h}`, async ({ browser }) => {
      const at = [];
      for (const z of STEPS) {
        const { ctx, pg } = await open(browser, path, { w, h, zoom: z });
        at.push(await pg.evaluate(HEADS));
        await ctx.close();
      }
      const px = (i, k) => Math.round(at[i][k] * STEPS[i] * 10) / 10; // on screen
      const found = [],
        two = [];
      for (const [k, one] of Object.entries(at[0])) {
        let last = 0; // the step it was last seen at
        STEPS.forEach((z, i) => {
          if (!i || !(k in at[i])) return;
          if (px(i, k) < px(last, k) * 0.99)
            found.push(
              `${k}: ${px(last, k)}px on screen at ${Math.round(STEPS[last] * 100)}%, ${px(i, k)}px at ${Math.round(z * 100)}%`,
            );
          last = i;
        });
        if (k in at[5]) {
          two.push(Math.round((px(5, k) / one) * 100));
          if (px(5, k) < one * FLOOR * 0.99)
            found.push(`${k}: ${one}px at 100%, ${px(5, k)}px on screen at 200% (under ${FLOOR * 100}%)`);
        }
      }
      const line = `${pad(path, 20)} ${w}x${h}  at 200%: ${two.length ? `${Math.min(...two)}% to ${Math.max(...two)}%` : '-'}`;
      console.log(line);
      if (found.length) throw new Error(`${line}\n    ${found.join('\n    ')}`);
    });
  }
}
