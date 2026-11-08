// The browser check against the built site (npm run verify; CI runs it on every push and pull request before deploy).
// Home (the page being worked on, FOCUS) gets everything: hero, Grow, footer tiles, the per-page checks at every size,
// and an axe pass at phone and desktop. Every other page (every page the build wrote: lib.mjs pages) gets the
// per-page checks at phone size and an axe pass. --all gives every page the full treatment. On every page, at
// every size it runs at:
//   script errors   watched until the network is idle and while the page's timers run on (3 s; Home 5 s, for the
//                   hero's captions; Playwright's clock runs them, so the check doesn't wait them out), then while the screen turns (portrait to landscape and back) and while each of the
//                   page's own buttons is pressed (pause, Grow, copy buttons)
//   markup          exactly one <h1>; every JSON-LD block parses
//   sideways scroll scrolled to its footer (the 404 page has none: Base.astro footer={false}, so to its end); and
//                   separately at 320, 390, 600, 768, 1024 and 1280 wide, walked down a screen at a time
//   pop-ups         each dialog a [data-open] link or button on the page opens: it shows (opacity 1, a real size),
//                   axe passes with it open, Esc closes it and focus goes back; a toast shows and leaves on its own;
//                   on desktop the panel a footer tile opens shows. All of it once more with the site's pause on
//                   (html.is-held, saved as uplink-held), which must never hide a pop-up (review B1)
// Fails on any of those, a hero tile that doesn't answer hover, a Grow section that doesn't play, a footer tile at
// 1440x900 that isn't one screen tall, whose panel overflows or whose map spot doesn't show, keys that don't reach and
// open the footer's sections, a header whose tabs come within 8px of the logo or
// buttons (or scroll) at any width from 320 to 1440 in 10px steps and on wider screens,
// anything serious or critical from axe (or moderate, off its allow-list; WCAG 2.2 AA rules), or a sitemap that doesn't list exactly the built pages.
// Known failures are marked test.fail with the review item that fixes them (KNOWN, below): such a test fails the run
// once the bug is fixed, as a reminder to drop the mark.
// At the end, one test for each bug the November 7, 2026 review found and batch 2b fixed, named by its item (B2 …), so
// it can't come back unseen: Grow's timing and frames, pop-ups and focus, forms, drawings that fail to load, the font
// swap, print, and the drawings' ?v= addresses. And one for the footer on <details> (J7, B14, L7, M11): without
// script, from the keyboard, through a resize and a turn, its landmarks and what a screen reader is told. And one for
// the /work filters as a radio group (M11, B4): without script, from the keyboard, in forced colours, and axe.
// Batch 4 adds three: Settings before or without script and focus back to the opener (J8), a field's own hint kept in
// aria-describedby (J9), and the phone services row in a browser with no scrollend (J15).
// usage: npm run build && npm run serve   (wrangler dev on 8787)   then   npm run verify [-- --all] [--base URL] [--out DIR]
// Screenshots go to out/ (--out): the footer tiles at 1440, and Home and /soon at each size.
import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { PNG } from 'pngjs';
import { BASE, MISSING, ROOT, SIZES, flag, lanes, option, pad, pages, verdict, watch } from './lib.mjs';
import { LONG, longest } from '../src/lib/fit.js';

const ALL = flag('--all');
const OUT = join(ROOT, option('--out', 'out'));
mkdirSync(OUT, { recursive: true });
const PAGES = (await pages(BASE)).map((p) => p.replace(/^\/|\/$/g, '') || 'index'); // 'index', 'services', … 'soon', MISSING
const url = (page) => `${BASE}/${page === 'index' ? '' : page}`;
const FOCUS = new Set(['index']); // pages checked in full; the rest get the quick look unless --all
const full = (page) => ALL || FOCUS.has(page);

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

// each page at its sizes (each in its own tab, so they can't disturb each other)
for (const page of PAGES) {
  for (const { n, w, h } of full(page) ? SIZES : SIZES.slice(0, 1)) {
    test(`${page} ${n}`, async ({ browser }) => {
      const errs = [];
      const fails = [];
      const q = await browser.newPage({ viewport: { width: w, height: h } });
      watch(q, `${page} ${n}`, errs);
      // a script error can come late (a timer, a drawing fetched after load): wait for the network to go quiet, then
      // run the page's timers a few seconds on (Playwright's clock, so no real wait). Home: long enough for the hero's
      // first two captions (about 1.1s and 2.2s in).
      await q.clock.install();
      await q.goto(url(page));
      await q.waitForLoadState('networkidle');
      await q.clock.runFor(page === 'index' ? 5000 : 3000);
      const m = await q.evaluate(() => ({
        h1: document.querySelectorAll('h1').length,
        ld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((e) => {
          try {
            JSON.parse(e.textContent);
            return null;
          } catch (x) {
            return x.message;
          }
        }),
      }));
      if (m.h1 !== 1) fails.push(`${page} ${n}: ${m.h1} <h1> elements (one per page)`);
      m.ld.forEach((x, i) => x && fails.push(`${page} ${n}: JSON-LD block ${i + 1} doesn't parse: ${x}`));
      const footer = page !== MISSING; // the 404 has no footer
      if (footer) await q.$eval('#footer', (e) => e.scrollIntoView());
      else await q.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await q.clock.runFor(500);
      const r = await q.evaluate(() => {
        const f = document.getElementById('footer');
        if (!f) return [document.documentElement.scrollWidth - innerWidth, 'none', '-', '-'];
        const s = [...f.querySelectorAll('.fc-panel')].find((p) => p.getClientRects().length);
        return [
          document.documentElement.scrollWidth - innerWidth,
          f.offsetHeight,
          s ? s.scrollHeight - s.clientHeight : '-',
          f.querySelectorAll('.fc-sec[open]').length,
        ];
      });
      if (page === 'soon' || page === 'index') await q.screenshot({ path: join(OUT, `f-${page}-${n}.png`) });
      if (r[0] > 0) fails.push(`${page} ${n}: ${r[0]}px sideways scroll`);
      if (!footer && r[1] !== 'none') fails.push(`${page} ${n}: has a footer (the 404 has none)`);
      // turn the screen and back (resize and orientation handlers), then press each of the page's own buttons and
      // summaries once (not the pop-up openers, which the pop-up check opens, nor a form's Send): any script error counts
      await q.setViewportSize({ width: h, height: w });
      await q.clock.runFor(600);
      await q.setViewportSize({ width: w, height: h });
      await q.clock.runFor(600);
      const controls = await q.evaluate(() => {
        const shown = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
        const all = [
          ...document.querySelectorAll('button:not([data-open]):not([type="submit"]):not(:disabled), summary'),
        ].filter((b) => !b.closest('dialog, form') && shown(b));
        all.forEach((b, i) => b.setAttribute('data-check-ctl', String(i)));
        return all.length;
      });
      for (let i = 0; i < controls; i++) {
        await q
          .locator(`[data-check-ctl="${i}"]`)
          .click({ timeout: 2000 })
          .catch(() => {}); // covered or gone: not this check's business
        await q.clock.runFor(150);
      }
      await q.keyboard.press('Escape');
      await q.clock.runFor(1000);
      await q.close();
      console.log(
        `${pad(page, 22)} ${pad(n, 6)} overflowX ${r[0]} footer h ${r[1]} panel overflow ${r[2]} open ${r[3]} h1 ${m.h1} ld ${m.ld.length} controls ${controls}`,
      );
      verdict([...fails, ...errs]);
    });
  }
}

// sideways scroll (WCAG 1.4.10) at the widths where layouts change, every page, walked down a screen at a time so
// whatever starts once it's on screen (Grow, the footer map) has started. KNOWN: failures found by this check and
// fixed in a later batch of the review (docs/review-2026-11-07.md); the test is expected to fail until then.
const WIDTHS = [320, 390, 600, 768, 1024, 1280];
// in the page: two frames on, how far the page is wider than the screen
const WIDE = () =>
  new Promise((done) =>
    requestAnimationFrame(() => requestAnimationFrame(() => done(document.documentElement.scrollWidth - innerWidth))),
  );
/** @type {Record<string, string>} */
const KNOWN = {};
for (const page of PAGES) {
  for (const width of WIDTHS) {
    test(`sideways ${page} ${width}`, async ({ browser }) => {
      const known = KNOWN[`${page} ${width}`];
      test.fail(!!known, known);
      const q = await browser.newPage({ viewport: { width, height: 800 } });
      await q.goto(url(page));
      await q.waitForLoadState('networkidle');
      let worst = 0;
      // each screen: scrolled to, two frames for what it starts (an IntersectionObserver answers in the next frame)
      for (let y = 0, end = 1; y < end; y += 600) {
        end = await q.evaluate((top) => {
          window.scrollTo(0, top);
          return document.documentElement.scrollHeight;
        }, y);
        worst = Math.max(worst, await q.evaluate(WIDE));
      }
      // the footer map (tablet and up) comes over the network once the footer is near: measured once it's in
      if (await q.locator('.fc-map').first().isVisible()) {
        await q.waitForSelector('.fc-map > svg', { state: 'attached', timeout: 10_000 }).catch(() => {});
        worst = Math.max(worst, await q.evaluate(WIDE));
      }
      // Grow: don't leave it to its own timer (a slow machine may not have stepped yet). Pick each step by hand, the
      // list on desktop or the dots below, and measure with each one active
      const steps = q.locator('#grow :is(.grow-dot, .grow-item):visible');
      for (let i = 0, n = await steps.count(); i < n; i++) {
        await steps.nth(i).click();
        worst = Math.max(worst, await q.evaluate(WIDE));
      }
      await q.close();
      if (worst > 0 || known) console.log(`sideways ${page} ${width}: ${worst}px${known ? ` (known: ${known})` : ''}`);
      verdict(worst > 0 ? [`${page} at ${width}px: ${worst}px sideways scroll`] : []);
    });
  }
}

// pop-ups: each dialog the page can open, with the site's pause off and on (review B1: with it on, the dialogs,
// toasts and footer panels stayed at their first, invisible animation frame, and the phone services row stopped
// following a swipe). axe gets the whole page at load (pause off), and then each open dialog, which a pass over the page
// can't see (a closed <dialog> isn't rendered). With the pause on, every looping animation must be paused once the drawings have loaded.
// axe runs the WCAG 2.2 AA rules and axe's best practices (review L10). Serious and critical findings fail, and so
// does a moderate one unless AXE_ALLOW names its rule with the reason it's accepted; minor ones are only printed.
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const AXE_ALLOW = {};
const axe = (q) => new AxeBuilder({ page: q }).withTags(AXE_TAGS);
const axeFails = (v) =>
  v.filter((x) => x.impact === 'serious' || x.impact === 'critical' || (x.impact === 'moderate' && !AXE_ALLOW[x.id]));
// wait until an element's own animations have stopped running (finished, or held by a pause), up to 5 s, so a busy
// runner can't catch a 250ms fade-in half way; a fade held by the pause stays at its first frame and still fails
const settled = (q, sel) =>
  q
    .waitForFunction(
      (s) => {
        const e = document.querySelector(s);
        return !!e && e.getAnimations().every((a) => a.playState !== 'running');
      },
      sel,
      { timeout: 5000 },
    )
    .catch(() => {});
