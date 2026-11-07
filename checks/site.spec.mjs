// The browser check against the built site (npm run verify; CI runs it on every push and pull request before deploy).
// Home (the page being worked on, FOCUS) gets everything: hero, Grow, footer tabs, the per-page checks at every size,
// and an axe pass at phone and desktop. Every other page (every page the build wrote: lib.mjs pages) gets the
// per-page checks at phone size and an axe pass. --all gives every page the full treatment. On every page, at
// every size it runs at:
//   script errors   watched until the network is idle and a few seconds after (3 s; Home 5 s, for the hero's
//                   captions), then while the screen turns (portrait to landscape and back) and while each of the
//                   page's own buttons is pressed (pause, Grow, filters, footer tabs, copy buttons)
//   markup          exactly one <h1>; every JSON-LD block parses
//   sideways scroll scrolled to its footer (the 404 page has none: Base.astro footer={false}, so to its end); and
//                   separately at 320, 390, 600, 768, 1024 and 1280 wide, walked down a screen at a time
//   pop-ups         each dialog a [data-open] link or button on the page opens: it shows (opacity 1, a real size),
//                   axe passes with it open, Esc closes it and focus goes back; a toast shows and leaves on its own;
//                   on desktop a footer tab's panel shows. All of it once more with the site's pause on (html.is-held,
//                   saved as uplink-held), which must never hide a pop-up (review B1)
// Fails on any of those, a hero tile that doesn't answer hover, a Grow section that doesn't play, a footer tab at
// 1440x900 that isn't one screen tall or whose panel overflows, a header whose tabs come within 8px of the logo or
// buttons (or scroll) at any width from 320 to 1440 in 10px steps and on wider screens, at the default and 200% text,
// anything serious or critical from axe, or a sitemap that doesn't list exactly the built pages.
// Known failures are marked test.fail with the review item that fixes them (KNOWN, below): such a test fails the run
// once the bug is fixed, as a reminder to drop the mark.
// At the end, one test for each bug the November 7, 2026 review found and batch 2b fixed, named by its item (B2 …), so
// it can't come back unseen: Grow's timing and frames, pop-ups and focus, forms, drawings that fail to load, the font
// swap, print, and the drawings' ?v= addresses.
// usage: npm run build && npm run serve   (wrangler dev on 8787)   then   npm run verify [-- --all] [--base URL] [--out DIR]
// Screenshots go to out/ (--out): the footer tabs at 1440, and Home and /soon at each size.
import { createHash } from 'node:crypto';
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
    const on = document.querySelector('#grow .grow-dot[aria-current="step"]');
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
  // the map is fetched as the footer comes near (footer.js): wait for it, as a slow CI machine can take over a second
  await pg.waitForSelector('svg.fc-w', { state: 'attached', timeout: 15000 }).catch(() => fails.push('footer: the campus map never loaded'));
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
      const fails = [];
      const q = await browser.newPage({ viewport: { width: w, height: h } });
      watch(q, `${page} ${n}`, errs);
      // a script error can come late (a timer, a drawing fetched after load): wait for the network to go quiet, then
      // a few seconds more. Home: long enough for the hero's first two captions (about 1.1s and 2.2s in).
      await q.goto(url(page));
      await q.waitForLoadState('networkidle');
      await q.waitForTimeout(page === 'index' ? 5000 : 3000);
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
      await q.waitForTimeout(500);
      const r = await q.evaluate(() => {
        const f = document.getElementById('footer');
        const s = document.querySelector('.fc-panels');
        if (!f) return [document.documentElement.scrollWidth - innerWidth, 'none', '-', '-'];
        return [document.documentElement.scrollWidth - innerWidth, f.offsetHeight, s.scrollHeight - s.clientHeight, f.classList.contains('fc-js')];
      });
      if (page === 'soon' || page === 'index') await q.screenshot({ path: join(OUT, `f-${page}-${n}.png`) });
      if (r[0] > 0) fails.push(`${page} ${n}: ${r[0]}px sideways scroll`);
      if (!footer && r[1] !== 'none') fails.push(`${page} ${n}: has a footer (the 404 has none)`);
      // turn the screen and back (resize and orientation handlers), then press each of the page's own buttons once
      // (not the pop-up openers, which the pop-up check opens, nor a form's Send): any script error counts
      await q.setViewportSize({ width: h, height: w });
      await q.waitForTimeout(600);
      await q.setViewportSize({ width: w, height: h });
      await q.waitForTimeout(600);
      const controls = await q.evaluate(() => {
        const shown = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
        const all = [...document.querySelectorAll('button:not([data-open]):not([type="submit"]):not(:disabled)')].filter((b) => !b.closest('dialog, form') && shown(b));
        all.forEach((b, i) => b.setAttribute('data-check-ctl', String(i)));
        return all.length;
      });
      for (let i = 0; i < controls; i++) {
        await q.locator(`[data-check-ctl="${i}"]`).click({ timeout: 2000 }).catch(() => {}); // covered or gone: not this check's business
        await q.waitForTimeout(150);
      }
      await q.keyboard.press('Escape');
      await q.waitForTimeout(1000);
      await q.close();
      console.log(`${pad(page, 22)} ${pad(n, 6)} overflowX ${r[0]} footer h ${r[1]} panel overflow ${r[2]} js ${r[3]} h1 ${m.h1} ld ${m.ld.length} controls ${controls}`);
      verdict([...fails, ...errs]);
    });
  }
}

