// The browser check against the built site (npm run verify; CI runs it on every push and pull request before deploy).
// Home (the page being worked on, FOCUS) gets everything: hero, Grow, footer tabs, sideways scroll at every size, and
// an axe accessibility pass at phone and desktop. Every other page (the served sitemap.xml, plus soon and the 404
// page) gets a quick look: loaded once at phone size for script errors and sideways scroll, plus an axe pass at phone
// size. --all gives every page the full treatment. Each page is scrolled to its footer; the 404 page has none (one
// screen, nothing under it: Base.astro footer={false}), so it is scrolled to its end and expects no footer.
// Fails on any script error (console error, uncaught error, a CSP or Trusted Types block), a hero tile that doesn't
// answer hover, a Grow section that doesn't play, a footer tab at 1440x900 that isn't one screen tall or whose panel
// overflows, sideways scroll, a header whose tabs come within 8px of the logo or buttons (or scroll) at any width from
// 320 to 1440 in 10px steps and on wider screens, at the default and 200% text, anything serious or critical from axe,
// or a sitemap with fewer than five pages.
// usage: npm run build && npm run serve   (wrangler dev on 8787)   then   npm run verify [-- --all] [--base URL] [--out DIR]
// Screenshots go to out/ (--out): the footer tabs at 1440, and Home and /soon at each size.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { BASE, MISSING, ROOT, SIZES, flag, option, pad, pages, verdict, watch } from './lib.mjs';

const ALL = flag('--all');
const OUT = join(ROOT, option('--out', 'out'));
mkdirSync(OUT, { recursive: true });
const PAGES = (await pages(BASE)).map((p) => p.replace(/^\/|\/$/g, '') || 'index'); // 'index', 'services', … 'soon', MISSING
const url = (page) => `${BASE}/${page === 'index' ? '' : page}`;
const FOCUS = new Set(['index']); // pages checked in full; the rest get the quick look unless --all
const full = (page) => ALL || FOCUS.has(page);

test('index 1440: hero, Grow, footer tabs', async ({ browser }) => {
  const fails = [];
  const errs = [];
  const rep = [];
  const pg = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  watch(pg, 'index 1440 (hero, grow, footer)', errs);
  await pg.goto(BASE + '/');
  await pg.waitForTimeout(5500);
  // hover a tile three along from the one showing, so the cloud's own timer can't have got there first
  const tiles = await pg.$$eval('.ob-tile', (t) => t.map((x) => [x.dataset.tile, x.classList.contains('is-on')]));
  const on = Math.max(0, tiles.findIndex(([, o]) => o));
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
    const on = document.querySelector('#grow .grow-dot[aria-pressed="true"]');
    return { built: pcs.filter((p) => !p.classList.contains('hide')).length, total: pcs.length, step: on ? Number(on.dataset.i) : -1 };
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
  const tabs = await pg.$$eval('.fc-tile', (t) => t.map((x) => x.id));
  if (!tabs.length) fails.push('footer: no tabs (.fc-tile) found');
  for (const [i, t] of tabs.entries()) {
    await pg.locator('#' + t).click();
    await pg.waitForTimeout(850);
    const info = await pg.evaluate(() => {
      const f = document.getElementById('footer');
      const p = document.querySelector('.fc-panel.is-on');
      const s = document.querySelector('.fc-panels');
      return {
        h: f.offsetHeight,
        fold: innerHeight - document.querySelector('.site-header').offsetHeight,
        panel: p.id,
        map: p.dataset.map,
        over: s.scrollHeight - s.clientHeight,
        hud: document.querySelector('.fc-hud b').textContent,
        vb: document.querySelector('svg.fc-w').getAttribute('viewBox'),
      };
    });
    rep.push(`tab ${t}: ${JSON.stringify(info)}`);
    if (Math.abs(info.h - info.fold) > 1)
      fails.push(`footer tab ${t} at 1440: ${info.h}px tall, the screen below the header is ${info.fold}px`);
    if (info.over > 0) fails.push(`footer tab ${t} at 1440: panel overflows by ${info.over}px`);
    await pg.screenshot({ path: join(OUT, `f-1440-${i}.png`) });
  }
  await pg.keyboard.press('ArrowRight');
  await pg.waitForTimeout(300);
  rep.push('arrow key -> ' + (await pg.evaluate(() => document.activeElement.id + ' / ' + document.querySelector('.fc-panel.is-on').id)));
  await pg.close();
  console.log(rep.join('\n'));
  verdict([...fails, ...errs]);
});