const shownStyle = (sel) => {
  const e = document.querySelector(sel);
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { opacity: Number(getComputedStyle(e).opacity), w: Math.round(r.width), h: Math.round(r.height) };
};
for (const page of PAGES) {
  for (const { n, w, h } of full(page) ? [SIZES[0], SIZES[2]] : [SIZES[0]]) {
    for (const held of [false, true]) {
      const name = `pop-ups ${page} ${n}${held ? ', paused' : ''}`;
      test(name, async ({ browser }) => {
        const fails = [];
        const errs = [];
        const rep = [];
        // axe's script needs the page's CSP bypassed (the site's own scripts still run); the other tests watch the CSP
        const ctx = await browser.newContext({ bypassCSP: true, viewport: { width: w, height: h } });
        await ctx.addInitScript((on) => {
          try {
            localStorage.setItem('uplink-held', on ? '1' : '0');
          } catch {
            /* no storage: the check below says so */
          }
        }, held);
        const q = await ctx.newPage();
        watch(q, `${page} ${n}${held ? ', paused' : ''} (pop-ups)`, errs); // starts with the page: watch() knows the 404's own status
        await q.clock.install(); // the toast's 3 s are run on, not waited for
        await q.goto(url(page));
        await q.waitForLoadState('networkidle');
        const isHeld = await q.evaluate(() => document.documentElement.classList.contains('is-held'));
        if (isHeld !== held) fails.push(`${name}: html.is-held is ${isHeld}, expected ${held}`);
        // axe on the whole page as it loads (once, with the pause off); each open dialog gets its own pass below
        if (!held) {
          const v = (await axe(q).analyze()).violations;
          const serious = axeFails(v);
          console.log(
            [
              `axe ${pad(page, 22)} ${pad(n, 6)} ${v.length} violation(s), ${serious.length} failing`,
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
          for (const x of serious) fails.push(`axe ${page} ${n}: [${x.impact}] ${x.id}`);
        }
        const ids = await q.evaluate(() =>
          [...new Set([...document.querySelectorAll('[data-open]')].map((e) => e.dataset.open))].filter((id) =>
            document.getElementById(id),
          ),
        );
        if (!ids.length) fails.push(`${name}: nothing opens a dialog (the header's Settings button should)`);
        for (const id of ids) {
          const opener = q.locator(`[data-open="${id}"]:visible`).first();
          if (!(await opener.count())) {
            rep.push(`${id}: no opener shown at this size`);
            continue;
          }
          await opener.scrollIntoViewIfNeeded();
          await opener.click();
          await q.waitForFunction((d) => document.getElementById(d)?.open, id, { timeout: 5000 }).catch(() => {});
          await settled(q, `#${id}`); // the opening animation is 250ms (--dur-2)
          const st = await q.evaluate(shownStyle, `#${id}`);
          rep.push(`${id}: ${JSON.stringify(st)}`);
          if (!st || st.opacity < 0.99 || st.w < 100 || st.h < 100)
            fails.push(`${name}: #${id} isn't shown once open: ${JSON.stringify(st)}`);
          const v = (await axe(q).include(`#${id}`).analyze()).violations;
          for (const x of axeFails(v)) fails.push(`${name}: axe in #${id}: [${x.impact}] ${x.id}`);
          // a toast in the dialog: Settings' shortcuts switch says what it did, then leaves on its own (3 s)
          if (id === 'settings-dialog' && (await q.locator('#sc-toggle').count())) {
            await q.locator('#sc-toggle').click();
            await q.waitForSelector(`#${id} .toast`, { timeout: 5000 }).catch(() => {});
            await settled(q, `#${id} .toast`);
            const t = await q.evaluate(shownStyle, `#${id} .toast`);
            if (!t || t.opacity < 0.99) fails.push(`${name}: the shortcuts toast isn't shown: ${JSON.stringify(t)}`);
            await q.clock.runFor(3000); // its time on screen; then it fades out (a CSS animation, in real time)
            const gone = await q
              .waitForFunction((d) => !document.querySelector(`#${d} .toast`), id, { timeout: 6000 })
              .then(
                () => true,
                () => false,
              );
            if (!gone) fails.push(`${name}: the shortcuts toast never left`);
          }
          await q.keyboard.press('Escape');
          await q.waitForFunction((d) => !document.getElementById(d).open, id, { timeout: 2000 }).catch(() => {});
          const after = await q.evaluate(
            (d) => ({ open: document.getElementById(d).open, back: document.activeElement?.dataset?.open === d }),
            id,
          );
          if (after.open) fails.push(`${name}: Esc didn't close #${id}`);
          else if (!after.back) fails.push(`${name}: focus didn't go back to what opened #${id}`);
        }
        // the phone services row (Home): swiped two cards along, the card now in the middle is the big, bright one
        // (scroll-driven animations; review B1 follow-up: the pause held them, so the old card stayed big)
        const row = q.locator('.svc-menu');
        if ((await row.count()) && (await row.evaluate((e) => e.scrollWidth > e.clientWidth + 10))) {
          await row.scrollIntoViewIfNeeded();
          await row.evaluate((e) => e.scrollBy({ left: e.querySelector('li').offsetWidth * 2, behavior: 'instant' }));
          // read until the middle card is the big one, or 3 s have gone
          const middle = () =>
            row.evaluate((e) => {
              const mid = e.getBoundingClientRect().left + e.clientWidth / 2;
              const li = [...e.children].reduce((a, b) => {
                const d = (x) => Math.abs(x.getBoundingClientRect().left + x.getBoundingClientRect().width / 2 - mid);
                return d(b) < d(a) ? b : a;
              });
              const scale = new DOMMatrix(getComputedStyle(li.querySelector('.svc-tile')).transform).a;
              const art = li.querySelector('.svc-art, .svc-icon');
              return {
                i: [...e.children].indexOf(li),
                scale: Math.round(scale * 100) / 100,
                art: art ? Number(getComputedStyle(art).opacity) : 1,
              };
            });
          let c = await middle();
          for (
            const end = Date.now() + 3000;
            (c.i < 1 || c.scale < 0.98 || c.art < 0.95) && Date.now() < end;
            c = await middle()
          )
            await q.waitForTimeout(100);
          rep.push(`services row after a swipe: ${JSON.stringify(c)}`);
          if (c.i < 1 || c.scale < 0.98 || c.art < 0.95)
            fails.push(`${name}: the services row didn't follow the swipe (the middle card: ${JSON.stringify(c)})`);
        }
        // with the pause on, nothing loops: the hero, Grow and the footer map each counted while on screen (off screen
        // they idle anyway, so counting only at the end would miss a broken pause)
        if (held && page === 'index') {
          for (const sel of ['#top', '#grow', '#footer']) {
            await q.$eval(sel, (e) => e.scrollIntoView());
            await q.waitForTimeout(800);
            const running = await q.evaluate(() =>
              document
                .getAnimations()
                .filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().iterations === Infinity)
                .map((a) => a.animationName || 'animation'),
            );
            if (running.length)
              fails.push(
                `${name}: ${running.length} loop(s) still running with the pause on at ${sel}: ${[...new Set(running)].join(', ')}`,
              );
          }
        }
        // desktop footer tiles: the panel a tile opens shows (the 404 page has no footer)
        if (w >= 700 && page !== MISSING) {
          await q.$eval('#footer', (e) => e.scrollIntoView());
          await q.locator('.fc-tile').nth(1).click();
          await settled(q, '.fc-sec[open] .fc-panel'); // its animation is 360ms (--dur-fc-panel)
          const p = await q.evaluate(shownStyle, '.fc-sec[open] .fc-panel');
          rep.push(`footer panel: ${JSON.stringify(p)}`);
          if (!p || p.opacity < 0.99 || p.h < 50)
            fails.push(`${name}: the footer tile's panel isn't shown: ${JSON.stringify(p)}`);
        }
        await ctx.close();
        console.log(`${name}: ${rep.join('; ')}`);
        verdict([...fails, ...errs]);
      });
    }
  }
}

// Behaviour the review's quick bugs (batch 2b, docs/review-2026-11-07.md) broke, one test each, on Home unless named.
// Each test counts the frames the page's scripts ask for (requestAnimationFrame, wrapped before the page loads),
// reads Grow's open step from its card (.grow-card.is-on) and its timer from the play ring.
const frames = () => {
  window.__frames = 0;
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => {
    window.__frames++;
    return raf(cb);
  };
};
const framesIn = (q, ms = 1000) =>
  q.evaluate(async (ms) => {
    const a = window.__frames;
    await new Promise((r) => setTimeout(r, ms));
    return window.__frames - a;
  }, ms);
const growStep = (q) =>
  q.evaluate(() => [...document.querySelectorAll('#grow .grow-card')].findIndex((c) => c.classList.contains('is-on')));
const growLabel = (q) => q.$eval('#grow .grow-play', (b) => b.getAttribute('aria-label'));
const ringAt = (q) => q.$eval('#grow .grow-ring circle', (c) => getComputedStyle(c).strokeDashoffset);
const loopsIn = (q, sel) =>
  q.evaluate(
    (sel) =>
      document
        .getAnimations()
        .filter(
          (a) =>
            a.playState === 'running' &&
            a.effect?.getComputedTiming().iterations === Infinity &&
            a.effect.target?.closest?.(sel),
        )
        .map((a) => a.animationName || 'animation'),
    sel,
  );
// waits for Grow to open step `i` and says how long that took (ms), or Infinity
const until = async (q, i, timeout = 9000) => {
  const t0 = Date.now();
  const ok = await q
    .waitForFunction((i) => document.querySelectorAll('#grow .grow-card')[i]?.classList.contains('is-on'), i, {
      timeout,
      polling: 50,
    })
    .then(
      () => true,
      () => false,
    );
  return ok ? Date.now() - t0 : Infinity;
};
const home = async (browser, { w = 1440, h = 900, held = false, init } = {}) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript((on) => {
    try {
      localStorage.setItem('uplink-held', on ? '1' : '0');
    } catch {
      /* no storage: not paused, the default */
    }
  }, held);
  await ctx.addInitScript(frames);
  if (init) await init(ctx);
  const q = await ctx.newPage();
  const errs = [];
  watch(q, `index ${w} (2b)`, errs);
  await q.goto(BASE + '/');
  await q.waitForLoadState('networkidle');
  return { ctx, q, errs };
};
const toGrow = (q) => q.$eval('#grow', (e) => e.scrollIntoView({ block: 'start', behavior: 'instant' }));

// B2, B21: once the story ends it stands still. Its timer ring used to ask for a frame forever (B2: 60 a second, the
// whole of Home's idle CPU) and its CSS loops and the dome's orbits ran on (B21). Off screen nothing runs either.
test('Grow: no frames and no loops once the story ends, or off screen (B2, B21)', async ({ browser }) => {
  const fails = [];
  const { ctx, q, errs } = await home(browser);
  await toGrow(q);
  await until(q, 0);
  await q.waitForTimeout(1500);
  await q.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await q.waitForTimeout(400);
  const off = await framesIn(q);
  if (off > 0) fails.push(`Grow off screen (the hero showing): ${off} frames asked for in 1 s`);
  await toGrow(q);
  await q.locator('#grow .grow-item').nth(4).click();
  await q.locator('#grow .grow-play').click();
  const ended = await q
    .waitForFunction(
      () => document.querySelector('#grow .grow-play').getAttribute('aria-label') === 'Play again',
      null,
      { timeout: 15000 },
    )
    .then(
      () => true,
      () => false,
    );
  if (!ended) fails.push(`Grow didn't reach the end of its story (button: ${await growLabel(q)})`);
  await q.waitForTimeout(500);
  const end = await framesIn(q);
  if (end > 0) fails.push(`Grow ended, on screen: ${end} frames asked for in 1 s`);
  const loops = await loopsIn(q, '#grow');
  if (loops.length) fails.push(`Grow ended: ${loops.length} loop(s) still running: ${[...new Set(loops)].join(', ')}`);
  console.log(`grow idle: off screen ${off} frames/s, ended ${end} frames/s, ${loops.length} loops`);
  await ctx.close();
  verdict([...fails, ...errs]);
});