// sideways scroll (WCAG 1.4.10) at the widths where layouts change, every page, walked down a screen at a time so
// whatever starts once it's on screen (Grow, the footer map) has started. KNOWN: failures found by this check and
// fixed in a later batch of the review (docs/review-2026-11-07.md); the test is expected to fail until then.
const WIDTHS = [320, 390, 600, 768, 1024, 1280];
const KNOWN = {
  'index 320': 'B13: the Grow player has no column template, so an active dot makes Home 8px too wide at 320',
};
for (const page of PAGES) {
  for (const width of WIDTHS) {
    test(`sideways ${page} ${width}`, async ({ browser }) => {
      const known = KNOWN[`${page} ${width}`];
      test.fail(!!known, known);
      const q = await browser.newPage({ viewport: { width, height: 800 } });
      await q.goto(url(page));
      await q.waitForLoadState('networkidle');
      let worst = 0;
      for (let y = 0, end = 1; y < end; y += 600) {
        end = await q.evaluate((top) => {
          window.scrollTo(0, top);
          return document.documentElement.scrollHeight;
        }, y);
        await q.waitForTimeout(250);
        worst = Math.max(worst, await q.evaluate(() => document.documentElement.scrollWidth - innerWidth));
      }
      // Grow: don't leave it to its own timer (a slow machine may not have stepped yet). Pick each step by hand, the
      // list on desktop or the dots below, and measure with each one active
      const steps = q.locator('#grow :is(.grow-dot, .grow-item):visible');
      for (let i = 0, n = await steps.count(); i < n; i++) {
        await steps.nth(i).click();
        await q.waitForTimeout(300);
        worst = Math.max(worst, await q.evaluate(() => document.documentElement.scrollWidth - innerWidth));
      }
      await q.close();
      if (worst > 0 || known) console.log(`sideways ${page} ${width}: ${worst}px${known ? ` (known: ${known})` : ''}`);
      verdict(worst > 0 ? [`${page} at ${width}px: ${worst}px sideways scroll`] : []);
    });
  }
}

