// PARKED tests: moved here verbatim from checks/site.spec.mjs on November 9, 2026 (review "Checks and tests":
// docs/history/recommendations-fable-5.2-2026-11-09.md). Each pins today's layout, which the redesign and the real
// content will change, so each would break on purpose then. No Playwright project and no CI job runs this folder
// (checks/playwright.config.mjs matches each check's own *.spec.mjs file); lint still reads it, so it stays valid.
// To bring one back: move the test (and the constants above it) back into checks/site.spec.mjs and fix it for the
// new layout. The line marked PARKED above each test says why it's here and when to bring it back.
import { join } from 'node:path';
import { test } from '@playwright/test';
import { BASE, ROOT, lanes, option, verdict, watch } from '../lib.mjs';

const OUT = join(ROOT, option('--out', 'out'));
const url = (page) => `${BASE}/${page === 'index' ? '' : page}`;

// PARKED: pins Home's 1440 footer (six tiles, one screen tall, a map label and camera per section); bring back, rewritten, when the real footer and hero land. It also held M6 (the map out of the accessibility tree) and Grow playing on its own.
test('index 1440: hero, Grow, footer tiles', async ({ browser }) => {
  const fails = [];
  const errs = [];
  const rep = [];
  const pg = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  watch(pg, 'index 1440 (hero, grow, footer)', errs);
  await pg.goto(BASE + '/');
  await pg.waitForTimeout(5500);
  // hover a tile three along from the one showing, so the cloud's own timer can't have got there first
  const tiles = await pg.$$eval('.ob-tile', (t) => t.map((x) => [x.dataset.tile, x.classList.contains('is-on')]));
  const on = Math.max(
    0,
    tiles.findIndex(([, o]) => o),
  );
  const want = tiles[(on + 3) % tiles.length][0];
  const before = await pg.$eval('.ob-app', (e) => e.textContent);
  await pg.locator(`.ob-tile[data-tile="${want}"]`).first().hover({ force: true });
  await pg.waitForTimeout(500);
  const after = await pg.$eval('.ob-app', (e) => e.textContent);
  const lit = await pg.$eval(`.ob-tile[data-tile="${want}"]`, (e) => e.classList.contains('is-on'));
  rep.push(`hero tile hover (${want}): ${before} -> ${after}`);
  if (!lit || after === before) fails.push(`hero: hovering the ${want} tile did not show it (${before} -> ${after})`);
  // the Grow section plays on its own once it's on screen (a step every 4.5 s): a few seconds in, its first steps are
  // built; then the last dot jumps to the end, where every part shows
  await pg.$eval('#grow', (e) => e.scrollIntoView());
  await pg.waitForTimeout(6000);
  const probe = () => {
    const pcs = [...document.querySelectorAll('#grow .pc')];
    const on = document.querySelector('#grow .grow-dot[aria-current="step"]');
    return {
      built: pcs.filter((p) => !p.classList.contains('hide')).length,
      total: pcs.length,
      step: on ? Number(on.dataset.i) : -1,
    };
  };
  let g = await pg.evaluate(probe);
  rep.push(`grow playing: step ${g.step + 1}, ${g.built} of ${g.total} parts built`);
  if (g.total === 0 || g.built === 0 || g.step < 1)
    fails.push(`grow: didn't play on its own (step ${g.step + 1}, ${g.built} of ${g.total} parts built)`);
  await pg.locator('#grow :is(.grow-dot, .grow-item):visible').last().click(); // the last step: the list on desktop, the dots below
  await pg.waitForTimeout(300);
  g = await pg.evaluate(probe);
  rep.push(`grow last dot: step ${g.step + 1}, ${g.built} of ${g.total} parts`);
  if (g.built !== g.total) fails.push(`grow: the last dot left ${g.total - g.built} parts unbuilt`);
  // footer behaviour on home at 1440
  await pg.$eval('#footer', (e) => e.scrollIntoView());
  await pg.waitForTimeout(400);
  // the map is fetched as the footer comes near (footer.js): wait for it, as a slow CI machine can take over a second
  await pg
    .waitForSelector('svg.fc-w', { state: 'attached', timeout: 15000 })
    .catch(() => fails.push('footer: the campus map never loaded'));
  // review M6: the map is decoration (the footer's own words say what it shows), so the inserted map stays out of the
  // accessibility tree: aria-hidden, no role or name, and nothing of it in the map box's tree but the hold button
  const mapA11y = await pg
    .$eval('svg.fc-w', (s) => ['aria-hidden', 'role', 'aria-label'].map((a) => `${a}=${s.getAttribute(a)}`).join(' '))
    .catch(() => '');
  const mapTree = await pg
    .locator('.fc-map')
    .ariaSnapshot()
    .catch(() => '');
  if (mapA11y && (mapA11y !== 'aria-hidden=true role=null aria-label=null' || /\bimg\b/.test(mapTree)))
    fails.push(
      `footer: the campus map is in the accessibility tree (${mapA11y}; tree: ${mapTree.replace(/\s+/g, ' ')}) (review M6)`,
    );
  // each tile (a <details>' summary, Footer.astro) opens its section: one screen tall, its panel above the tile row
  // and not cut off, and the map's label and camera move to its spot
  const fcTiles = pg.locator('.fc-tile');
  const n = await fcTiles.count();
  if (n !== 6) fails.push(`footer: ${n} tiles (.fc-tile), not 6`);
  const seen = { hud: new Set(), vb: new Set() };
  for (let i = 0; i < n; i++) {
    await fcTiles.nth(i).click();
    await pg.waitForTimeout(850);
    const info = await pg.evaluate(() => {
      const f = document.getElementById('footer');
      const open = [...document.querySelectorAll('.fc-sec[open]')];
      const p = open[0]?.querySelector('.fc-panel');
      const r = p ? p.getBoundingClientRect() : null;
      const hud = [...document.querySelectorAll('.fc-hud-l')].filter((e) => e.getClientRects().length);
      return {
        h: f.offsetHeight,
        fold: innerHeight - document.querySelector('.site-header').offsetHeight,
        open: open.map((d) => d.id),
        map: open[0]?.dataset.map,
        panelH: r ? Math.round(r.height) : 0,
        over: p
          ? Math.max(
              p.scrollHeight - p.clientHeight,
              Math.ceil(r.bottom - document.querySelector('.fc-tile').getBoundingClientRect().top),
            )
          : 0,
        hud: hud.map((e) => e.querySelector('b').textContent).join(' | '),
        vb: document.querySelector('svg.fc-w')?.getAttribute('viewBox'),
      };
    });
    rep.push(`tile ${i}: ${JSON.stringify(info)}`);
    if (info.open.length !== 1 || info.panelH < 50)
      fails.push(`footer tile ${i} at 1440: open ${JSON.stringify(info.open)}, panel ${info.panelH}px tall`);
    if (Math.abs(info.h - info.fold) > 1)
      fails.push(`footer tile ${i} at 1440: ${info.h}px tall, the screen below the header is ${info.fold}px`);
    if (info.over > 0) fails.push(`footer tile ${i} at 1440: panel overflows by ${info.over}px`);
    seen.hud.add(info.hud);
    seen.vb.add(info.vb);
    await pg.screenshot({ path: join(OUT, `f-1440-${i}.png`) });
  }
  if (seen.hud.size !== n || [...seen.hud].some((h) => !h || h.includes('|')))
    fails.push(`footer: the map's label didn't name one spot per section: ${[...seen.hud].join(' / ')}`);
  if (seen.vb.size !== n)
    fails.push(`footer: the map's camera didn't move to each section's spot (${seen.vb.size} views for ${n} sections)`);
  // shut the open one: Contact opens again (footer.js), shows, and its tile looks picked
  await fcTiles.nth(n - 1).click();
  await pg.waitForTimeout(500);
  const none = await pg.evaluate(() => {
    const p = document.querySelector('.fc-sec:first-of-type .fc-panel');
    return {
      open: [...document.querySelectorAll('.fc-sec[open]')].map((d) => d.id),
      contact: p.getBoundingClientRect().height,
      tile: getComputedStyle(document.querySelector('.fc-tile')).borderTopWidth,
    };
  });
  rep.push(`after shutting the open section: ${JSON.stringify(none)}`);
  if (none.open.join() !== 'fc-contact' || none.contact < 50 || none.tile !== '2px')
    fails.push(`footer after shutting the open section doesn't show Contact, open and picked: ${JSON.stringify(none)}`);
  await pg.close();
  console.log(rep.join('\n'));
  verdict([...fails, ...errs]);
});

