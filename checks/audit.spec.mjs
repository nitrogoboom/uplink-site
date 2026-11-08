// Release audit: the machine half of the checklist in docs/sop.md, section 5. Run it before a release, not on every
// build (it takes a few minutes). Against `npm run serve` (or any address of the built site with --base).
// usage: npm run release-audit [-- --base http://localhost:8787] [--only browsers,keyboard,reader,motion,forms,html] [--html-all]
//
// What each part does (every page in the sitemap, plus /soon and the 404 page):
//   browsers   Chromium, Firefox and WebKit (Safari's engine) at 1440x900, plus an iPhone (WebKit) and an Android phone
//              (Chromium) as Playwright emulates them: script errors, CSP blocks, sideways scroll, a screenshot of each
//              page's first screen. Emulation is not a real phone; the SOP still asks for one pass on real ones.
//   keyboard   Tabs through each page from the top, like a keyboard user: every stop's name, whether focus is visible
//              (its outline, shadow, border or background changes from the unfocused look), whether it is on screen,
//              and whether Tab ever gets stuck. Opens each dialog from the keyboard, checks Esc closes it and focus
//              returns.
//   reader     Reads each page top to bottom with Guidepup's Virtual Screen Reader (the words a screen reader says,
//              built from the accessibility tree), saves it as a transcript, and flags what sounds wrong: run-on link
//              names, the same link name going two places, very long names. Not NVDA or VoiceOver word for word: each
//              says it a little differently, but the order and the words are these.
//   motion     With Reduce Motion on, nothing may keep moving. With it off, anything that loops longer than 5 s needs a
//              way to stop (WCAG 2.2.2), and nothing may flash more than 3 times a second (2.3.1).
//   forms      Submits each form empty, then with a bad email: is each error in words, tied to its field
//              (aria-describedby or the field's own message), and does focus go to the first problem?
//   html       Sends Home's HTML to the W3C Nu validator (validator.w3.org/nu) and lists its errors; --html-all sends
//              every page. The pages are public anyway; nothing else leaves this machine. W3C's free service limits
//              requests per address: on November 3, 2026 a day of repeated full runs (20 pages each) got "429 Too Many
//              Requests". So it's Home only by default (one request a run), and while fixing things, skip it:
//              --only browsers,keyboard,reader,motion,forms.
//
// Writes out/audit/report.md (the summary to paste into docs/releases/) and, per page, the reader transcript and the
// keyboard stops in out/audit/reader/ and out/audit/keyboard/, screenshots in out/audit/shots/. Fails if anything
// fails. Needs: npx playwright install chromium firefox webkit (the reader is bundled from node_modules with esbuild).
import { mkdirSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { test, chromium, firefox, webkit, devices } from '@playwright/test';
import { ROOT, MISSING, UA, flag, lanes, option, pages } from './lib.mjs';

const BASE = option('--base', 'http://localhost:8787').replace(/\/$/, '');
const PARTS = ['browsers', 'keyboard', 'reader', 'motion', 'forms', 'html'];
const ONLY = option('--only', PARTS.join(',')).split(',');
const HTML_ALL = flag('--html-all'); // W3C for every page, not just Home (one request per page to a rate-limited free service)
const OUT = join(ROOT, 'out/audit');
const VSR = join(ROOT, 'out/vsr.js');
const LANES = 4; // pages checked at once
const ENGINES = { chromium, firefox, webkit };

const report = Object.fromEntries(PARTS.map((p) => [p, []])); // lines for report.md, per part
const fails = []; // [part, text]: anything here makes the run fail
const nameOf = (path) => path.replace(/^\/|\/$/g, '').replaceAll('/', '_') || 'index';
const fail = (part, text) => {
  fails.push([part, text]);
  report[part].push(`- **FAIL** ${text}`);
};
const note = (part, text) => report[part].push(`- ${text}`);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function watch(pg, where, errs) {
  pg.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (where.includes(MISSING) && m.text().includes('status of 404')) return; // the 404 page's own status is the point of that page
    errs.push(`${where}: console: ${m.text().slice(0, 200)}`);
  });
  pg.on('pageerror', (e) => {
    if (!String(e).includes('ResizeObserver loop')) errs.push(`${where}: page error: ${String(e).slice(0, 200)}`); // a resize that took two frames: a browser notice, not a fault
  });
}