// pop-ups: each dialog the page can open, with the site's pause off and on (review B1: with it on, the dialogs,
// toasts and footer panels stayed at their first, invisible animation frame, and the phone services row stopped
// following a swipe). axe gets the open dialog, which a pass over the page at load can't see (a closed <dialog> isn't
// rendered). With the pause on, every looping animation must be paused once the drawings have loaded.
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
        await q.goto(url(page));
        await q.waitForLoadState('networkidle');
        const isHeld = await q.evaluate(() => document.documentElement.classList.contains('is-held'));
        if (isHeld !== held) fails.push(`${name}: html.is-held is ${isHeld}, expected ${held}`);
        const ids = await q.evaluate(() => [...new Set([...document.querySelectorAll('[data-open]')].map((e) => e.dataset.open))].filter((id) => document.getElementById(id)));
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
          await q.waitForTimeout(600); // the opening animation is 250ms (--dur-2)
          const st = await q.evaluate(shownStyle, `#${id}`);
          rep.push(`${id}: ${JSON.stringify(st)}`);
          if (!st || st.opacity < 0.99 || st.w < 100 || st.h < 100) fails.push(`${name}: #${id} isn't shown once open: ${JSON.stringify(st)}`);
          const v = (await new AxeBuilder({ page: q }).include(`#${id}`).analyze()).violations;
          for (const x of v.filter((x) => x.impact === 'serious' || x.impact === 'critical')) fails.push(`${name}: axe in #${id}: [${x.impact}] ${x.id}`);
          // a toast in the dialog: Settings' shortcuts switch says what it did, then leaves on its own (3 s)
          if (id === 'settings-dialog' && (await q.locator('#sc-toggle').count())) {
            await q.locator('#sc-toggle').click();
            await q.waitForTimeout(600);
            const t = await q.evaluate(shownStyle, `#${id} .toast`);
            if (!t || t.opacity < 0.99) fails.push(`${name}: the shortcuts toast isn't shown: ${JSON.stringify(t)}`);
            const gone = await q.waitForFunction((d) => !document.querySelector(`#${d} .toast`), id, { timeout: 6000 }).then(() => true, () => false);
            if (!gone) fails.push(`${name}: the shortcuts toast never left`);
          }
          await q.keyboard.press('Escape');
          await q.waitForTimeout(300);
          const after = await q.evaluate((d) => ({ open: document.getElementById(d).open, back: document.activeElement?.dataset?.open === d }), id);
          if (after.open) fails.push(`${name}: Esc didn't close #${id}`);
          else if (!after.back) fails.push(`${name}: focus didn't go back to what opened #${id}`);
        }
        // the phone services row (Home): swiped two cards along, the card now in the middle is the big, bright one
        // (scroll-driven animations; review B1 follow-up: the pause held them, so the old card stayed big)
        const row = q.locator('.svc-menu');
        if ((await row.count()) && (await row.evaluate((e) => e.scrollWidth > e.clientWidth + 10))) {
          await row.scrollIntoViewIfNeeded();
          await row.evaluate((e) => e.scrollBy({ left: e.querySelector('li').offsetWidth * 2, behavior: 'instant' }));
          await q.waitForTimeout(800);
          const c = await row.evaluate((e) => {
            const mid = e.getBoundingClientRect().left + e.clientWidth / 2;
            const li = [...e.children].reduce((a, b) => {
              const d = (x) => Math.abs(x.getBoundingClientRect().left + x.getBoundingClientRect().width / 2 - mid);
              return d(b) < d(a) ? b : a;
            });
            const scale = new DOMMatrix(getComputedStyle(li.querySelector('.svc-tile')).transform).a;
            const art = li.querySelector('.svc-art, .svc-icon');
            return { i: [...e.children].indexOf(li), scale: Math.round(scale * 100) / 100, art: art ? Number(getComputedStyle(art).opacity) : 1 };
          });
          rep.push(`services row after a swipe: ${JSON.stringify(c)}`);
          if (c.i < 1 || c.scale < 0.98 || c.art < 0.95) fails.push(`${name}: the services row didn't follow the swipe (the middle card: ${JSON.stringify(c)})`);
        }
        // with the pause on, nothing loops: the hero, Grow and the footer map each counted while on screen (off screen
        // they idle anyway, so counting only at the end would miss a broken pause)
        if (held && page === 'index') {
          for (const sel of ['#top', '#grow', '#footer']) {
            await q.$eval(sel, (e) => e.scrollIntoView());
            await q.waitForTimeout(800);
            const running = await q.evaluate(() =>
              document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().iterations === Infinity).map((a) => a.animationName || 'animation'),
            );
            if (running.length) fails.push(`${name}: ${running.length} loop(s) still running with the pause on at ${sel}: ${[...new Set(running)].join(', ')}`);
          }
        }
        // desktop footer tabs: the panel a tab opens shows (the 404 page has no footer)
        if (w >= 700 && page !== MISSING) {
          await q.$eval('#footer', (e) => e.scrollIntoView());
          await q.locator('.fc-tile').nth(1).click();
          await q.waitForTimeout(800); // its animation is 360ms (--dur-fc-panel)
          const p = await q.evaluate(shownStyle, '.fc-panel.is-on');
          rep.push(`footer panel: ${JSON.stringify(p)}`);
          if (!p || p.opacity < 0.99 || p.h < 50) fails.push(`${name}: the footer tab's panel isn't shown: ${JSON.stringify(p)}`);
        }
        await ctx.close();
        console.log(`${name}: ${rep.join('; ')}`);
        verdict([...fails, ...errs]);
      });
    }
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
const growStep = (q) => q.evaluate(() => [...document.querySelectorAll('#grow .grow-card')].findIndex((c) => c.classList.contains('is-on')));
const growLabel = (q) => q.$eval('#grow .grow-play', (b) => b.getAttribute('aria-label'));
const ringAt = (q) => q.$eval('#grow .grow-ring circle', (c) => getComputedStyle(c).strokeDashoffset);
const loopsIn = (q, sel) =>
  q.evaluate(
    (sel) =>
      document
        .getAnimations()
        .filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().iterations === Infinity && a.effect.target?.closest?.(sel))
        .map((a) => a.animationName || 'animation'),
    sel,
  );