// header fit: at every 10px from 320 to 1440 (and four wider screens), the tabs keep 8px clear of the logo and the
// buttons and don't scroll, and nothing scrolls sideways. Room for a new header button has to be made in
// bottom-nav.css (its measured rules), not found here later.
// PARKED: pins today's header at every 10px (bottom-nav.css's comments cite it); bring back when the header's final tabs and buttons are set.
test('header fit', async ({ browser }) => {
  const fails = [];
  const q = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await q.goto(url('about'));
  let worst = null;
  const widths = [...Array.from({ length: 113 }, (_, i) => 320 + i * 10), 1600, 1920, 2560, 3440];
  for (const w of widths) {
    await q.setViewportSize({ width: w, height: 900 });
    await q.waitForTimeout(60);
    const r = await q.evaluate(() => {
      const t = document.querySelector('.tabs'),
        u = t.querySelector('ul').getBoundingClientRect(),
        b = document.querySelector('.brand').getBoundingClientRect(),
        a = document.querySelector('.hdr-actions').getBoundingClientRect();
      const on = getComputedStyle(t).display !== 'none';
      return {
        room: Math.round(on ? Math.min(u.left - b.right, a.left - u.right) : a.left - b.right),
        cut: on ? t.scrollWidth - t.clientWidth : 0,
        side: document.documentElement.scrollWidth - innerWidth,
      };
    });
    if (worst === null || r.room < worst[1]) worst = [w, r.room];
    if (r.room < 8 || r.cut > 0 || r.side > 0)
      fails.push(`header at ${w}px: ${r.room}px room, tabs cut ${r.cut}px, sideways ${r.side}px`);
  }
  console.log(`header fit: tightest ${worst[1]}px at ${worst[0]}px wide`);
  await q.close();
  verdict(fails);
});