// header fit: at every 10px from 320 to 1440 (and four wider screens), at the default and the biggest text size, the
// tabs keep 8px clear of the logo and the buttons and don't scroll, and nothing scrolls sideways. Room for a new header
// button has to be made in bottom-nav.css (its measured rules), not found here later.
for (const text of ['', '2']) {
  test(`header fit, text ${text || 'default'}`, async ({ browser }) => {
    const fails = [];
    const ctx = await browser.newContext();
    await ctx.addInitScript((t) => {
      try {
        localStorage.setItem('uplink.text', t);
      } catch {
        /* no storage: the default size */
      }
    }, text);
    const q = await ctx.newPage();
    await q.setViewportSize({ width: 1440, height: 900 });
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
        fails.push(`header at ${w}px, text ${text || 'default'}: ${r.room}px room, tabs cut ${r.cut}px, sideways ${r.side}px`);
    }
    console.log(`header fit, text ${text || 'default'}: tightest ${worst[1]}px at ${worst[0]}px wide`);
    await ctx.close();
    verdict(fails);
  });
}

// each page at its sizes (each in its own tab, so they can't disturb each other)
for (const page of PAGES) {
  for (const { n, w, h } of full(page) ? SIZES : SIZES.slice(0, 1)) {
    test(`${page} ${n}`, async ({ browser }) => {
      const errs = [];
      const q = await browser.newPage({ viewport: { width: w, height: h } });
      watch(q, `${page} ${n}`, errs);
      // Home: long enough for the hero's first two captions (about 3.3s and 4.4s in), whose script errors would
      // otherwise come after the check had moved on
      await q.goto(url(page));
      await q.waitForTimeout(page === 'index' ? 5000 : 700);
      const footer = page !== MISSING; // the 404 has no footer
      if (footer) await q.$eval('#footer', (e) => e.scrollIntoView());
      else await q.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await q.waitForTimeout(500);
      const r = await q.evaluate(() => {
        const f = document.getElementById('footer');
        const s = document.querySelector('.fc-panels');
        if (!f) return [document.documentElement.scrollWidth - innerWidth, 'none', '-', '-'];
        return [document.documentElement.scrollWidth - innerWidth, f.offsetHeight, s.scrollHeight - s.clientHeight, f.classList.contains('fc-js')];
      });
      if (page === 'soon' || page === 'index') await q.screenshot({ path: join(OUT, `f-${page}-${n}.png`) });
      await q.close();
      console.log(`${pad(page, 22)} ${pad(n, 6)} overflowX ${r[0]} footer h ${r[1]} panel overflow ${r[2]} js ${r[3]}`);
      verdict([
        ...(r[0] > 0 ? [`${page} ${n}: ${r[0]}px sideways scroll`] : []),
        ...(!footer && r[1] !== 'none' ? [`${page} ${n}: has a footer (the 404 has none)`] : []),
        ...errs,
      ]);
    });
  }
}

// axe: the page's CSP blocks an injected script, so this context bypasses it (the site's own scripts still run)
for (const page of PAGES) {
  for (const { n, w, h } of full(page) ? [SIZES[0], SIZES[2]] : [SIZES[0]]) {
    test(`axe ${page} ${n}`, async ({ browser }) => {
      const ctx = await browser.newContext({ bypassCSP: true, viewport: { width: w, height: h } });
      const q = await ctx.newPage();
      await q.goto(url(page));
      await q.waitForTimeout(1500);
      const v = (await new AxeBuilder({ page: q }).analyze()).violations;
      await ctx.close();
      const serious = v.filter((x) => x.impact === 'serious' || x.impact === 'critical');
      console.log(
        [
          `axe ${pad(page, 22)} ${pad(n, 6)} ${v.length} violation(s), ${serious.length} serious/critical`,
          ...v.map(
            (x) =>
              `    [${x.impact}] ${x.id}: ${x.help}\n      ` +
              x.nodes
                .slice(0, 4)
                .map((y) => y.target.join(' ') + (y.any[0] ? ' · ' + y.any[0].message : ''))
                .join('\n      '),
          ),
        ].join('\n'),
      );
      verdict(serious.map((x) => `axe ${page} ${n}: [${x.impact}] ${x.id}`));
    });
  }
}