// waits for Grow to open step `i` and says how long that took (ms), or Infinity
const until = async (q, i, timeout = 9000) => {
  const t0 = Date.now();
  const ok = await q.waitForFunction((i) => document.querySelectorAll('#grow .grow-card')[i]?.classList.contains('is-on'), i, { timeout, polling: 50 }).then(() => true, () => false);
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
  const ended = await q.waitForFunction(() => document.querySelector('#grow .grow-play').getAttribute('aria-label') === 'Play again', null, { timeout: 15000 }).then(() => true, () => false);
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
  if (rest > DWELL - 800) fails.push(`held at 1.5 s into a step, released: the step ran ${rest} ms more (about ${DWELL - 1500} left)`);
  // your own pause, under the site's: releasing the site's pause doesn't play it
  await q.evaluate(() => document.querySelector('[data-hold]').click());
  await q.locator('#grow .grow-play').click(); // play
  await q.locator('#grow .grow-play').click(); // pause
  await q.evaluate(() => document.querySelector('[data-hold]').click());
  await q.waitForTimeout(600);
  const label = await growLabel(q);
  if (label !== 'Play') fails.push(`paused by hand under the site's pause, then the site's pause released: Grow plays (button "${label}")`);
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
  if (more > DWELL - 700 || shown + more < DWELL - 800) fails.push(`a step scrolled off screen ${shown} ms in, and back: it ran ${more} ms more (${DWELL} ms a step)`);
  console.log(`grow resume: ${rest} ms after release (ring ${r1} -> ${r2}); own pause kept: ${label}; on screen ${shown}+${more} ms`);
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
test('pop-ups: double-click, live regions, Esc in the name, skip link, toast focus (B12, B6, M11, B14)', async ({ browser }) => {
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
    if (!region || region.live !== 'polite') fails.push(`#${id}: no aria-live="polite" .toasts of its own: ${JSON.stringify(region)}`);
    const tree = await q.locator(`#${id}`).ariaSnapshot();
    const close = tree.match(/button "([^"]*Close[^"]*)"/);
    if (!close || !close[1].includes('Esc')) fails.push(`#${id}: its close button is named ${close ? `"${close[1]}"` : '(not found)'}, without the "Esc" it shows`);
    await q.keyboard.press('Escape');
    await q.waitForTimeout(300);
  }
  // fresh page: the regions are in the markup, not made later
  await q.reload();
  const marked = await q.evaluate(() => [...document.querySelectorAll('dialog')].map((d) => !!d.querySelector(':scope > .toasts[aria-live]')));
  if (marked.includes(false)) fails.push(`a dialog has no live region before its first toast: ${JSON.stringify(marked)}`);
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
  if (!inToast) fails.push('Tab from the shortcuts switch didn\'t reach the toast it showed');
  await q.keyboard.press('Enter');
  await q.waitForTimeout(500);
  const after = await q.evaluate(() => {
    const a = document.activeElement;
    return { body: a === document.body, inDialog: !!a.closest('#settings-dialog'), what: `${a.tagName.toLowerCase()}#${a.id}` };
  });
  if (after.body || !after.inDialog) fails.push(`toast dismissed with Enter: focus went to ${after.what}`);
  console.log(`pop-ups: regions ${JSON.stringify(marked)}, skip -> ${skip}, toast dismissed -> ${after.what}`);
  // the toast check toggled the shortcuts off: on again, for whoever is next in this context (nothing is)
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
    const shownEl = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).display !== 'none' && Number(getComputedStyle(e).opacity) > 0;
    const broken = [...document.images].filter((i) => i.complete && !i.naturalWidth && i.getClientRects().length && Number(getComputedStyle(i).opacity) > 0);
    return {
      still: img ? { src: img.getAttribute('src'), loaded: img.complete && img.naturalWidth > 0, shown: shownEl(img) } : null,
      beams: [...stage.querySelectorAll('svg.ob-over')].filter(shownEl).length,
      pause: shownEl(stage.querySelector('.hero-pause')),
      broken: broken.map((i) => i.getAttribute('src')),
    };
  });
  if (!s.still?.loaded || !s.still.shown) fails.push(`hero: no still office in place of the drawing: ${JSON.stringify(s.still)}`);
  if (s.beams) fails.push(`hero: ${s.beams} dashes layer(s) shown over a stage with no drawing`);
  if (s.pause) fails.push('hero: the pause button shows with nothing to pause');
  if (s.broken.length) fails.push(`${s.broken.length} broken-image box(es): ${s.broken.join(', ')}`);
  console.log(`drawings blocked: ${JSON.stringify(s)}`);
  await ctx.close();
  verdict(fails);
});