// C1 (layout phase 4: text in rem, the room round it from the screen). Home on desktop windows people use: the hero's
// menu and news cards are on the first screen. The hero's news cards at 1100 to 1240 wide (where the
// office column is narrowest): no word in a card split across lines, and the words and tag inside the card. The footer
// map's label sits on the drawing's base, not in empty space under it.
const FIRST = [
  [1100, 700],
  [1100, 800],
  [1165, 800],
  [1280, 720],
  [1280, 800],
  [1366, 768],
  [1440, 900],
  [1470, 956],
  [1536, 864],
  [1920, 1080],
  [2560, 1440],
  [3440, 720],
  [3440, 900],
  [3440, 1080],
  [3440, 1440],
];
// PARKED: pins the hero's six layouts on the first screen; bring back with the new sizes once the hero is three layouts (notes.md).
test('Home: hero menu and news cards on the first screen (C1)', async ({ browser }) => {
  const fails = (
    await lanes(FIRST, 4, async ([w, h]) => {
      const q = await browser.newPage({ viewport: { width: w, height: h } });
      await q.goto(url('index'));
      await q.waitForLoadState('networkidle');
      await q.evaluate(() => document.fonts.ready);
      const r = await q.evaluate(() => {
        const out = [];
        for (const sel of ['.hero-menu .menu li:last-child', '.hero-cta', '.hero-dock']) {
          const e = document.querySelector(sel);
          if (!e || !e.getClientRects().length) continue;
          const b = e.getBoundingClientRect().bottom;
          if (b > innerHeight + 1)
            out.push(`${sel} ends at ${Math.round(b)}px, below the first screen (${innerHeight}px)`);
        }
        return out;
      });
      await q.close();
      return r.length ? `${w}x${h}: ${r.join('; ')}` : null;
    })
  ).filter(Boolean);
  verdict(fails);
});
// PARKED: pins today's news cards in the narrowest office column; bring back when the real news cards and the new hero land.
test('Home: hero news cards whole at 1100 to 1240 wide (C1)', async ({ browser }) => {
  const jobs = [800, 900, 1080].flatMap((h) => [1100, 1120, 1140, 1160, 1180, 1200, 1220, 1240].map((w) => [w, h]));
  const fails = (
    await lanes(jobs, 4, async ([w, h]) => {
      const q = await browser.newPage({ viewport: { width: w, height: h } });
      await q.goto(url('index'));
      await q.evaluate(() => document.fonts.ready);
      const r = await q.evaluate(() => {
        const out = [];
        for (const card of document.querySelectorAll('.hero-dock .news')) {
          const c = card.getBoundingClientRect();
          for (const el of card.querySelectorAll('.news-title, .news-tag, .news-text p')) {
            const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
            for (let t; (t = tw.nextNode());) {
              for (const m of t.data.matchAll(/[^\s-]+-?/g)) {
                const g = document.createRange();
                g.setStart(t, m.index);
                g.setEnd(t, m.index + m[0].length);
                const rects = [...g.getClientRects()].filter((x) => x.width);
                if (new Set(rects.map((x) => Math.round(x.top))).size > 1) out.push(`"${m[0]}" split across lines`);
                for (const x of rects)
                  if (x.right > c.right + 1 || x.left < c.left - 1) out.push(`"${m[0]}" cut by its card`);
              }
            }
          }
        }
        return [...new Set(out)];
      });
      await q.close();
      return r.length ? `${w}x${h}: ${r.join(', ')}` : null;
    })
  ).filter(Boolean);
  verdict(fails);
});
// PARKED: pins the map label to today's camera boxes; bring back once the generators write the camera boxes (notes.md).
test('footer map: its label on the drawing (C1)', async ({ browser }) => {
  const fails = [];
  for (const [w, h] of [
    [1440, 900],
    [1920, 1080],
    [2560, 1440],
    [3440, 1440],
  ]) {
    const q = await browser.newPage({ viewport: { width: w, height: h } });
    await q.goto(url('contact'));
    await q.$eval('#footer', (e) => e.scrollIntoView());
    await q.waitForFunction(() => document.querySelector('.fc-map > svg'));
    await q.waitForTimeout(1500); // the camera settles on the open section's spot
    const r = await q.evaluate(() => {
      const m = document.querySelector('.fc-map'),
        vb = m.querySelector(':scope > svg').viewBox.baseVal,
        b = m.getBoundingClientRect();
      const drawn = vb.height * Math.min(b.width / vb.width, b.height / vb.height); // drawn centred, its whole shape shown
      return { gap: b.top + (b.height + drawn) / 2 - document.querySelector('.fc-hud').getBoundingClientRect().bottom };
    });
    await q.close();
    if (Math.abs(r.gap) > 4)
      fails.push(
        `${w}x${h}: the map label sits ${Math.round(Math.abs(r.gap))}px ${r.gap > 0 ? 'above' : 'below'} the drawing's base`,
      );
  }
  verdict(fails);
});