// B17: a step paused (the site's pause) or scrolled off screen goes on for what's left of it, not a whole new 4.5 s,
// and its ring goes on at once; the site's pause, released, leaves Grow paused if you paused it yourself since.
test('Grow: a held or hidden step resumes where it was; your own pause wins (B17)', async ({ browser }) => {
  const fails = [];
  const { ctx, q, errs } = await home(browser);
  const DWELL = 4500;
  await toGrow(q);
  await until(q, 0);
  // held for 2 s at 1.5 s into step 1
  await q.waitForTimeout(1500);
  await q.evaluate(() => document.querySelector('[data-hold]').click());
  await q.waitForTimeout(2000);
  const r1 = await ringAt(q);
  await q.evaluate(() => document.querySelector('[data-hold]').click());
  await q.waitForTimeout(400);
  const r2 = await ringAt(q);
  if (r1 === r2) fails.push(`held and released: the ring stood still (${r1}) after the release`);
  const rest = 400 + (await until(q, 1));
  if (rest > DWELL - 800)
    fails.push(`held at 1.5 s into a step, released: the step ran ${rest} ms more (about ${DWELL - 1500} left)`);
  // your own pause, under the site's: releasing the site's pause doesn't play it
  await q.evaluate(() => document.querySelector('[data-hold]').click());
  await q.locator('#grow .grow-play').click(); // play
  await q.locator('#grow .grow-play').click(); // pause
  await q.evaluate(() => document.querySelector('[data-hold]').click());
  await q.waitForTimeout(600);
  const label = await growLabel(q);
  if (label !== 'Play')
    fails.push(`paused by hand under the site's pause, then the site's pause released: Grow plays (button "${label}")`);
  // off screen for 2.5 s at 1.5 s into step 3
  await q.locator('#grow .grow-play').click();
  const at = await growStep(q);
  await until(q, at + 1);
  const t0 = Date.now();
  await q.waitForTimeout(1500);
  await q.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  const shown = Date.now() - t0;
  await q.waitForTimeout(2500);
  await toGrow(q);
  const more = await until(q, at + 2);
  if (more > DWELL - 700 || shown + more < DWELL - 800)
    fails.push(`a step scrolled off screen ${shown} ms in, and back: it ran ${more} ms more (${DWELL} ms a step)`);
  console.log(
    `grow resume: ${rest} ms after release (ring ${r1} -> ${r2}); own pause kept: ${label}; on screen ${shown}+${more} ms`,
  );
  await ctx.close();
  verdict([...fails, ...errs]);
});

// B15: reduced motion switched on mid-visit pauses Grow: no more steps, no frames
test('Grow: reduced motion switched on mid-visit pauses it (B15)', async ({ browser }) => {
  const fails = [];
  const { ctx, q, errs } = await home(browser);
  await toGrow(q);
  await until(q, 0);
  await q.waitForTimeout(1000);
  await q.emulateMedia({ reducedMotion: 'reduce' });
  const at = await growStep(q);
  await q.waitForTimeout(5500);
  const now = await growStep(q);
  if (now !== at) fails.push(`reduced motion on at step ${at + 1}: Grow went on to step ${now + 1}`);
  const n = await framesIn(q);
  if (n > 0) fails.push(`reduced motion on: ${n} frames asked for in 1 s`);
  console.log(`grow reduced motion: step ${at + 1} -> ${now + 1}, ${n} frames/s, button "${await growLabel(q)}"`);
  await ctx.close();
  verdict([...fails, ...errs]);
});

// B14, M11: at the ends the arrows are aria-disabled, so a keyboard user's focus stays on them (disabled dropped it to
// <body>); the open step is aria-current="step", not aria-pressed (one of a set, not a toggle)
test('Grow phone: Next keeps focus at the last step; steps are aria-current (B14, M11)', async ({ browser }) => {
  const fails = [];
  const { ctx, q, errs } = await home(browser, { w: 390, h: 844 });
  await toGrow(q);
  await q.waitForTimeout(500);
  await q.locator('#grow .grow-step-btn').last().focus();
  for (let i = 0; i < 7; i++) {
    await q.keyboard.press('Enter');
    await q.waitForTimeout(150);
  }
  const s = await q.evaluate(() => {
    const a = document.activeElement;
    return {
      focus: a === document.body ? 'body' : `${a.tagName.toLowerCase()}.${a.className}`,
      onNext: a === [...document.querySelectorAll('#grow .grow-step-btn')].pop(),
      off: a.getAttribute('aria-disabled'),
      pressed: document.querySelectorAll('#grow [aria-pressed]').length,
      current: [...document.querySelectorAll('#grow .grow-dot')].map((d) => d.getAttribute('aria-current')),
    };
  });
  if (!s.onNext) fails.push(`Next pressed past the last step: focus went to ${s.focus}`);
  else if (s.off !== 'true') fails.push(`Next at the last step isn't aria-disabled (${s.off})`);
  if (s.pressed) fails.push(`${s.pressed} Grow step button(s) use aria-pressed`);
  if (s.current.filter((c) => c === 'step').length !== 1 || s.current.at(-1) !== 'step')
    fails.push(`the open step isn't the only aria-current="step" dot: ${JSON.stringify(s.current)}`);
  console.log(`grow keys: ${JSON.stringify(s)}`);
  await ctx.close();
  verdict([...fails, ...errs]);
});

// B12: a double-click on what opens a pop-up leaves it open (the second click used to land on its backdrop and shut it).
// B6, M11: each pop-up has its own empty live region from the start (one made with its first toast isn't announced),
// and its close button's name holds the "Esc" it shows. M11: the skip link's target takes focus. B14: a toast
// dismissed from the keyboard gives focus back, not to <body>.
test('pop-ups: double-click, live regions, Esc in the name, skip link, toast focus (B12, B6, M11, B14)', async ({
  browser,
}) => {
  const fails = [];
  const { ctx, q, errs } = await home(browser);
  for (const id of ['settings-dialog', 'book-dialog']) {
    await q.locator(`[data-open="${id}"]:visible`).first().dblclick();
    await q.waitForTimeout(600);
    const open = await q.evaluate((id) => document.getElementById(id).open, id);
    if (!open) fails.push(`#${id}: a double-click on its opener left it shut`);
    const region = await q.evaluate((id) => {
      const r = document.querySelector(`#${id} > .toasts`);
      return r ? { live: r.getAttribute('aria-live'), kids: r.children.length } : null;
    }, id);
    if (!region || region.live !== 'polite')
      fails.push(`#${id}: no aria-live="polite" .toasts of its own: ${JSON.stringify(region)}`);
    const tree = await q.locator(`#${id}`).ariaSnapshot();
    const close = tree.match(/button "([^"]*Close[^"]*)"/);
    if (!close || !close[1].includes('Esc'))
      fails.push(
        `#${id}: its close button is named ${close ? `"${close[1]}"` : '(not found)'}, without the "Esc" it shows`,
      );
    await q.keyboard.press('Escape');
    await q.waitForTimeout(300);
  }
  // fresh page: the regions are in the markup, not made later
  await q.reload();
  const marked = await q.evaluate(() =>
    [...document.querySelectorAll('dialog')].map((d) => !!d.querySelector(':scope > .toasts[aria-live]')),
  );
  if (marked.includes(false))
    fails.push(`a dialog has no live region before its first toast: ${JSON.stringify(marked)}`);
  // the skip link
  await q.keyboard.press('Tab');
  await q.keyboard.press('Enter');
  await q.waitForTimeout(200);
  const skip = await q.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
  if (skip !== 'main') fails.push(`Skip to content: focus went to ${skip}, not <main>`);
  // a toast, dismissed with Enter
  await q.locator('[data-open="settings-dialog"]:visible').first().click();
  await q.locator('#sc-toggle').click();
  await q.waitForTimeout(400);
  await q.keyboard.press('Tab');
  const inToast = await q.evaluate(() => !!document.activeElement?.closest('.toast'));
  if (!inToast) fails.push("Tab from the shortcuts switch didn't reach the toast it showed");
  await q.keyboard.press('Enter');
  await q.waitForTimeout(500);
  const after = await q.evaluate(() => {
    const a = document.activeElement;
    return {
      body: a === document.body,
      inDialog: !!a.closest('#settings-dialog'),
      what: `${a.tagName.toLowerCase()}#${a.id}`,
    };
  });
  if (after.body || !after.inDialog) fails.push(`toast dismissed with Enter: focus went to ${after.what}`);
  console.log(`pop-ups: regions ${JSON.stringify(marked)}, skip -> ${skip}, toast dismissed -> ${after.what}`);
  // the toast check toggled the shortcuts off: on again, for whoever is next in this context (nothing is)
  await ctx.close();
  verdict([...fails, ...errs]);
});