// ---------------------------------------------------------------- browsers

async function browsers(paths) {
  const runs = [
    ['Chromium 1440', 'chromium', { viewport: { width: 1440, height: 900 } }],
    ['Firefox 1440', 'firefox', { viewport: { width: 1440, height: 900 } }],
    ['WebKit 1440', 'webkit', { viewport: { width: 1440, height: 900 } }],
    ['iPhone (WebKit)', 'webkit', devices['iPhone 15']],
    ['Android (Chromium)', 'chromium', devices['Pixel 7']],
  ];
  for (const [label, engine, opts] of runs) {
    const b = await ENGINES[engine].launch();
    let ctx;
    try {
      ctx = await b.newContext(opts);
    } catch {
      // an engine that can't do part of a device profile (isMobile) still gets its size
      ctx = await b.newContext({
        viewport: opts.viewport,
        userAgent: opts.userAgent,
        deviceScaleFactor: opts.deviceScaleFactor,
      });
    }
    const errs = [];
    await lanes(paths, LANES, async (path) => {
      const pg = await ctx.newPage();
      const mine = [];
      watch(pg, `${label} ${path}`, mine);
      await pg.goto(BASE + path);
      await pg.waitForTimeout(1500);
      // clientWidth, not innerWidth: a phone widens its viewport to fit a page that's too wide, hiding it
      const side = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (side > 0) fail('browsers', `${label} ${path}: ${side}px sideways scroll`);
      // WebKit (27.2) refuses a style of its own for every <select> on the page: one each, even on a bare page with
      // nothing of ours, under any style-src without 'unsafe-inline' (checked November 6, 2026; Chromium doesn't). That
      // many "Refused to apply a stylesheet" lines are expected; one more is a real refusal and fails.
      if (engine === 'webkit') {
        let known = await pg.evaluate(() => document.querySelectorAll('select').length);
        for (let i = mine.length - 1; i >= 0 && known > 0; i--)
          if (mine[i].includes('Refused to apply a stylesheet')) {
            mine.splice(i, 1);
            known--;
          }
      }
      // WebKit's screenshot injects a <style> of its own, which the CSP blocks: keep only the errors from before it.
      // caret: 'initial', as hiding the caret injects a <style> too (a false error in WebKit)
      errs.push(...mine);
      await pg.screenshot({
        path: join(OUT, 'shots', `${nameOf(path)}-${engine}-${label.split(' ')[0].toLowerCase()}.png`),
        caret: 'initial',
      });
      await pg.close();
    });
    for (const e of errs) fail('browsers', e);
    note('browsers', `${label}: ${paths.length} pages, ${errs.length || 'no'} script errors`);
    await b.close();
  }
}

// ---------------------------------------------------------------- keyboard

// every focusable element gets a number and its unfocused look, so each Tab stop can be compared with it
const MARK = () => {
  const sel = 'a[href], button, input, select, textarea, summary, [tabindex], iframe';
  const look = (e) => {
    const s = getComputedStyle(e);
    return [
      s.outlineStyle,
      s.outlineWidth,
      s.outlineColor,
      s.boxShadow,
      s.borderColor,
      s.backgroundColor,
      s.color,
      s.textDecorationLine,
    ].join('|');
  };
  document.querySelectorAll(sel).forEach((e, i) => {
    e.dataset.kb = i;
    e.dataset.kbLook = look(e);
  });
};