// B5: text in the fallback font takes the same room as Barlow, so nothing moves when the fonts arrive late. Linux has
// no Arial, so the fallback faces need Liberation Sans (CI's runner has it: Playwright installs it with Chromium).
for (const [page, w, h] of [['index', 1440, 900], [MISSING, 390, 844]]) {
  test(`font swap: no layout shift, ${page} ${w} (B5)`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    await ctx.route('**/assets/fonts/*.woff2', async (r) => {
      await new Promise((ok) => setTimeout(ok, 1500));
      await r.continue();
    });
    await ctx.addInitScript(() => {
      window.__cls = 0;
      new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: 'layout-shift', buffered: true });
    });
    const q = await ctx.newPage();
    await q.goto(url(page));
    await q.waitForFunction(() => document.fonts.status === 'loaded' && [...document.fonts].some((f) => f.family.includes('Barlow') && f.status === 'loaded'), null, { timeout: 15000 });
    await q.waitForTimeout(1000);
    const cls = await q.evaluate(() => window.__cls);
    await ctx.close();
    console.log(`font swap ${page} ${w}: CLS ${cls.toFixed(4)}`);
    verdict(cls > 0.01 ? [`${page} at ${w}: the late font moved the layout (CLS ${cls.toFixed(4)})`] : []);
  });
}