// J7, B14, L7, M11: the footer is one <nav aria-label="Footer"> of six <details name="footer"> (Footer.astro). It works
// without script, one section open at a time; Tab reaches each summary and Enter or Space opens it, then Tab goes on
// into its links; focus inside it stays put through a resize from desktop to phone and a turn (it used to drop to
// <body> as script moved the panels between tabs and rows); it holds the footer's only navigation landmark (it had
// five); and a screen reader hears each summary as open or closed. On tablet and up the panel on screen is always the
// open section's (Contact when none is picked), so no summary says "collapsed" over a panel that shows; phones start
// with every row shut.
test('footer: no script, keys, resize and turn, landmarks, open state (J7, B14, L7, M11)', async ({ browser }) => {
  const fails = [];
  const rep = [];
  const openIds = (q) => q.evaluate(() => [...document.querySelectorAll('.fc-sec[open]')].map((d) => d.id));
  for (const [w, h] of [
    [390, 844],
    [1440, 900],
  ]) {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: w, height: h } });
    const q = await ctx.newPage();
    await q.goto(url('about'));
    const tiles = q.locator('.fc-tile');
    const n = await tiles.count();
    if (n !== 6) fails.push(`no script, ${w}: ${n} footer sections, not 6`);
    for (let i = 0; i < n; i++) {
      await tiles.nth(i).click();
      await q.waitForTimeout(500);
      const s = await q.evaluate(
        (i) => ({
          id: document.querySelectorAll('.fc-sec')[i].id,
          h: Math.round(document.querySelectorAll('.fc-sec .fc-panel')[i].getBoundingClientRect().height),
        }),
        i,
      );
      const open = await openIds(q);
      if (open.length !== 1 || open[0] !== s.id || s.h < 50)
        fails.push(`no script, ${w}: section ${s.id} clicked: open ${JSON.stringify(open)}, its panel ${s.h}px tall`);
    }
    rep.push(`no script ${w}: ${n} sections opened one at a time`);
    await ctx.close();
  }

  // with script, on a phone every row starts shut
  const ph = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pq = await ph.newPage();
  await pq.goto(url('about'));
  await pq.waitForLoadState('networkidle');
  const phoneOpen = await openIds(pq);
  rep.push(`390 at load, open: ${JSON.stringify(phoneOpen)}`);
  if (phoneOpen.length) fails.push(`390 at load: ${JSON.stringify(phoneOpen)} open, every row should start shut`);
  await ph.close();

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const q = await ctx.newPage();
  const errs = [];
  watch(q, 'footer keys', errs);
  await q.goto(url('about'));
  await q.waitForLoadState('networkidle');
  await q.$eval('#footer', (e) => e.scrollIntoView());
  // tablet and up: the panel on screen is always the open one, so its summary never says "collapsed" while it shows:
  // at load (nothing picked), and after a visitor shuts the section they opened
  const shownState = async (when) => {
    const s = await q.evaluate(() =>
      [...document.querySelectorAll('.fc-sec')]
        .filter((d) => d.querySelector('.fc-panel').getClientRects().length)
        .map((d) => ({ id: d.id, open: d.open })),
    );
    rep.push(`1440 ${when}, panel shown: ${JSON.stringify(s)}`);
    if (s.length !== 1 || !s[0].open)
      fails.push(`1440 ${when}: the panel on screen isn't its open section's: ${JSON.stringify(s)}`);
  };
  await shownState('at load');
  await q.locator('.fc-tile').nth(1).click();
  await q.waitForTimeout(400);
  await q.locator('.fc-tile').nth(1).click();
  await q.waitForTimeout(400);
  await shownState('after shutting Services');
  // Tab from the first summary to the end of the footer's nav reaches all six
  await q.locator('.fc-tile').first().focus();
  const reached = [];
  for (let i = 0; i < 60; i++) {
    const a = await q.evaluate(() => {
      const a = document.activeElement;
      return { tile: a.matches('.fc-tile') ? a.parentElement.id : null, inNav: !!a.closest('.fc-nav') };
    });
    if (!a.inNav) break;
    if (a.tile) reached.push(a.tile);
    await q.keyboard.press('Tab');
  }
  rep.push(`Tab reached ${reached.join(', ')}`);
  if (new Set(reached).size !== 6)
    fails.push(`Tab reached ${new Set(reached).size} of the 6 footer summaries: ${reached.join(', ')}`);
  // Enter and Space open a section; Tab then goes into its links
  for (const [key, i] of [
    ['Enter', 2],
    ['Space', 3],
  ]) {
    await q.locator('.fc-tile').nth(i).focus();
    await q.keyboard.press(key);
    await q.waitForTimeout(500);
    const want = await q.evaluate((i) => document.querySelectorAll('.fc-sec')[i].id, i);
    const open = await openIds(q);
    if (open.length !== 1 || open[0] !== want) fails.push(`${key} on ${want}'s summary: open ${JSON.stringify(open)}`);
  }
  await q.keyboard.press('Tab');
  const into = await q.evaluate(() => !!document.activeElement.closest('.fc-sec[open] .fc-panel'));
  if (!into)
    fails.push(
      `Tab from the open summary went to ${await q.evaluate(() => document.activeElement.outerHTML.slice(0, 80))}, not into its panel`,
    );
  // focus on a link in the open panel, then desktop -> phone -> phone turned -> desktop: focus never leaves it
  const sizes = [
    [390, 844],
    [844, 390],
    [1280, 800],
  ];
  for (const target of ['.fc-sec[open] .fc-panel a', '.fc-sec[open] > .fc-tile']) {
    await q.setViewportSize({ width: 1280, height: 800 });
    await q.waitForTimeout(300);
    await q.locator(target).first().focus();
    for (const [w, h] of sizes) {
      await q.setViewportSize({ width: w, height: h });
      await q.waitForTimeout(400);
      const f = await q.evaluate((sel) => {
        const a = document.activeElement;
        return {
          same: a === document.querySelector(sel),
          body: a === document.body,
          shown: a.getClientRects().length > 0,
        };
      }, target);
      if (!f.same || !f.shown)
        fails.push(`focus on ${target} after the screen went to ${w}x${h}: ${JSON.stringify(f)}`);
    }
  }
  // landmarks: one navigation landmark in the footer, named Footer, with the legal links inside it
  const lm = await q.evaluate(() => ({
    all: [...document.querySelectorAll('nav, [role=navigation]')].map((n) => n.getAttribute('aria-label')),
    footer: [...document.querySelectorAll('footer :is(nav, [role=navigation])')].map((n) =>
      n.getAttribute('aria-label'),
    ),
    legal: !!document.querySelector('footer nav .fc-legal a'),
  }));
  rep.push(`navigation landmarks: ${lm.all.join(', ')}`);
  if (lm.footer.length !== 1 || lm.footer[0] !== 'Footer' || !lm.legal)
    fails.push(`footer landmarks: ${JSON.stringify(lm)}`);
  // what a screen reader gets: each summary a disclosure with its open state, named by its tile
  const cdp = await ctx.newCDPSession(q);
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  const sums = nodes
    .filter((x) => /^DisclosureTriangle/.test(x.role?.value ?? '') && !x.ignored)
    .map((x) => ({ name: x.name?.value, expanded: x.properties?.find((p) => p.name === 'expanded')?.value.value }));
  rep.push(`summaries: ${JSON.stringify(sums)}`);
  if (
    sums.length !== 6 ||
    sums.filter((x) => x.expanded === true).length !== 1 ||
    sums.some((x) => typeof x.expanded !== 'boolean' || !/\. /.test(x.name ?? ''))
  )
    fails.push(`the footer's summaries in the accessibility tree: ${JSON.stringify(sums)}`);
  console.log(rep.join('\n'));
  await ctx.close();
  verdict([...fails, ...errs]);
});

// B6 follow-up: a toast with no pop-up open goes to the page's own region (straight under <body>), not into a closed
// dialog's, where it is invisible and unheard: Contact's copy button, and the Book form's confirmation, which comes
// once its pop-up has closed
test('page toasts: shown on the page, not in a closed pop-up (B6)', async ({ browser }) => {
  const fails = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const q = await ctx.newPage();
  const errs = [];
  watch(q, 'page toasts', errs);
  const toastShown = (text) =>
    q
      .waitForFunction(
        (text) =>
          [...document.querySelectorAll('.toast')].some(
            (t) =>
              t.textContent.includes(text) &&
              t.parentElement.parentElement === document.body &&
              Number(getComputedStyle(t).opacity) > 0.99 &&
              t.getClientRects().length > 0,
          ),
        text,
        { timeout: 3000 },
      )
      .then(
        () => true,
        () => false,
      );
  const where = (text) =>
    q.evaluate((text) => {
      const t = [...document.querySelectorAll('.toast')].find((x) => x.textContent.includes(text));
      return t
        ? `${t.parentElement.parentElement.tagName.toLowerCase()}#${t.parentElement.parentElement.id}, opacity ${getComputedStyle(t).opacity}`
        : 'none';
    }, text);
  await q.goto(url('contact'));
  await q.waitForLoadState('networkidle');
  await q.locator('.copy-btn').first().click(); // copied, or selected where the clipboard is refused: a toast either way
  if (!(await toastShown('')))
    fails.push(`contact: the copy button's toast isn't shown on the page (${await where('')})`);
  await q.goto(url('index'));
  await q.waitForLoadState('networkidle');
  await q.locator('[data-open="book-dialog"]:visible').first().click();
  await q.fill('#book-name', 'Test Person');
  await q.fill('#book-email', 'test@example.com');
  await q.selectOption('#book-size', { index: 1 });
  await q.locator('#book-dialog [type="submit"]').click();
  if (!(await toastShown('Check-up requested')))
    fails.push(`the Book form's confirmation isn't shown on the page (${await where('Check-up requested')})`);
  await ctx.close();
  verdict([...fails, ...errs]);
});

// J8: the header's gear opens Settings as an invoker command (commandfor, command="show-modal"), so it works before
// or without the page's scripts (a script that fails to load, say an old cached page asking for a bundle a deploy
// has replaced). Esc, its close button (command="close") and a click on the backdrop (closedby="any") shut it, and
// focus goes back to the gear. With script off altogether the gear stays hidden (header.css: the one setting needs
// script), and the Book links stay links that go to the form on /contact. With script, the close buttons give focus
// back to whatever opened the pop-up (core.js keeps the opener in a WeakMap).
test('pop-ups before or without script: Settings opens and closes, focus goes back; Book links reach the form (J8)', async ({
  browser,
}) => {
  const fails = [];
  const rep = [];
  const blocked = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await blocked.route('**/_astro/*.js', (r) => r.abort());
  const b = await blocked.newPage();
  await b.goto(url('index'));
  const gear = b.locator('.hbtn-settings');
  for (const how of ['Esc', 'its close button', 'the backdrop']) {
    await gear.click();
    await b.waitForTimeout(500); // the opening animation is 250ms (--dur-2)
    const st = await b.evaluate(
      () =>
        document.getElementById('settings-dialog').open &&
        document.getElementById('settings-dialog').getBoundingClientRect().height,
    );
    if (!st) {
      fails.push(`page scripts blocked: the gear didn't open Settings (to shut it with ${how})`);
      continue;
    }
    if (how === 'Esc') await b.keyboard.press('Escape');
    else if (how === 'its close button') await b.locator('#settings-dialog .dlg-head .hbtn').click();
    else await b.mouse.click(8, 450);
    await b.waitForTimeout(300);
    const after = await b.evaluate(() => ({
      open: document.getElementById('settings-dialog').open,
      back: !!document.activeElement?.classList.contains('hbtn-settings'),
    }));
    rep.push(`page scripts blocked, ${how}: ${JSON.stringify(after)}`);
    if (after.open) fails.push(`page scripts blocked: ${how} didn't shut Settings`);
    else if (!after.back) fails.push(`page scripts blocked: focus didn't go back to the gear after ${how}`);
  }
  await blocked.close();

  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const q = await ctx.newPage();
  await q.goto(url('index'));
  if (await q.locator('.hbtn-settings').isVisible())
    fails.push('no script: the gear shows, with nothing in Settings that works without script');
  const book = q.locator('[data-open="book-dialog"]:visible').first();
  await book.click();
  await q.waitForLoadState();
  const there = await q.evaluate(() => ({
    path: location.pathname + location.hash,
    form: !!document.querySelector('#message form[data-validate]'),
  }));
  rep.push(`no script, Book: ${JSON.stringify(there)}`);
  if (there.path !== '/contact#message' || !there.form)
    fails.push(`no script: a Book link went to ${there.path}, not the form at /contact#message`);
  await ctx.close();

  // with script: each close button gives focus back to what opened the pop-up
  const { ctx: c2, q: p, errs } = await home(browser);
  for (const [id, opener, close] of [
    ['settings-dialog', '.hbtn-settings', '#settings-dialog .dlg-head .hbtn'],
    ['book-dialog', '.hero [data-open="book-dialog"]', '#book-dialog .dlg-actions [data-close]'],
  ]) {
    await p.locator(opener).first().click();
    await p.waitForTimeout(500);
    await p.locator(close).click();
    await p.waitForTimeout(300);
    const after = await p.evaluate(
      ([id, sel]) => ({
        open: document.getElementById(id).open,
        back: document.activeElement === document.querySelector(sel),
      }),
      [id, opener],
    );
    rep.push(`script, ${id}: ${JSON.stringify(after)}`);
    if (after.open) fails.push(`script: the close button didn't shut #${id}`);
    else if (!after.back) fails.push(`script: focus didn't go back to ${opener} after #${id} closed`);
  }
  console.log(`pop-ups (J8): ${rep.join('; ')}`);
  await c2.close();
  verdict([...fails, ...errs]);
});

// J8 follow-up: with script, a pop-up's close button (Settings' is also command="close") shuts it once. core.js closes
// it and cancels the command; the command running after it made Chromium warn "A command attempted to close an
// already closed Dialog" on every click. No console warning or error from opening and closing either pop-up.
test('pop-ups: a close button closes once, with nothing in the console (J8)', async ({ browser }) => {
  const fails = [];
  const { ctx, q, errs } = await home(browser);
  const said = [];
  q.on('console', (m) => {
    if (m.type() === 'warning' || m.type() === 'error') said.push(`${m.type()}: ${m.text()}`);
  });
  for (const [opener, close] of [
    ['.hbtn-settings', '#settings-dialog .dlg-head .hbtn'],
    ['.hero [data-open="book-dialog"]', '#book-dialog .dlg-head .hbtn'],
    ['.hero [data-open="book-dialog"]', '#book-dialog .dlg-actions [data-close]'],
  ]) {
    await q.locator(opener).first().click();
    await q.waitForTimeout(500);
    await q.locator(close).click();
    await q.waitForTimeout(300);
    const open = await q.evaluate(() =>
      [...document.querySelectorAll('dialog')].filter((d) => d.open).map((d) => d.id),
    );
    if (open.length) fails.push(`${close} left ${open.join(', ')} open`);
  }
  for (const s of said) fails.push(`console ${s}`);
  console.log(`close buttons (J8): ${said.length} console message(s)`);
  await ctx.close();
  verdict([...fails, ...errs]);
});

