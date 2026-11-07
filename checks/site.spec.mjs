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