// B22, M7: on paper every Grow step shows, sections take their content's height whatever the screen (a page printed
// scaled down is laid out at a desktop width, where sections are a screen tall), forms, copy buttons and pop-up
// openers go, and a contact line stands in for the footer
for (const page of ['index', 'contact']) {
  test(`print ${page} (B22, M7)`, async ({ browser }) => {
    const fails = [];
    const ctx = await browser.newContext({ bypassCSP: true, viewport: { width: 1600, height: 1010 } }); // for the test's own style
    const q = await ctx.newPage();
    await q.goto(url(page));
    await q.waitForLoadState('networkidle');
    await q.emulateMedia({ media: 'print' });
    // the page's content laid out on two screen heights that meet the same media queries (desktop, landscape, wider
    // than 3:2) and give the same root font size (tokens.css: the smaller of 1.11vw and 1.78vh, so both at least
    // 1000 tall at 1600 wide): it must be the same length. Pictures are capped at 60vh on paper (a share of the page), so they're
    // held to one size for this comparison.
    await q.addStyleTag({ content: 'img, svg { max-height: 300px !important; }' });
    const tall = async (hh) => {
      await q.setViewportSize({ width: 1600, height: hh });
      await q.waitForTimeout(300);
      return q.evaluate(() => Math.round(document.querySelector('main').getBoundingClientRect().height));
    };
    const [a, b] = [await tall(1010), await tall(1060)];
    if (a !== b) fails.push(`${page} on paper is ${a}px long on a 1010px-tall screen and ${b}px on a 1060px one: sections keep a screen's height`);
    const s = await q.evaluate(() => {
      const shown = (e) => e.getClientRects().length > 0;
      return {
        cards: [...document.querySelectorAll('.grow-card')].filter(shown).length,
        of: document.querySelectorAll('.grow-card').length,
        gone: [...document.querySelectorAll('form, .copy-btn, [data-open]')].filter(shown).map((e) => e.className || e.tagName),
        contact: [...document.querySelectorAll('.print-contact')].filter(shown).map((e) => e.textContent).join(),
      };
    });
    if (s.cards !== s.of) fails.push(`${page} on paper: ${s.cards} of ${s.of} Grow steps`);
    if (s.gone.length) fails.push(`${page} on paper still shows: ${s.gone.join(', ')}`);
    if (!/\d.*@/.test(s.contact)) fails.push(`${page} on paper: no contact line (phone, email) in place of the footer: "${s.contact}"`);
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
  for (const c of s.choose) if (!c.required || c.first !== '' || c.picked !== '') fails.push(`#${c.id} doesn't start on a blank, required choice: ${JSON.stringify(c)}`);
  if (!s.note) fails.push('the Book pop-up doesn\'t say fields are required unless marked optional');
  console.log(`forms: ${JSON.stringify(s)}`);
  await ctx.close();
  verdict(fails);
});

// B10: each drawing a page inserts carries ?v=, a hash of the file as served (after SVGO), so a drawing whose shrunk
// output changes gets a new address and a visitor's cached copy can't meet a CSP without its style hash
test('drawing addresses: ?v= is the served file\'s hash (B10)', async () => {
  const html = await (await fetch(BASE + '/')).text();
  const urls = [...new Set([...html.matchAll(/data-[a-z-]+="(\/assets\/img\/[^"?]+\.svg)\?v=([0-9a-f]+)"/g)].map((m) => `${m[1]}?v=${m[2]}`))];
  const fails = urls.length < 4 ? [`Home inserts ${urls.length} drawing(s) with a ?v= (expected the hero cuts and the campus map)`] : [];
  for (const u of urls) {
    const [path, v] = u.split('?v=');
    const body = Buffer.from(await (await fetch(BASE + path)).arrayBuffer());
    const got = createHash('sha1').update(body).digest('hex').slice(0, 8);
    if (got !== v) fails.push(`${path}: ?v=${v}, but the file served hashes to ${got}`);
  }
  console.log(`drawing addresses: ${urls.join(' ')}`);
  verdict(fails);
});