// J9: a form error adds its id to the field's aria-describedby and takes only that id away again, so a field's own
// hint stays linked. No validated field has a hint today, so the check gives Book's email one.
test("form errors keep a field's own hint in aria-describedby (J9)", async ({ browser }) => {
  const fails = [];
  const { ctx, q, errs } = await home(browser);
  await q.locator('[data-open="book-dialog"]:visible').first().click();
  await q.evaluate(() => {
    const i = document.getElementById('book-email');
    const s = document.createElement('span');
    s.id = 'book-email-hint';
    s.textContent = 'We only use it to reply.';
    i.before(s);
    i.setAttribute('aria-describedby', 'book-email-hint');
  });
  const ids = () =>
    q.evaluate(() =>
      ['book-email', 'book-name'].map((id) => document.getElementById(id).getAttribute('aria-describedby')),
    );
  const seen = [];
  await q.fill('#book-email', 'nope');
  await q.locator('#book-name').focus(); // blur: the email is checked
  seen.push(await ids());
  await q.fill('#book-email', 'test@example.com'); // input on an invalid field: checked again
  seen.push(await ids());
  await q.locator('#book-dialog [type="submit"]').click(); // the name is empty: its error only
  seen.push(await ids());
  await q.fill('#book-name', 'Test Person');
  await q.fill('#book-email', 'nope');
  await q.locator('#book-name').focus();
  await q.fill('#book-email', 'test@example.com');
  await q.selectOption('#book-size', { index: 1 });
  await q.locator('#book-dialog [type="submit"]').click(); // sent: the form resets
  await q.waitForTimeout(300);
  seen.push(await ids());
  const want = [
    ['book-email-hint book-email-err', null],
    ['book-email-hint', null],
    ['book-email-hint', 'book-name-err'],
    ['book-email-hint', null],
  ];
  const step = ['email wrong', 'email fixed', 'sent with no name', 'sent'];
  want.forEach((w, i) => {
    if (JSON.stringify(seen[i]) !== JSON.stringify(w))
      fails.push(
        `${step[i]}: aria-describedby of email, name is ${JSON.stringify(seen[i])}, expected ${JSON.stringify(w)}`,
      );
  });
  console.log(`form errors (J9): ${JSON.stringify(seen)}`);
  await ctx.close();
  verdict([...fails, ...errs]);
});

// J15: Safari before 26.2 has no scrollend. A swipe that cuts short a Prev or Next slide must not leave the row
// stepping on from the card it was sliding to: the next press steps from the card showing. The check takes scrollend
// away before the page's scripts run.
test('services row without scrollend: Next steps from the card showing (J15)', async ({ browser }) => {
  const fails = [];
  const noScrollend = (ctx) =>
    ctx.addInitScript(() => {
      // Window's own handlers are on window itself (a global object), the others' on their prototypes
      for (const P of [window, Document.prototype, HTMLElement.prototype, SVGElement.prototype]) delete P.onscrollend;
      const add = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function (type, ...rest) {
        if (type !== 'scrollend') add.call(this, type, ...rest);
      };
    });
  const { ctx, q, errs } = await home(browser, { w: 390, h: 844, init: noScrollend });
  if (await q.evaluate(() => 'onscrollend' in window)) fails.push('the check could not take scrollend away');
  const row = q.locator('.svc-menu');
  await row.scrollIntoViewIfNeeded();
  const middle = () =>
    row.evaluate((e) => {
      const mid = e.getBoundingClientRect().left + e.clientWidth / 2;
      const d = (x) => Math.abs(x.getBoundingClientRect().left + x.getBoundingClientRect().width / 2 - mid);
      const kids = [...e.children];
      return kids.indexOf(kids.reduce((a, b) => (d(b) < d(a) ? b : a)));
    });
  await row.evaluate((e) => e.scrollBy({ left: e.querySelector('li').offsetWidth * 2, behavior: 'instant' }));
  await q.waitForTimeout(800);
  const start = await middle();
  // Next starts a slide to the card after; a swipe back to the first card cuts it short
  await q.evaluate(() => {
    document.querySelector('.svc-step[data-step="1"]').click();
    document.querySelector('.svc-menu').scrollTo({ left: 0, behavior: 'instant' });
  });
  await q.waitForTimeout(1000);
  const swiped = await middle();
  await q.locator('.svc-step[data-step="1"]').click();
  await q.waitForTimeout(1200);
  const next = await middle();
  console.log(`services row without scrollend (J15): start ${start}, after the swipe ${swiped}, after Next ${next}`);
  if (start !== 2 || swiped !== 0)
    fails.push(`setup: the row showed card ${start}, then ${swiped} after the swipe (expected 2, then 0)`);
  else if (next !== 1) fails.push(`Next after a swipe to card 0 went to card ${next}, not 1`);
  await ctx.close();
  verdict([...fails, ...errs]);
});

// J13: drawings that can't load. The hero shows the still office in place of its drawing, with no dashes (beams)
// over an empty stage and no pause button; a card picture that fails leaves no broken-image box.
test('hero and pictures when drawings fail to load (J13)', async ({ browser }) => {
  const fails = [];
  const block = async (ctx) => {
    await ctx.route(/\/assets\/img\/(hero-office[^/]*|[a-z]+-card)\.svg/, (r) => r.abort());
  };
  const { ctx, q } = await home(browser, { init: block });
  await q.waitForTimeout(800);
  const s = await q.evaluate(() => {
    const stage = document.querySelector('.hero-art .stage');
    const img = stage.querySelector('img');
    const shownEl = (e) =>
      !!e &&
      e.getClientRects().length > 0 &&
      getComputedStyle(e).display !== 'none' &&
      Number(getComputedStyle(e).opacity) > 0;
    const broken = [...document.images].filter(
      (i) => i.complete && !i.naturalWidth && i.getClientRects().length && Number(getComputedStyle(i).opacity) > 0,
    );
    return {
      still: img
        ? { src: img.getAttribute('src'), loaded: img.complete && img.naturalWidth > 0, shown: shownEl(img) }
        : null,
      beams: [...stage.querySelectorAll('svg.ob-over')].filter(shownEl).length,
      pause: shownEl(stage.querySelector('.hero-pause')),
      broken: broken.map((i) => i.getAttribute('src')),
    };
  });
  if (!s.still?.loaded || !s.still.shown)
    fails.push(`hero: no still office in place of the drawing: ${JSON.stringify(s.still)}`);
  if (s.beams) fails.push(`hero: ${s.beams} dashes layer(s) shown over a stage with no drawing`);
  if (s.pause) fails.push('hero: the pause button shows with nothing to pause');
  if (s.broken.length) fails.push(`${s.broken.length} broken-image box(es): ${s.broken.join(', ')}`);
  console.log(`drawings blocked: ${JSON.stringify(s)}`);
  await ctx.close();
  verdict(fails);
});

// B5: text in the fallback font takes the same room as Barlow, so nothing moves when the fonts arrive late. Linux has
// no Arial, so the fallback faces need Liberation Sans (CI's runner has it: Playwright installs it with Chromium).
for (const [page, w, h] of [
  ['index', 1440, 900],
  [MISSING, 390, 844],
]) {
  test(`font swap: no layout shift, ${page} ${w} (B5)`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    await ctx.route('**/assets/fonts/*.woff2', async (r) => {
      await new Promise((ok) => setTimeout(ok, 1500));
      await r.continue();
    });
    await ctx.addInitScript(() => {
      window.__cls = 0;
      new PerformanceObserver((l) =>
        l.getEntries().forEach((e) => {
          if (!e.hadRecentInput) window.__cls += e.value;
        }),
      ).observe({ type: 'layout-shift', buffered: true });
    });
    const q = await ctx.newPage();
    await q.goto(url(page));
    await q.waitForFunction(
      () =>
        document.fonts.status === 'loaded' &&
        [...document.fonts].some((f) => f.family.includes('Barlow') && f.status === 'loaded'),
      null,
      { timeout: 15000 },
    );
    await q.waitForTimeout(1000);
    const cls = await q.evaluate(() => window.__cls);
    await ctx.close();
    console.log(`font swap ${page} ${w}: CLS ${cls.toFixed(4)}`);
    verdict(cls > 0.01 ? [`${page} at ${w}: the late font moved the layout (CLS ${cls.toFixed(4)})`] : []);
  });
}

// B22, M7: on paper every Grow step shows, sections take their content's height whatever the screen (a page printed
// scaled down is laid out at a desktop width, where sections are a screen tall), forms, copy buttons and the buttons
// that open a pop-up go, while a card that opens one (Home's check-up card, Contact's "Book a check-up") prints its
// words, and a contact line stands in for the footer
for (const page of ['index', 'contact']) {
  test(`print ${page} (B22, M7)`, async ({ browser }) => {
    const fails = [];
    const ctx = await browser.newContext({ bypassCSP: true, viewport: { width: 1600, height: 1010 } }); // for the test's own style
    const q = await ctx.newPage();
    await q.goto(url(page));
    await q.waitForLoadState('networkidle');
    await q.emulateMedia({ media: 'print' });
    // the page's content laid out on two screen heights that meet the same media queries (desktop, landscape, wider
    // than 3:2, and the same --fold-pad step in tokens.css: both under 1080 tall): it must be the same length. Pictures are capped at 60vh on paper (a share of the page), so they're
    // held to one size for this comparison.
    await q.addStyleTag({ content: 'img, svg { max-height: 300px !important; }' });
    const tall = async (hh) => {
      await q.setViewportSize({ width: 1600, height: hh });
      await q.waitForTimeout(300);
      return q.evaluate(() => Math.round(document.querySelector('main').getBoundingClientRect().height));
    };
    const [a, b] = [await tall(1010), await tall(1060)];
    if (a !== b)
      fails.push(
        `${page} on paper is ${a}px long on a 1010px-tall screen and ${b}px on a 1060px one: sections keep a screen's height`,
      );
    const s = await q.evaluate(() => {
      const shown = (e) => e.getClientRects().length > 0;
      return {
        cards: [...document.querySelectorAll('.grow-card')].filter(shown).length,
        of: document.querySelectorAll('.grow-card').length,
        gone: [...document.querySelectorAll('form, .copy-btn, .btn[data-open], button[data-open]')]
          .filter(shown)
          .map((e) => e.className || e.tagName),
        cardsOpen: [...document.querySelectorAll('main .card[data-open]')]
          .map((e) => (shown(e) ? '' : e.textContent.trim()))
          .filter(Boolean),
        contact: [...document.querySelectorAll('.print-contact')]
          .filter(shown)
          .map((e) => e.textContent)
          .join(),
        footer: [...document.querySelectorAll('.site-footer')].filter(shown).length,
      };
    });
    if (s.footer) fails.push(`${page} on paper still shows the footer`);
    if (s.cards !== s.of) fails.push(`${page} on paper: ${s.cards} of ${s.of} Grow steps`);
    if (s.gone.length) fails.push(`${page} on paper still shows: ${s.gone.join(', ')}`);
    if (s.cardsOpen.length) fails.push(`${page} on paper drops a card's words: ${s.cardsOpen.join(' | ')}`);
    if (!/\d.*@/.test(s.contact))
      fails.push(`${page} on paper: no contact line (phone, email) in place of the footer: "${s.contact}"`);
    console.log(`print ${page}: ${a}px / ${b}px, ${JSON.stringify(s)}`);
    await ctx.close();
    verdict(fails);
  });
}