// B19, B7: Contact's queue ring holds its words. "1 day" stays on one line, and it and the label sit inside the
// ring's stroke (the drawing's circle of radius 64 in 168: r 70, stroke 12; each line by its letters' height, 0.35em
// either side of its middle), at the desktop widths where the review saw it break, and with WCAG 1.4.12 text spacing.
const SPACING =
  '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }';
// PARKED: pins Contact's queue ring and its words; bring back when Contact's real copy is written, keeping its text-spacing case (WCAG 1.4.12).
test('queue ring: its words inside the ring, with text spacing too (B19, B7)', async ({ browser }) => {
  const fails = [];
  for (const w of [1100, 1280, 1440, 1920]) {
    for (const spacing of [false, true]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, bypassCSP: spacing });
      const q = await ctx.newPage();
      await q.goto(url('contact'));
      if (spacing) await q.addStyleTag({ content: SPACING });
      await q.evaluate(() => document.fonts.ready);
      const r = await q.evaluate(() => {
        const ring = document.querySelector('.queue-ring'),
          box = ring.getBoundingClientRect();
        const cx = box.left + box.width / 2,
          cy = box.top + box.height / 2,
          rad = (box.width * 64) / 168;
        const out = [],
          val = ring.querySelector('.stat-val');
        const lines = new Set([...val.getClientRects()].map((x) => Math.round(x.top))).size;
        if (lines > 1) out.push(`"${val.textContent}" on ${lines} lines`);
        for (const el of ring.querySelectorAll('.queue-ring-label > span:not(.sr-only)')) {
          const range = document.createRange();
          range.selectNodeContents(el);
          const half = parseFloat(getComputedStyle(el).fontSize) * 0.35;
          const far = Math.max(
            ...[...range.getClientRects()]
              .filter((x) => x.width)
              .flatMap((x) => {
                const mid = (x.top + x.bottom) / 2;
                return [x.left, x.right].flatMap((px) =>
                  [mid - half, mid + half].map((py) => Math.hypot(px - cx, py - cy)),
                );
              }),
          );
          if (far > rad + 0.5)
            out.push(
              `"${el.textContent.trim()}" reaches ${far.toFixed(1)}px from the centre, past the stroke at ${rad.toFixed(1)}px`,
            );
        }
        return out;
      });
      await ctx.close();
      fails.push(...r.map((x) => `contact at ${w}${spacing ? ' with text spacing' : ''}: ${x}`));
    }
  }
  verdict(fails);
});