// the site scrolls smoothly, so a stop is measured once the page (and any scrolling box) has stopped moving
const SETTLE = () =>
  new Promise((done) => {
    const at = () =>
      [
        scrollY,
        ...[...document.querySelectorAll('*')]
          .filter((e) => e.scrollTop || e.scrollLeft)
          .map((e) => e.scrollTop + ',' + e.scrollLeft),
      ].join(';');
    let last = at(),
      still = 0,
      n = 0;
    const tick = () => {
      const now = at();
      still = now === last ? still + 1 : 0;
      last = now;
      if (still >= 3 || ++n > 90) done();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

const STOP = () => {
  const e = document.activeElement;
  if (!e || e === document.body) return null;
  const s = getComputedStyle(e),
    r = e.getBoundingClientRect();
  const look = [
    s.outlineStyle,
    s.outlineWidth,
    s.outlineColor,
    s.boxShadow,
    s.borderColor,
    s.backgroundColor,
    s.color,
    s.textDecorationLine,
  ].join('|');
  // a link or button may draw its focus ring on a child or a pseudo-element: count a changed child too
  const kid = [...e.querySelectorAll('*')].some((k) => {
    const c = getComputedStyle(k);
    return c.outlineStyle !== 'none' || c.boxShadow !== 'none';
  });
  const ring = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
  const name = (e.getAttribute('aria-label') || e.innerText || e.value || e.title || e.getAttribute('alt') || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 70);
  return {
    kb: e.dataset.kb ?? 'new',
    tag: e.tagName.toLowerCase(),
    name,
    seen: ring || look !== e.dataset.kbLook || kid,
    onScreen: r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth,
    top: Math.round(r.top + scrollY),
    dialog: !!e.closest('dialog[open]'),
  };
};

async function keyboard(paths) {
  const b = await chromium.launch();
  const lines = await lanes(paths, LANES, async (path) => {
    const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
    await pg.goto(BASE + path);
    await pg.waitForTimeout(800);
    await pg.evaluate(MARK);
    const stops = [],
      seenKb = new Set();
    let back = false;
    for (let i = 0; i < 600; i++) {
      await pg.keyboard.press('Tab');
      await pg.evaluate(SETTLE);
      const s = await pg.evaluate(STOP);
      if (s === null || seenKb.has(s.kb)) {
        back = true; // back to the start: the page is done
        break;
      }
      seenKb.add(s.kb);
      stops.push(s);
    }
    if (!back) fail('keyboard', `${path}: Tab never came back round after 600 stops (a trap?)`);
    const list = stops.map(
      (s, i) =>
        `${String(i + 1).padStart(3)} ${s.tag.padEnd(8)} ${s.seen ? 'focus seen ' : 'NO FOCUS   '}${s.onScreen ? '' : 'OFF SCREEN '}${s.name}`,
    );
    writeFileSync(join(OUT, 'keyboard', `${nameOf(path)}.txt`), list.join('\n') + '\n', 'utf8');
    const unseen = stops.filter((s) => !s.seen).map((s) => s.name || s.tag);
    const hidden = stops.filter((s) => !s.onScreen).map((s) => s.name || s.tag);
    if (unseen.length)
      fail('keyboard', `${path}: ${unseen.length} stop(s) with no visible focus: ${unseen.slice(0, 6).join(', ')}`);
    if (hidden.length)
      fail('keyboard', `${path}: ${hidden.length} stop(s) focused while off screen: ${hidden.slice(0, 6).join(', ')}`);
    await pg.close();
    return `${path}: ${stops.length} Tab stops`;
  });
  for (const line of lines) note('keyboard', line);

  // dialogs, from Home: open from the keyboard, focus inside, Esc closes, focus back on the button
  const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await pg.goto(BASE + '/');
  await pg.waitForTimeout(800);
  for (const d of await pg.evaluate(() => [...document.querySelectorAll('dialog')].map((d) => d.id))) {
    const t = await pg.$(`[data-open="${d}"]:visible`);
    if (!t) {
      note('keyboard', `dialog ${d}: no visible button on Home (opened another way)`);
      continue;
    }
    await t.focus();
    await pg.keyboard.press('Enter');
    await pg.waitForTimeout(500);
    const opened = await pg.evaluate((d) => document.getElementById(d).open, d);
    const inside = await pg.evaluate((d) => !!document.activeElement.closest('#' + d), d);
    await pg.keyboard.press('Escape');
    await pg.waitForTimeout(500);
    const closed = !(await pg.evaluate((d) => document.getElementById(d).open, d));
    const back = await pg.evaluate((el) => document.activeElement === el, t);
    if (opened && inside && closed && back)
      note('keyboard', `dialog ${d}: opens, focus inside, Esc closes, focus back`);
    else
      fail(
        'keyboard',
        `dialog ${d}: opens ${opened}, focus inside ${inside}, Esc closes ${closed}, focus back ${back}`,
      );
  }
  await b.close();
}

// ---------------------------------------------------------------- reader

const READ = async () => {
  const v = window.VSR.virtual;
  await v.start({ container: document.body });
  for (let i = 0; i < 5000; i++) {
    if ((await v.lastSpokenPhrase()) === 'end of document') break;
    await v.next();
  }
  const log = await v.spokenPhraseLog();
  await v.stop();
  // a link's name as a screen reader builds it: its text without the parts hidden from screen readers
  const heard = (n) =>
    n.nodeType === 3
      ? n.textContent
      : n.nodeType !== 1 || n.getAttribute('aria-hidden') === 'true'
        ? ''
        : n.getAttribute('aria-label') || [...n.childNodes].map(heard).join('');
  const links = [...document.querySelectorAll('main a[href], footer a[href]')].map((a) => ({
    href: a.getAttribute('href'),
    name: heard(a).replace(/\s+/g, ' ').trim(),
    // a link whose visible parts sit in separate blocks but whose name has no pause between them
    // (counting the innermost blocks only, so a title wrapped in a box counts once)
    blocks: ((all) => all.filter((s) => !all.some((o) => o !== s && s.contains(o))).length)(
      [...a.querySelectorAll('span, strong, em, b, p, div')].filter(
        (s) => getComputedStyle(s).display !== 'inline' && !s.closest('[aria-hidden="true"]') && heard(s).trim(),
      ),
    ),
    paused: !!a.querySelector('.sr-only') || /[.,:;]/.test(a.getAttribute('aria-label') || ''),
  }));
  return { log, links };
};

async function bundleReader() {
  if (existsSync(VSR) && statSync(VSR).mtimeMs > statSync(join(ROOT, 'package-lock.json')).mtimeMs) return;
  const require = createRequire(import.meta.url);
  const { build } = await import('esbuild');
  mkdirSync(join(ROOT, 'out'), { recursive: true });
  await build({
    entryPoints: [require.resolve('@guidepup/virtual-screen-reader/browser.js')],
    bundle: true,
    format: 'iife',
    globalName: 'VSR',
    outfile: VSR,
    logLevel: 'warning',
  });
}

async function reader(paths) {
  await bundleReader();
  const b = await chromium.launch();
  const ctx = await b.newContext({ bypassCSP: true, viewport: { width: 1440, height: 900 } }); // the CSP blocks an injected script
  const lines = await lanes(paths, LANES, async (path) => {
    const pg = await ctx.newPage();
    await pg.goto(BASE + path);
    await pg.waitForTimeout(1500);
    await pg.addScriptTag({ path: VSR });
    const r = await pg.evaluate(READ);
    await pg.close();
    // the transcript, without the "end of …" lines a listener barely notices
    const said = r.log.filter((x) => !x.startsWith('end of '));
    writeFileSync(join(OUT, 'reader', `${nameOf(path)}.txt`), said.join('\n') + '\n', 'utf8');
    const runon = [...new Set(r.links.filter((l) => l.blocks >= 2 && !l.paused).map((l) => l.name))].sort();
    const long = [...new Set(r.links.filter((l) => l.name.length > 100).map((l) => l.name))].sort();
    const byName = new Map();
    for (const l of r.links) {
      const k = l.name.toLowerCase();
      if (!byName.has(k)) byName.set(k, new Set());
      byName.get(k).add(l.href.split('#')[0]);
    }
    const twice = [...byName]
      .filter(([n, hrefs]) => hrefs.size > 1 && n)
      .map(([n]) => n)
      .sort();
    for (const n of runon) fail('reader', `${path}: run-on link name (parts with no pause): "${n.slice(0, 90)}"`);
    for (const n of long) note('reader', `${path}: long link name (${n.length} chars): "${n.slice(0, 90)}…"`);
    for (const n of twice) fail('reader', `${path}: the link name "${n}" goes to more than one page`);
    return `${path}: ${said.length} phrases`;
  });
  for (const line of lines) note('reader', line);
  await b.close();
}

// ---------------------------------------------------------------- motion

const MOVING = () =>
  document
    .getAnimations()
    .filter((a) => a.playState === 'running')
    .map((a) => {
      const t = a.effect?.getTiming?.() || {},
        el = a.effect?.target;
      return {
        name: a.animationName || a.constructor.name,
        iter: t.iterations,
        dur: t.duration,
        el: el
          ? el.id
            ? '#' + el.id
            : el.tagName.toLowerCase() + (el.classList[0] ? '.' + el.classList[0] : '')
          : '?',
        inSvg: !!el?.closest?.('svg'),
      };
    });

async function motion(paths) {
  const b = await chromium.launch();
  for (const reduce of ['reduce', 'no-preference']) {
    const ctx = await b.newContext({ reducedMotion: reduce, viewport: { width: 1440, height: 900 } });
    for (const path of paths) {
      const pg = await ctx.newPage();
      await pg.goto(BASE + path);
      await pg.waitForTimeout(reduce === 'reduce' ? 6000 : 3000);
      const moving = await pg.evaluate(MOVING);
      const smil = await pg.evaluate(
        () => document.querySelectorAll('svg animate, svg animateTransform, svg animateMotion').length,
      );
      if (reduce === 'reduce') {
        if (moving.length) {
          const what = [...new Set(moving.map((m) => `${m.el} (${m.name})`))].sort();
          fail(
            'motion',
            `${path}, Reduce Motion on: ${moving.length} animation(s) still running after 6 s: ${what.slice(0, 5).join(', ')}`,
          );
        }
        if (smil) fail('motion', `${path}, Reduce Motion on: ${smil} SVG <animate> element(s) on the page`);
      } else {
        const loops = moving.filter((m) => m.iter === Infinity || (m.iter || 1) * (m.dur || 0) > 5000);
        const fast = moving.filter((m) => (m.dur || 1000) < 333 && m.iter === Infinity);
        for (const m of fast)
          fail('motion', `${path}: ${m.el} loops every ${m.dur} ms (could flash more than 3 times a second)`);
        if (loops.length) {
          const what = [...new Set(loops.map((m) => m.el))].sort();
          // the pause button (HoldButton.astro, data-hold) must stop all of it
          const hold = pg.locator('[data-hold]:visible').first();
          if (!(await hold.count())) {
            fail(
              'motion',
              `${path}: ${loops.length} looping animation(s) on ${what.slice(0, 5).join(', ')} and no pause button`,
            );
          } else {
            await hold.click();
            await pg.waitForTimeout(600);
            const left = await pg.evaluate(MOVING);
            await hold.click(); // the choice is kept across pages: put it back
            if (left.length)
              fail(
                'motion',
                `${path}: Pause leaves ${left.length} animation(s) running: ${[...new Set(left.map((m) => m.el))].sort().slice(0, 5).join(', ')}`,
              );
            else
              note(
                'motion',
                `${path}: ${loops.length} looping animation(s) on ${what.slice(0, 5).join(', ')}; the pause button stops all of them, and Reduce Motion stops them too`,
              );
          }
        }
      }
      await pg.close();
    }
    await ctx.close();
  }
  if (!report.motion.length)
    note('motion', 'nothing moves for more than 5 s on any page, and nothing moves with Reduce Motion on');
  await b.close();
}

// ---------------------------------------------------------------- forms

const FORM_STATE = (f) => {
  const fields = [...f.querySelectorAll('input, select, textarea')].filter(
    (x) => x.type !== 'hidden' && x.type !== 'submit',
  );
  return {
    focus:
      document.activeElement && f.contains(document.activeElement)
        ? document.activeElement.name || document.activeElement.id
        : document.activeElement?.tagName || '',
    fields: fields.map((x) => {
      const ids = (x.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      const said = ids
        .map((i) => document.getElementById(i)?.textContent.trim())
        .filter(Boolean)
        .join(' / ');
      return {
        name: x.name || x.id,
        invalid: x.getAttribute('aria-invalid') === 'true' || !x.checkValidity(),
        native: x.validationMessage,
        said,
      };
    }),
    live: [...document.querySelectorAll('[aria-live], [role=alert], [role=status]')]
      .map((x) => x.textContent.trim())
      .filter(Boolean),
  };
};

async function forms(paths) {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const targets = []; // [where, the dialog to open first, selector]
  for (const path of paths) {
    await pg.goto(BASE + path);
    await pg.waitForTimeout(500);
    const n = await pg.locator('main form, footer form').count();
    for (let i = 0; i < n; i++) targets.push([path, null, `:is(main, footer) form >> nth=${i}`]);
  }
  targets.push(['/ (Book a call dialog)', 'book-dialog', '#book-dialog form']);
  const done = new Set();
  for (const [where, dialog, sel] of targets) {
    const path = where.split(' ')[0];
    await pg.goto(BASE + path);
    await pg.waitForTimeout(500);
    if (dialog) {
      await pg.evaluate((d) => document.querySelector(`[data-open="${d}"]`).click(), dialog);
      await pg.waitForTimeout(500);
    }
    const form = pg.locator(sel);
    // a form in a footer section that isn't open: open it first, as a visitor would
    await form.evaluate((f) => {
      const d = f.closest('details');
      if (d && !d.open) d.querySelector('summary').click();
    });
    await pg.waitForTimeout(600);
    const key = await form.evaluate(
      (f) => f.id || f.getAttribute('aria-label') || f.querySelector('[type=submit]')?.textContent.trim(),
    );
    if (done.has(key)) continue; // the same footer form on every page: check it once
    done.add(key);
    for (const kase of ['empty', 'bad email']) {
      await form.evaluate((f) => f.reset());
      if (kase === 'bad email') {
        const emails = form.locator('input[type=email]');
        if (!(await emails.count())) continue;
        await emails.first().fill('not-an-email');
      }
      await form.locator('[type=submit], button:not([type=button])').first().click();
      await pg.waitForTimeout(600);
      if (!pg.url().startsWith(BASE + path.split('#')[0])) {
        note('forms', `${where} form "${key}" (${kase}): the page moved on to ${pg.url()}; nothing stopped it`);
        await pg.goto(BASE + path);
        break;
      }
      const s = await form.evaluate(FORM_STATE);
      const bad = s.fields.filter((f) => f.invalid);
      if (!bad.length) {
        note('forms', `${where} form "${key}" (${kase}): no field marked invalid`);
        continue;
      }
      const words = bad.map((f) => `${f.name}: ${f.said || f.native || '(no message)'}`);
      const silent = bad.filter((f) => !f.said && !f.native).map((f) => f.name);
      const first = bad[0].name;
      note(
        'forms',
        `${where} form "${key}" (${kase}): focus on ${s.focus || 'nothing'}; errors: ${words.join('; ')}` +
          (s.live.length ? `; announced: ${s.live.join(' / ')}` : ''),
      );
      if (silent.length)
        fail('forms', `${where} form "${key}" (${kase}): invalid with no message in words: ${silent.join(', ')}`);
      if (s.focus !== first)
        fail(
          'forms',
          `${where} form "${key}" (${kase}): focus is on ${s.focus || 'nothing'}, not the first problem (${first})`,
        );
    }
  }
  await b.close();
}

// ---------------------------------------------------------------- html

// the service answers 429 when it's busy or we've sent a lot today: wait as it asks, then try again
async function validate(page) {
  for (const pause of [30, 60, 120, null]) {
    const r = await fetch('https://validator.w3.org/nu/?out=json', {
      method: 'POST',
      body: page,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'User-Agent': 'uplink-site audit' },
      signal: AbortSignal.timeout(60_000),
    });
    if (r.ok) return (await r.json()).messages;
    if (r.status !== 429 || pause === null) throw new Error(`HTTP Error ${r.status}: ${r.statusText}`);
    await wait(1000 * Number(r.headers.get('retry-after') || pause));
  }
}

async function html(paths) {
  const css = new Set();
  for (const path of HTML_ALL ? paths : ['/']) {
    // the 404 answers with an error status; its body is the page all the same
    const page = await (await fetch(BASE + path, { headers: UA })).arrayBuffer();
    const msgs = await validate(page);
    // the validator's CSS checker lags the browsers (@property, appearance: base-select, ::picker-icon are valid CSS it
    // doesn't know yet), so its messages on the inlined <style> are listed once, not counted as failures
    const errs = msgs.filter((m) => m.type === 'error' && !m.message.startsWith('CSS:'));
    msgs.filter((m) => m.type === 'error' && m.message.startsWith('CSS:')).forEach((m) => css.add(m.message));
    const warns = msgs.filter((m) => m.subType === 'warning');
    for (const m of errs.slice(0, 8)) fail('html', `${path} line ${m.lastLine ?? '?'}: ${m.message.slice(0, 160)}`);
    note(
      'html',
      `${path}: ${errs.length} HTML error(s), ${warns.length} warning(s)` +
        (warns.length ? ` (${[...new Set(warns.map((w) => w.message.slice(0, 90)))].sort().join('; ')})` : ''),
    );
    await wait(2000); // the W3C service asks for a gentle pace
  }
  if (css.size)
    note('html', 'CSS the validator does not know yet (valid in current browsers): ' + [...css].sort().join('; '));
}

// ---------------------------------------------------------------- run

const PART_FNS = { browsers, keyboard, reader, motion, forms, html };

test('release audit', async () => {
  test.setTimeout(3_600_000);
  for (const d of ['reader', 'keyboard', 'shots']) mkdirSync(join(OUT, d), { recursive: true });
  const paths = await pages(BASE);
  const started = Date.now();
  for (const part of PARTS) {
    if (!ONLY.includes(part)) continue;
    console.log(`${part}…`);
    try {
      await PART_FNS[part](paths);
    } catch (e) {
      // one part breaking still leaves the others' results in the report
      fail(part, `the ${part} check stopped: ${e.name}: ${String(e.message).slice(0, 200)}`);
    }
  }
  const now = new Date();
  const stamp = `${String(now.getDate()).padStart(2, '0')} ${now.toLocaleString('en', { month: 'short' })} ${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const lines = [
    `# Audit, ${stamp}`,
    '',
    `${BASE}, ${paths.length} pages, ${Math.round((Date.now() - started) / 1000)} s. ` +
      `${fails.length || 'No'} failure(s). Transcripts and Tab stops: out/audit/reader/, out/audit/keyboard/.`,
    '',
  ];
  for (const part of PARTS)
    if (ONLY.includes(part))
      lines.push(`## ${part}`, '', ...(report[part].length ? report[part] : ['- nothing to report']), '');
  writeFileSync(join(OUT, 'report.md'), lines.join('\n'), 'utf8');
  console.log(lines.join('\n'));
  if (fails.length)
    throw new Error(`${fails.length} failure(s):\n  ` + fails.map(([p, t]) => `${p}: ${t}`).join('\n  '));
});