// M5: forms. Without script the copy buttons (which only script can work) don't show; every pattern has a title (the
// browser's own message for a pattern is "match the requested format", which says nothing without one); the Book
// pop-up's team size and Contact's topic start on a blank, required "Choose…", not on a guess; the Book pop-up says
// fields are required unless marked optional, as Contact does
test('forms: copy buttons without script, pattern titles, blank required choices (M5)', async ({ browser }) => {
  const fails = [];
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const q = await ctx.newPage();
  await q.goto(url('contact'));
  const s = await q.evaluate(() => ({
    copy: [...document.querySelectorAll('.copy-btn')].filter((b) => b.getClientRects().length).length,
    untitled: [...document.querySelectorAll('input[pattern]')].filter((i) => !i.title).map((i) => `#${i.id}`),
    choose: ['book-size', 'c-topic'].map((id) => {
      const sel = document.getElementById(id);
      return { id, required: sel.required, first: sel.options[0].value, picked: sel.value };
    }),
    note: /required unless marked optional/i.test(document.getElementById('book-dialog').textContent),
  }));
  if (s.copy) fails.push(`contact without script: ${s.copy} copy button(s) shown that can't copy`);
  if (s.untitled.length) fails.push(`input(s) with a pattern and no title: ${s.untitled.join(', ')}`);
  for (const c of s.choose)
    if (!c.required || c.first !== '' || c.picked !== '')
      fails.push(`#${c.id} doesn't start on a blank, required choice: ${JSON.stringify(c)}`);
  if (!s.note) fails.push("the Book pop-up doesn't say fields are required unless marked optional");
  console.log(`forms: ${JSON.stringify(s)}`);
  await ctx.close();
  verdict(fails);
});

// M11, B4 (layout plan D5): the /work filters are one radio group (a fieldset named by its legend), "All" checked,
// each option named with its count ("Build, 3"). Without script, choosing one hides the other cards (CSS :has()) and
// "All" brings them back; the arrow keys move the choice, and Tab leaves the group in one step. In forced colours the
// checked chip still looks different from the rest (a colour change that isn't only transparency). axe passes with
// a filter chosen. They used to be aria-pressed buttons that needed work.js and were hidden without it.
test('work filters: a radio group that works without script, keys, forced colours, axe (M11, B4)', async ({
  browser,
}) => {
  const fails = [];
  const rep = [];
  const shown = (q) =>
    q.$$eval('.work-grid > li', (ls) => ls.filter((l) => l.getClientRects().length).map((l) => l.dataset.tags));
  for (const [w, h] of [
    [390, 844],
    [1440, 900],
  ]) {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: w, height: h } });
    const q = await ctx.newPage();
    await q.goto(url('work'));
    const all = await q.$$eval('.work-grid > li', (ls) => ls.map((l) => l.dataset.tags));
    const s = await q.evaluate(() => {
      const radios = [...document.querySelectorAll('.filters input[type="radio"]')];
      const set = radios[0]?.closest('fieldset');
      return {
        n: radios.length,
        names: [...new Set(radios.map((r) => r.name))],
        grouped: !!set && radios.every((r) => r.closest('fieldset') === set),
        legend: set?.querySelector(':scope > legend')?.textContent.trim() || '',
        checked: radios.filter((r) => r.checked).map((r) => r.value),
        values: radios.map((r) => r.value),
        onScreen: radios.length > 0 && radios[0].closest('label').getClientRects().length > 0,
      };
    });
    // forced colours: the chip chosen at load ("All") against another, with alpha set aside (the theme keeps it, so a
    // white chip at 70% on a white page looks the same as one at 5%)
    await q.emulateMedia({ forcedColors: 'active' });
    await q.waitForTimeout(400); // a colour transition, if any
    const fc = await q.evaluate(() => {
      const rgb = (c) => (c.match(/[\d.]+/g) || []).slice(0, 3).join(',');
      const look = (e) => {
        const c = getComputedStyle(e);
        return { color: rgb(c.color), bg: rgb(c.backgroundColor), border: c.borderTopWidth, outline: c.outlineStyle };
      };
      const chips = [...document.querySelectorAll('.filters .filter')];
      const on = chips.find((c) => c.matches(':has(:checked), [aria-pressed="true"]'));
      const off = chips.find((c) => c !== on);
      return { on: on && look(on), off: off && look(off) };
    });
    if (!fc.on || JSON.stringify(fc.on) === JSON.stringify(fc.off))
      fails.push(`forced colours, ${w}: the checked filter looks like the others: ${JSON.stringify(fc)}`);
    else if (fc.on.color === fc.on.bg)
      fails.push(
        `forced colours, ${w}: the checked filter's words are the colour of its background: ${JSON.stringify(fc.on)}`,
      );
    rep.push(`forced colours ${w}: ${JSON.stringify(fc)}`);
    await q.emulateMedia({ forcedColors: 'none' });
    if (s.n < 2) {
      fails.push(`no script, ${w}: ${s.n} filter radio(s) in .filters`);
      await ctx.close();
      continue;
    }
    if (s.names.length !== 1 || !s.names[0])
      fails.push(`no script, ${w}: the radios aren't one named group: names ${JSON.stringify(s.names)}`);
    if (!s.grouped || !s.legend)
      fails.push(`no script, ${w}: the radios aren't in one fieldset with a legend (${JSON.stringify(s.legend)})`);
    if (!s.onScreen) fails.push(`no script, ${w}: the filters don't show`);
    if (JSON.stringify(s.checked) !== '["all"]')
      fails.push(`no script, ${w}: checked at load ${JSON.stringify(s.checked)}, not "all"`);
    // each radio's accessible name ends in its count, and the count is the cards it shows
    const tree = await q.getByRole('group', { name: s.legend }).ariaSnapshot();
    const named = [...tree.matchAll(/- radio "([^"]+)"/g)].map((m) => m[1]);
    if (named.length !== s.n)
      fails.push(`no script, ${w}: ${named.length} radio(s) in the group "${s.legend}", not ${s.n}`);
    const labels = q.locator('.filters label');
    for (let i = 0; i < s.n; i++) {
      await labels.nth(i).click();
      const on = await shown(q);
      const key = s.values[i];
      const want = all.filter((t) => key === 'all' || t.split(' ').includes(key));
      if (JSON.stringify(on) !== JSON.stringify(want))
        fails.push(`no script, ${w}: "${key}" chosen shows ${JSON.stringify(on)}, not ${JSON.stringify(want)}`);
      const count = Number((named[i] || '').match(/,\s*(\d+)$/)?.[1]);
      if (count !== want.length)
        fails.push(`no script, ${w}: radio "${named[i]}" doesn't end in its count, ${want.length}`);
    }
    await labels.first().click();
    if ((await shown(q)).length !== all.length)
      fails.push(`no script, ${w}: "All" chosen again doesn't show every project`);
    // keys: the arrow moves the choice (and the cards follow); the chip shows the focus ring; Tab leaves the group
    await q.locator('.filters input:checked').focus();
    await q.keyboard.press('ArrowRight');
    const k = await q.evaluate(() => {
      const a = document.activeElement;
      return { value: a.value, checked: a.checked, ring: getComputedStyle(a.closest('label')).outlineStyle };
    });
    const afterKey = await shown(q);
    if (k.value !== s.values[1] || !k.checked)
      fails.push(
        `no script, ${w}: ArrowRight from "All" left ${JSON.stringify(k)} focused, not "${s.values[1]}" checked`,
      );
    if (afterKey.length === all.length)
      fails.push(`no script, ${w}: ArrowRight to "${s.values[1]}" didn't filter the cards`);
    if (k.ring === 'none') fails.push(`no script, ${w}: the focused chip shows no focus ring`);
    await q.keyboard.press('Tab');
    const out = await q.evaluate(() => !document.activeElement.closest('.filters'));
    if (!out) fails.push(`no script, ${w}: Tab from the checked radio stayed in the group`);
    rep.push(
      `no script ${w}: ${s.n} radios "${s.names[0]}" in "${s.legend}", names ${JSON.stringify(named)}, ArrowRight -> ${k.value} (${afterKey.length} shown)`,
    );
    await ctx.close();
  }
  // axe, with a filter chosen (axe needs script)
  const ctx = await browser.newContext({ bypassCSP: true, viewport: { width: 1440, height: 900 } });
  const q = await ctx.newPage();
  await q.goto(url('work'));
  await q.locator('.filters .filter').nth(1).click();
  await q.waitForTimeout(300);
  const v = (await axe(q).analyze()).violations;
  for (const x of axeFails(v)) fails.push(`axe, a filter chosen: [${x.impact}] ${x.id}`);
  rep.push(`axe with a filter chosen: ${v.length} violation(s)`);
  await ctx.close();
  console.log(`work filters:\n  ${rep.join('\n  ')}`);
  verdict(fails);
});

// B4, WCAG 2.4.7: in forced colours, dark and light, without script, as pixels (the theme's readability backplate
// sits behind the words in Canvas, which computed styles don't show): the checked chip's word is legible (its box
// holds two clearly different colours, not one solid block), and the focus ring round the focused chip (with radios,
// always the checked one) isn't the page's Canvas colour. On paper a chosen filter doesn't filter: the filters don't
// print, so every project does.
test('work filters: forced colours legible as pixels, focus ring, print shows every project (B4)', async ({
  browser,
}) => {
  const fails = [];
  const rep = [];
  const far = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2])) > 96;
  const pixels = (buf) => {
    const png = PNG.sync.read(buf);
    const out = [];
    for (let i = 0; i < png.data.length; i += 4) out.push([png.data[i], png.data[i + 1], png.data[i + 2]]);
    return { w: png.width, h: png.height, px: out };
  };
  for (const scheme of ['dark', 'light']) {
    for (const [w, h] of [
      [390, 844],
      [1440, 900],
    ]) {
      const ctx = await browser.newContext({
        javaScriptEnabled: false,
        viewport: { width: w, height: h },
        deviceScaleFactor: 2,
      });
      const q = await ctx.newPage();
      await q.emulateMedia({ forcedColors: 'active', colorScheme: scheme });
      await q.goto(url('work'));
      await q.evaluate(() => document.fonts.ready);
      const chip = q.locator('.filters .filter:has(:checked), .filters .filter[aria-pressed="true"]').first();
      if (!(await chip.count()) || !(await chip.isVisible())) {
        fails.push(`forced colours ${scheme} ${w}: no checked filter on screen`);
        await ctx.close();
        continue;
      }
      await chip.scrollIntoViewIfNeeded();
      // the word's own box (its text node), shot as pixels: the commonest colour, and the share far from it
      const word = await chip.evaluate((c) => {
        const t = [...c.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
        const r = document.createRange();
        r.selectNodeContents(t);
        const b = r.getBoundingClientRect();
        return { text: t.textContent.trim(), x: b.x, y: b.y, width: b.width, height: b.height };
      });
      const shot = pixels(
        await q.screenshot({ clip: { x: word.x, y: word.y, width: word.width, height: word.height } }),
      );
      const tally = new Map();
      for (const p of shot.px) tally.set(p.join(), (tally.get(p.join()) || 0) + 1);
      const main = [...tally]
        .sort((a, b) => b[1] - a[1])[0][0]
        .split(',')
        .map(Number);
      const ink = shot.px.filter((p) => far(p, main)).length / shot.px.length;
      if (ink < 0.08)
        fails.push(
          `forced colours ${scheme} ${w}: the checked chip's "${word.text}" is one block of rgb(${main}) (${(ink * 100).toFixed(1)}% of it another colour)`,
        );
      // the focus ring: Tab into the group from just before it lands on the checked radio
      await chip.locator('input').focus();
      await q.keyboard.press('Shift+Tab');
      await q.keyboard.press('Tab');
      const ring = await chip.evaluate((c) => {
        const probe = document.createElement('div');
        probe.style.backgroundColor = 'Canvas';
        probe.style.forcedColorAdjust = 'none';
        document.body.append(probe);
        const canvas = getComputedStyle(probe).backgroundColor;
        probe.remove();
        const s = getComputedStyle(c);
        const b = c.getBoundingClientRect();
        return {
          focused: c.contains(document.activeElement),
          style: s.outlineStyle,
          color: s.outlineColor,
          width: parseFloat(s.outlineWidth),
          offset: parseFloat(s.outlineOffset),
          canvas,
          x: b.x,
          y: b.y,
          w: b.width,
          h: b.height,
        };
      });
      const rgb = (c) => (c.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      if (!ring.focused) fails.push(`forced colours ${scheme} ${w}: Tab into the filters didn't focus the checked one`);
      else if (ring.style === 'none' || !far(rgb(ring.color), rgb(ring.canvas)))
        fails.push(
          `forced colours ${scheme} ${w}: the focus ring is ${ring.style} ${ring.color}, on a Canvas of ${ring.canvas}`,
        );
      else {
        // and as pixels: a line across the chip's middle, just outside its left edge, in the ring's band
        const at = ring.x - ring.offset - ring.width / 2;
        const band = pixels(
          await q.screenshot({ clip: { x: at - 0.5, y: ring.y + ring.h / 2 - 2, width: 1, height: 4 } }),
        );
        const seen = band.px.filter((p) => far(p, rgb(ring.canvas))).length / band.px.length;
        if (seen < 0.5)
          fails.push(
            `forced colours ${scheme} ${w}: no focus ring to be seen beside the chip (${(seen * 100).toFixed(0)}% off Canvas ${ring.canvas})`,
          );
      }
      rep.push(
        `forced colours ${scheme} ${w}: "${word.text}" ${(ink * 100).toFixed(1)}% ink on rgb(${main}); ring ${ring.style} ${ring.color} on ${ring.canvas}`,
      );
      await ctx.close();
    }
  }
  // print, with a filter chosen
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const q = await ctx.newPage();
  await q.goto(url('work'));
  const labels = q.locator('.filters label');
  if (await labels.count()) await labels.nth(1).click();
  await q.emulateMedia({ media: 'print' });
  const p = await q.$$eval('.work-grid > li', (ls) => ({
    all: ls.length,
    shown: ls.filter((l) => l.getClientRects().length).length,
  }));
  if (p.shown !== p.all) fails.push(`print with a filter chosen: ${p.shown} of ${p.all} projects print`);
  rep.push(`print with a filter chosen: ${p.shown} of ${p.all} projects`);
  await ctx.close();
  console.log(`work filters, forced colours and print:\n  ${rep.join('\n  ')}`);
  verdict(fails);
});

// B4: forced colours (Windows contrast themes) keep the other states the filters' test doesn't cover: Grow's open step
// (its dot on phones, its row on desktop), the services row's current dot, the pressed pause button's play icon and
// the bottom bar's current tab. Each, as the browser paints it, is filled (at least half opaque: the theme keeps a
// fill's alpha, so a 9% tint stays a 9% tint), differs from its neighbour in the off state, and isn't the colour of
// the page (a dot painted Canvas on Canvas is gone).
test('forced colours: Grow step, dots, pause icon, current tab (B4)', async ({ browser }) => {
  const fails = [];
  const rep = [];
  for (const scheme of ['dark', 'light']) {
    for (const [w, h] of [
      [390, 844],
      [1440, 900],
    ]) {
      // motion on: the pause buttons show only then
      const ctx = await browser.newContext({
        viewport: { width: w, height: h },
        forcedColors: 'active',
        colorScheme: scheme,
      });
      const q = await ctx.newPage();
      await q.goto(url('index'));
      await q.waitForLoadState('networkidle');
      await q.locator('#grow').scrollIntoViewIfNeeded();
      await q.locator('#grow :is(.grow-dot, .grow-item):visible').nth(2).click();
      const hold = q.locator('.hold:visible').first();
      if (await hold.count()) await hold.click();
      await q.waitForTimeout(500); // the dots' and rows' colour transitions
      const s = await q.evaluate(() => {
        const bg = (e) => (e ? getComputedStyle(e).backgroundColor : 'none');
        const probe = document.createElement('div');
        probe.style.backgroundColor = 'Canvas';
        probe.style.forcedColorAdjust = 'none';
        document.body.append(probe);
        const canvas = getComputedStyle(probe).backgroundColor;
        probe.remove();
        const vis = (sel) => [...document.querySelectorAll(sel)].filter((e) => e.checkVisibility());
        const pair = (on, off) => ({ on: bg(vis(on)[0]), off: bg(vis(off)[0]), shown: vis(on).length > 0 });
        return {
          canvas,
          states: {
            'Grow dot': pair('#grow .grow-dot[aria-current] .pip', '#grow .grow-dot:not([aria-current]) .pip'),
            'Grow row': pair('#grow .grow-item[aria-current]', '#grow .grow-item:not([aria-current])'),
            'services dot': pair('.svc-dots .pip.on', '.svc-dots .pip:not(.on)'),
            'pause icon': {
              on: bg(vis('.hold[aria-pressed="true"] .hold-icon')[0]),
              off: canvas,
              shown: vis('.hold[aria-pressed="true"] .hold-icon').length > 0,
            },
            'current tab': pair('.botnav .bn[aria-current]', '.botnav .bn:not([aria-current])'),
          },
        };
      });
      for (const [k, v] of Object.entries(s.states)) {
        if (!v.shown) continue; // not at this width (the dots on phones, the rows on desktop)
        const alpha = Number((v.on.match(/rgba\([^)]*,\s*([\d.]+)\)/) || [0, 1])[1]); // the theme keeps a fill's alpha
        if (v.on === v.off || v.on === s.canvas || alpha < 0.5)
          fails.push(`forced colours ${scheme} ${w}: ${k} on ${v.on}, off ${v.off}, page ${s.canvas}`);
        rep.push(`${scheme} ${w} ${k}: on ${v.on}, off ${v.off}`);
      }
      await ctx.close();
    }
  }
  console.log(`forced colours:\n  ${rep.join('\n  ')}`);
  verdict(fails);
});

// WCAG 1.4.11 (non-text contrast): on a phone each dot in Grow's step row and the services row is the only visible
// part of its control, so every state (Grow: done, current, not reached; services: current, off) is at least 3:1
// against what is behind it. The dot's colour is its fill at its alpha times its own and its ancestors' opacity; the
// backdrop is the pixel under its centre, read from a screenshot with the dots hidden.
test('non-text contrast: Grow and services dots, every state, 3:1 (WCAG 1.4.11)', async ({ browser }) => {
  const fails = [];
  const rep = [];
  const q = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await q.goto(url('index'));
  await q.waitForLoadState('networkidle');
  const lum = (c) => {
    const [r, g, b] = c.map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
    return (x + 0.05) / (y + 0.05);
  };
  const look = async (name, sel, state) => {
    await q.locator(sel).first().scrollIntoViewIfNeeded();
    await q.mouse.move(0, 0);
    await q.waitForTimeout(400); // the dots' colour and opacity transitions
    const dots = await q.$$eval(sel, (els) =>
      els.map((e) => {
        const m = getComputedStyle(e)
          .backgroundColor.match(/[\d.]+/g)
          .map(Number);
        let a = m[3] ?? 1;
        for (let n = e; n; n = n.parentElement) a *= Number(getComputedStyle(n).opacity);
        const r = e.getBoundingClientRect();
        return { state: e.dataset.state, fill: m.slice(0, 3), a, x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }),
    );
    const hide = (v) =>
      q.$$eval(sel, (els, v) => els.forEach((e) => e.style.setProperty('visibility', v, 'important')), v);
    await hide('hidden');
    const png = PNG.sync.read(await q.screenshot());
    await hide('');
    const seen = new Set();
    for (const d of dots) {
      const k = state(d);
      if (seen.has(k)) continue;
      seen.add(k);
      const i = (Math.round(d.y) * png.width + Math.round(d.x)) * 4;
      const back = [png.data[i], png.data[i + 1], png.data[i + 2]];
      const ink = d.fill.map((v, j) => v * d.a + back[j] * (1 - d.a));
      const r = ratio(ink, back);
      rep.push(`${name} ${k}: ${r.toFixed(2)}:1 (rgb ${ink.map(Math.round)} on rgb ${back})`);
      if (r < 3) fails.push(`${name} ${k} dot ${r.toFixed(2)}:1 against rgb ${back}, under 3:1`);
    }
  };
  // Grow: pick the third step, so two are done, one is current and three are not reached
  await q.locator('#grow').scrollIntoViewIfNeeded();
  await q.locator('#grow .grow-dot:visible').nth(2).click();
  await q.$$eval('#grow .grow-dot', (bs) =>
    bs.forEach((b) => {
      const pip = /** @type {HTMLElement} */ (b.querySelector('.pip'));
      pip.dataset.state = b.matches('[aria-current="step"]')
        ? 'current'
        : b.classList.contains('is-done')
          ? 'done'
          : 'not reached';
    }),
  );
  await look('Grow', '#grow .grow-dot .pip', (d) => d.state);
  await q.$$eval('.svc-dots .pip', (ps) =>
    ps.forEach((p) => (p.dataset.state = p.classList.contains('on') ? 'current' : 'off')),
  );
  await look('services', '.svc-dots .pip', (d) => d.state);
  for (const want of ['Grow done', 'Grow current', 'Grow not reached', 'services current', 'services off'])
    if (!rep.some((r) => r.startsWith(want + ':'))) fails.push(`${want}: no such dot on the page`);
  await q.close();
  console.log(`dot contrast:\n  ${rep.join('\n  ')}`);
  verdict(fails);
});

// WCAG 1.4.13 (content on hover or focus): the "View service" bar a Home service tile slides up on hover or keyboard
// focus covers none of the tile's words (its title, line or tag), at 1440x900 and at 200% zoom on it.
test('services tiles: the hover bar covers no words, hover and focus (WCAG 1.4.13)', async ({ browser }) => {
  const fails = [];
  for (const zoom of [1, 2]) {
    const ctx = await browser.newContext({
      viewport: { width: 1440 / zoom, height: 900 / zoom },
      deviceScaleFactor: zoom,
    });
    const q = await ctx.newPage();
    await q.goto(url('index'));
    await q.evaluate(() => document.fonts.ready);
    const tiles = q.locator('#services .svc-tile');
    for (let i = 0; i < (await tiles.count()); i++) {
      const tile = tiles.nth(i);
      for (const how of ['hover', 'focus']) {
        await tile.scrollIntoViewIfNeeded();
        if (how === 'hover') await tile.hover();
        else {
          await q.mouse.move(0, 0);
          await q.keyboard.press('Shift'); // a key, so the focus that follows is a keyboard one (:focus-visible)
          await tile.focus();
        }
        await q.waitForTimeout(400); // the bar's slide and the lift
        const out = await tile.evaluate((t, how) => {
          const go = /** @type {Element} */ (t.querySelector('.svc-go')).getBoundingClientRect();
          if (how === 'focus' && !t.matches(':focus-visible')) return ['not :focus-visible'];
          if (getComputedStyle(/** @type {Element} */ (t.querySelector('.svc-go'))).clipPath.includes('100%'))
            return ['bar not shown'];
          const hit = [];
          for (const w of t.querySelectorAll('.svc-title, .svc-line, .chip')) {
            const r = w.getBoundingClientRect();
            if (r.width <= 1 || r.height <= 1 || !w.checkVisibility()) continue; // the small tiles' line is for screen readers only
            const over = Math.min(r.bottom, go.bottom) - Math.max(r.top, go.top);
            if (over > 0.5 && Math.min(r.right, go.right) > Math.max(r.left, go.left))
              hit.push(`covers ${over.toFixed(1)}px of "${w.textContent.trim().slice(0, 24)}"`);
          }
          return hit;
        }, how);
        if (how === 'focus') await tile.blur();
        const name = (await tile.locator('.svc-title').textContent()).trim();
        for (const h of out) fails.push(`${zoom * 100}% zoom, ${how}, ${name}: ${h}`);
      }
    }
    await ctx.close();
  }
  verdict(fails);
});

// B10: each drawing a page inserts carries ?v=, a hash of the file as served (after SVGO), so a drawing whose shrunk
// output changes gets a new address and a visitor's cached copy can't meet a CSP without its style hash
test("drawing addresses: ?v= is the served file's hash (B10)", async () => {
  const html = await (await fetch(BASE + '/')).text();
  const urls = [
    ...new Set(
      [...html.matchAll(/data-[a-z-]+="(\/assets\/img\/[^"?]+\.svg)\?v=([0-9a-f]+)"/g)].map((m) => `${m[1]}?v=${m[2]}`),
    ),
  ];
  const fails =
    urls.length < 4
      ? [`Home inserts ${urls.length} drawing(s) with a ?v= (expected the hero cuts and the campus map)`]
      : [];
  for (const u of urls) {
    const [path, v] = u.split('?v=');
    const body = Buffer.from(await (await fetch(BASE + path)).arrayBuffer());
    const got = createHash('sha1').update(body).digest('hex').slice(0, 8);
    if (got !== v) fails.push(`${path}: ?v=${v}, but the file served hashes to ${got}`);
  }
  console.log(`drawing addresses: ${urls.join(' ')}`);
  verdict(fails);
});

// C15: the Markdown copies say what the pages say: team names apart from their roles, a case study's services as
// links, Contact's hours under a heading of their own, and Home's contact lines from the footer data
test('Markdown copies: team, facts links, hours heading, Home contact (C15)', async () => {
  const md = async (path) => (await fetch(BASE + path)).text();
  const fails = [];
  const team = (await md('/about.md')).split('\n## ').find((s) => s.startsWith('The people who pick up')) || '';
  const people = team.split('\n').filter((l) => l.startsWith('- '));
  if (!people.length || people.some((l) => !/^- [^,]+, \S/.test(l)))
    fails.push(`/about.md team lines run names into roles: ${people.join(' | ')}`);
  if (!/^- Services: \[[^\]]+\]\(https?:\/\/[^)]+\/services\/[a-z-]+\)/m.test(await md('/work/office-move.md')))
    fails.push('/work/office-move.md: Services are not links');
  if (!/^## Hours and office\n\n- Monday to Friday: /m.test(await md('/contact.md')))
    fails.push('/contact.md: the hours have no heading');
  const home = await md('/index.md');
  const html = await (await fetch(BASE + '/contact')).text();
  const tel = html.match(/href="(tel:\+\d+)"/)?.[1];
  if (!home.includes('- Languages: English, French')) fails.push('/index.md: not "Languages: English, French"');
  if (!tel || !home.includes(`](${tel})`)) fails.push(`/index.md: phone link is not ${tel}, the one /contact shows`);
  if (/\{[a-z]+\}/i.test(home)) fails.push(`/index.md: placeholder left: ${home.match(/\{[a-z]+\}/i)[0]}`);
  verdict(fails);
});

// M3: a card in a list of cards (services, projects, help cards) has its title as a heading holding its link, so
// heading navigation lands on each one, and the link still covers the card (a click near its corner opens it). No
// heading in <main> skips a level. M10: what a link shows is in its name (nothing with words aria-hidden inside a
// link), and no chip is hidden from screen readers.
test('cards: titles are headings, chips are heard (M3, M10)', async ({ browser }) => {
  const fails = [];
  const q = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  for (const page of ['index', 'services', 'work', 'contact', 'services/security']) {
    await q.goto(url(page));
    const r = await q.evaluate(() => {
      const out = [];
      let prev = 1;
      for (const h of document.querySelectorAll('main :is(h1, h2, h3, h4, h5, h6)')) {
        const n = Number(h.tagName[1]);
        if (n > prev + 1) out.push(`${h.tagName.toLowerCase()} "${h.textContent.trim()}" follows an h${prev}`);
        prev = n;
      }
      const cards = [
        ...document.querySelectorAll('main :is(.svc-grid, .work-grid, .card-row, .svc-cards) > li > .card'),
      ];
      for (const card of cards) {
        const name = card.querySelector('.card-title')?.textContent.trim() || card.textContent.trim().slice(0, 30);
        const link = card.querySelector(':is(h2, h3) > a[href]');
        if (!link) {
          out.push(`card "${name}": its title is not a heading holding its link`);
          continue;
        }
        card.scrollIntoView({ block: 'center', behavior: 'instant' });
        const b = card.getBoundingClientRect();
        const at = document.elementFromPoint(b.right - 6, b.bottom - 6);
        if (at?.closest('a') !== link)
          out.push(`card "${name}": a click near its corner reaches ${at?.outerHTML.slice(0, 60)}, not its link`);
      }
      for (const a of document.querySelectorAll('main a[href]')) {
        for (const x of a.querySelectorAll('[aria-hidden="true"]'))
          if (/\p{L}/u.test(x.textContent))
            out.push(`link "${a.textContent.trim().slice(0, 40)}": "${x.textContent.trim()}" is shown but aria-hidden`);
      }
      for (const c of document.querySelectorAll('main .chip'))
        if (c.closest('[aria-hidden="true"]')) out.push(`chip "${c.textContent.trim()}" is aria-hidden`);
      return { out, cards: cards.length };
    });
    if (!r.cards) fails.push(`${page}: no cards found`);
    fails.push(...r.out.map((x) => `${page}: ${x}`));
  }
  await q.close();
  verdict(fails);
});

// M9: every page links both icons, the .ico for browsers without SVG icons, and both answer with an image
test('favicons: .ico and .svg linked and served (M9)', async () => {
  const fails = [];
  for (const path of ['/', '/about', '/services/help-desk']) {
    const html = await (await fetch(BASE + path)).text();
    if (!html.includes('<link rel="icon" href="/favicon.ico" sizes="32x32">'))
      fails.push(`${path}: no <link rel="icon"> for /favicon.ico`);
    if (!html.includes('<link rel="icon" href="/favicon.svg" type="image/svg+xml">'))
      fails.push(`${path}: no <link rel="icon"> for /favicon.svg`);
  }
  for (const icon of ['/favicon.ico', '/favicon.svg']) {
    const r = await fetch(BASE + icon);
    if (!r.ok || !/^image\//.test(r.headers.get('content-type') || ''))
      fails.push(`${icon}: ${r.status} ${r.headers.get('content-type')}`);
  }
  verdict(fails);
});

// B18, B20: a heading or big number never breaks inside a word. Headings and stat numbers size to their column
// (--fit, cqi), so "CYBERSECURITY" on /services/security at 1024 to 1099 and "3,400" on /about with a 32px default
// font stay whole. Every page at five widths and, with a 32px default font, at 320 and 390; plus /services/security
// at 1024 to 1099, where the review found it, and Home at 1440 x 900 with 200% browser zoom ("CYBERSECURIT / Y" on a
// Home service tile). h3s and the Home service tiles' titles (.svc-title) count too. A break after a hyphen
// ("Ransomware-/ready") is a normal line break, not a split. And every heading with a word of LONG letters or more
// carries the class fit (src/lib/fit.js), so one written into a page by hand without fit() can't slip through.
const WORDS = () => {
  const out = [];
  // headings without the class fit, for the long-word test in Node
  const plain = [
    ...document.querySelectorAll(
      'h1:not(.fit), h2:not(.fit), main h3:not(.fit), .fc-head h3:not(.fit), .svc-title:not(.fit)',
    ),
  ]
    .filter((h) => !h.closest('dialog'))
    .map((h) => `${h.tagName.toLowerCase()} "${h.textContent.trim()}"`);
  for (const h of document.querySelectorAll('h1, h2, main h3, .fc-panel.is-on h3, .stat-val, .svc-title')) {
    if (!h.getClientRects().length || h.closest('.sr-only, dialog:not([open])')) continue;
    const tw = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
    for (let t; (t = tw.nextNode());) {
      for (const m of t.data.matchAll(/[^\s-]+-?/g)) {
        const r = document.createRange();
        r.setStart(t, m.index);
        r.setEnd(t, m.index + m[0].length);
        if (new Set([...r.getClientRects()].filter((x) => x.width).map((x) => Math.round(x.top))).size > 1)
          out.push(`${h.tagName.toLowerCase()} "${m[0]}"`);
      }
    }
  }
  return [out, plain];
};
// one test per page, so the shards (README, "CI") share the work evenly
for (const page of PAGES) {
  test(`headings and numbers: no word split across lines, ${page} (B18, B20)`, async ({ browser }) => {
    const jobs = [
      ...[320, 768, 1060, 1440, 2560].map((w) => [w, 0]),
      ...(page === 'services/security' ? [1024, 1040, 1080, 1099].map((w) => [w, 0]) : []),
      ...[320, 390].map((w) => [w, 32]),
      ...(page === 'index' ? [[1440, 0, 2]] : []), // 200% zoom: a 720 x 450 screen drawn at 2 device px each (as zoom.spec.mjs)
    ];
    const fails = (
      await lanes(jobs, 4, async ([w, font, zoom = 1]) => {
        const h = w > 1000 ? 900 : 800;
        const ctx = await browser.newContext({
          viewport: { width: w / zoom, height: h / zoom },
          deviceScaleFactor: zoom,
        });
        const q = await ctx.newPage();
        if (font)
          await (await ctx.newCDPSession(q)).send('Page.setFontSizes', { fontSizes: { standard: font, fixed: font } });
        await q.goto(url(page));
        await q.evaluate(() => document.fonts.ready);
        const [split, plain] = await q.evaluate(WORDS);
        for (const h of plain)
          if (longest(h) >= LONG) split.push(`${h} has a word of ${LONG} letters or more but no class fit`);
        await ctx.close();
        return split.length
          ? `${page} at ${w}${font ? ` (${font}px default font)` : ''}${zoom > 1 ? ` (${zoom * 100}% zoom)` : ''}: ${split.join(', ')}`
          : null;
      })
    ).filter(Boolean);
    verdict(fails);
  });
}

// C1 (layout phase 4: text in rem, the room round it from the screen). Home on desktop windows people use: the hero is
// one wheel step tall and its menu and news cards are on the first screen; every Home section starts on the 100px
// wheel grid (its top under the header a multiple of 100). The hero's news cards at 1100 to 1240 wide (where the
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
test('Home: hero on the first screen, sections on the wheel grid (C1)', async ({ browser }) => {
  const fails = (
    await lanes(FIRST, 4, async ([w, h]) => {
      const q = await browser.newPage({ viewport: { width: w, height: h } });
      await q.goto(url('index'));
      await q.waitForLoadState('networkidle');
      await q.evaluate(() => document.fonts.ready);
      const r = await q.evaluate(() => {
        const out = [];
        const head = document.querySelector('.site-header').getBoundingClientRect().height;
        const probe = document.createElement('div');
        probe.style.height = 'var(--fold-pitch)';
        document.body.append(probe);
        const pitch = probe.getBoundingClientRect().height;
        probe.remove();
        const hero = document.querySelector('#top').getBoundingClientRect();
        if (hero.height > pitch + 1)
          out.push(`hero ${Math.round(hero.height)}px tall, more than one wheel step (${Math.round(pitch)}px)`);
        for (const sel of ['.hero-menu .menu li:last-child', '.hero-cta', '.hero-dock']) {
          const e = document.querySelector(sel);
          if (!e || !e.getClientRects().length) continue;
          const b = e.getBoundingClientRect().bottom;
          if (b > innerHeight + 1)
            out.push(`${sel} ends at ${Math.round(b)}px, below the first screen (${innerHeight}px)`);
        }
        for (const s of document.querySelectorAll('main > section.fold')) {
          const t = s.getBoundingClientRect().top + scrollY - head;
          if (Math.abs(t - Math.round(t / 100) * 100) > 1)
            out.push(`#${s.id} starts ${Math.round(t)}px under the header, off the 100px wheel grid`);
        }
        return out;
      });
      await q.close();
      return r.length ? `${w}x${h}: ${r.join('; ')}` : null;
    })
  ).filter(Boolean);
  verdict(fails);
});
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
