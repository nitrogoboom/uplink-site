/* ==========================================================================
   Uplink Technology · Home page
   The hero (the drawing cut for the screen, the cloud, the phone captions), the Services row on
   phones, and Proof's wheel-grid height. The "We grow with you" section runs from grow.js (imported here).
   ========================================================================== */

import { $, $$, held, html, reduceMotion, replay, whenOnScreen } from './core.js';
import { MEDIA } from '../lib/media.js';
import './grow.js';

// Runs fn right after the browser's next layout pass (a ResizeObserver's first report comes then), so sizes read
// in fn cost nothing. Read straight after a change to the page, they make the browser lay it out again on the
// spot (a forced layout). Old browsers: after the next paint, which is clean unless something else ran between.
const afterLayout = (/** @type {() => void} */ fn) => {
  if (!('ResizeObserver' in window)) { requestAnimationFrame(() => setTimeout(fn, 0)); return; }   // window is "never" here to the type check
  const ro = new ResizeObserver(() => { ro.disconnect(); fn(); });
  ro.observe(document.documentElement);
};

/* ------------------------------------------------------------------
   Hero cloud: shows one cloud app at a time, big and readable. A curved
   line runs from the cloud to that app's tile in the floating tray.
   It steps through the apps on a timer; hovering a tile or a bar
   segment picks one. Reduced motion: no timer, no line animation.
   The drawing comes in three cuts, each its own file named on the stage
   (HERO in src/lib/site.ts, preloaded for the same screens), so a screen
   downloads only its own: the full hero; the tablet cut (fewer, bigger
   labels) where the hero shows narrow (data-tablet); and on phones the
   phone cut, animated, with its dashes in a second file. With reduced
   motion every cut stands still (its own CSS) and the phone captions
   come at once, without their timer.
   The hero cuts go in ahead of the dashes' layer (svg.ob-over), then the
   cloud starts. A turn or resize that changes the cut swaps the file.
   ------------------------------------------------------------------ */
const stage = $('.hero-art .stage[data-hero]');
// Pause buttons (HoldButton.astro, wired in core.js): while held, the cloud and the phone captions stop their timers.
const APPS = [
  { id: 'mail',   name: 'Email',    state: 'Online',  detail: 'Spam and phishing filtered' },
  { id: 'files',  name: 'Files',    state: 'Synced',  detail: 'OneDrive and Drive backed up' },
  { id: 'meet',   name: 'Meetings', state: 'Ready',   detail: 'Teams and Meet, one-click join' },
  { id: 'chat',   name: 'Chat',     state: 'Online',  detail: 'Every channel watched' },
  { id: 'cal',    name: 'Calendar', state: 'Synced',  detail: 'Shared calendars in step' },
  { id: 'secure', name: 'Sign-in',  state: 'Secured', detail: 'MFA on for every user' }
];
// A timer that runs tick every `every` ms only while it may: el on screen, the tab showing, motion allowed, the
// pause button off, and ready() (default: always). It stops and starts itself as those change. start() restarts
// the count (after a hover or a tap); off() lets go of the timer and every listener, when the cut is swapped out.
/** @param {Element} el @param {() => void} tick @param {number} every @param {() => boolean} [ready] */
const loopWhileSeen = (el, tick, every, ready = () => true) => {
  let timer = 0, onScreen = true;
  const stop = () => { window.clearInterval(timer); timer = 0; };
  const start = () => {
    stop();
    if (!ready() || reduceMotion.matches || document.hidden || !onScreen || held.on) return;
    timer = window.setInterval(tick, every);
  };
  const onVisible = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVisible);
  reduceMotion.addEventListener('change', start);
  held.ev.addEventListener('change', start);
  // off screen: no timer, and the looping animations pause
  const seen = whenOnScreen(el, (on) => { onScreen = on; if (on) start(); else stop(); });
  const off = () => {
    stop();
    document.removeEventListener('visibilitychange', onVisible);
    reduceMotion.removeEventListener('change', start);
    held.ev.removeEventListener('change', start);
    if (seen) seen.disconnect();
  };
  return { start, stop, off };
};
const CLOUD_EVERY = 3200;   // ms each app shows before the next
const WORDS_SWAP = 180;     // ms the old words take to fade out (the drawing's own .18s, tools/office_parts/hero.css)
// the hero drawing's parts (tools/gen_office.py) are all there
const startCloud = (/** @type {SVGGElement} */ cloud) => {
  const svg = /** @type {SVGSVGElement} */ (cloud.ownerSVGElement);
  const focus = /** @type {SVGElement} */ (svg.querySelector('.ob-focus'));
  const appText = /** @type {SVGElement} */ (svg.querySelector('.ob-app'));
  const stateText = /** @type {SVGElement} */ (svg.querySelector('.ob-state'));
  const detailText = /** @type {SVGElement} */ (svg.querySelector('.ob-detail'));
  const base = /** @type {SVGPathElement} */ (cloud.querySelector('.ob-link-base'));
  const flow = /** @type {SVGPathElement} */ (cloud.querySelector('.ob-link'));
  const end = /** @type {SVGElement} */ (svg.querySelector('.ob-link-end'));
  const START = { x: +(cloud.dataset.sx || 878), y: +(cloud.dataset.sy || 46) };
  const LINK = cloud.dataset.link || 'curve';
  const tile = (/** @type {string} */ id) => svg.querySelector('.ob-tile[data-tile="' + id + '"]');
  const topCentre = (/** @type {Element} */ t) => {
    const pts = /** @type {string} */ (/** @type {Element} */ (t.querySelector('.f-t')).getAttribute('points')).trim().split(/\s+/).map((p) => p.split(',').map(Number));
    return { x: pts.reduce((a, p) => a + p[0], 0) / pts.length, y: pts.reduce((a, p) => a + p[1], 0) / pts.length };
  };
  // The state word is right-aligned, so the dot before it moves with the word's width.
  // The browser reports the new size after its own layout pass (ResizeObserver), so
  // nothing is measured straight after the text changes (that would force a layout).
  // For SVG it reports only the size, so: the word's right edge (its x) minus its width.
  const dot = svg.querySelector('.ob-state-dot');
  /** @type {ResizeObserver | null} */
  let dotSized = null;
  if (dot && 'ResizeObserver' in window) {
    const words = /** @type {Element} */ (stateText.parentNode);
    const right = +(/** @type {string} */ (words.getAttribute('x')));
    dotSized = new ResizeObserver(([en]) => dot.setAttribute('cx', (right - en.contentRect.width - 10).toFixed(1)));
    dotSized.observe(words);
  }
  let index = -1;
  let swap = 0;
  const show = (/** @type {number} */ i) => {
    i = (i + APPS.length) % APPS.length;
    if (i === index) return;
    const first = index < 0;
    index = i;
    const app = APPS[i];
    /** @type {NodeListOf<SVGElement>} */ (svg.querySelectorAll('.ob-tile')).forEach((t) => t.classList.toggle('is-on', t.dataset.tile === app.id));
    /** @type {NodeListOf<SVGElement>} */ (cloud.querySelectorAll('.ob-seg, .ob-pip')).forEach((s) => s.classList.toggle('is-on', s.dataset.app === app.id));
    const t = tile(app.id);
    if (t && LINK !== 'none') {
      const p = topCentre(t);
      const dPath = LINK === 'elbow' ? 'M' + START.x + ',' + START.y + ' H' + p.x + ' V' + p.y : 'M' + START.x + ',' + START.y + ' C' + (START.x + 70) + ',' + START.y + ' ' + p.x + ',' + (p.y - 110) + ' ' + p.x + ',' + p.y;
      base.setAttribute('d', dPath);
      flow.setAttribute('d', dPath);
      end.setAttribute('cx', String(p.x));
      end.setAttribute('cy', String(p.y));
      const len = base.getTotalLength();
      base.style.strokeDasharray = String(len);
      base.style.setProperty('--len', String(len));
      replay(base, 'is-draw');
    }
    const write = () => {
      appText.textContent = app.name.toUpperCase();
      stateText.textContent = app.state.toUpperCase();
      detailText.textContent = app.detail;
      focus.classList.remove('is-out');
    };
    window.clearTimeout(swap);
    if (first || reduceMotion.matches) { write(); return; }
    focus.classList.add('is-out');
    swap = window.setTimeout(write, WORDS_SWAP);
  };
  const loop = loopWhileSeen(svg, () => show(index + 1), CLOUD_EVERY);
  const pick = (/** @type {string | undefined} */ id) => { loop.stop(); show(APPS.findIndex((a) => a.id === id)); };
  /** @type {NodeListOf<SVGElement>} */ (svg.querySelectorAll('.ob-tile')).forEach((t) => {
    t.addEventListener('pointerenter', () => pick(t.dataset.tile));
    t.addEventListener('pointerleave', loop.start);
  });
  /** @type {NodeListOf<SVGElement>} */ (cloud.querySelectorAll('.ob-seg-hit')).forEach((h) => {
    h.addEventListener('pointerenter', () => pick(h.dataset.app));
    h.addEventListener('pointerleave', loop.start);
  });
  show(0);
  loop.start();
  return () => {   // the cut is swapped out: let go of the timers and listeners
    loop.off();
    window.clearTimeout(swap);
    if (dotSized) dotSized.disconnect();
  };
};

/* ------------------------------------------------------------------
   Hero captions on phones. The phone cut has no words of its own; two
   captions sit in its free corners at one size on every phone: the
   cloud's (top left: its line to the cloud, the app it names lit on the
   tray) and the office's (bottom left: its line to one item at a time).
   Each changes every 4.4s, 2.2s after the other, so one line draws at a
   time. Tapping the drawing moves the office one on. Words and points
   come from the drawing (data-cloud, data-items: tools/gen_office.py);
   sizes from tokens.css (--cap-*), turned into drawing units here.
   Nothing is measured while the captions run: the drawing's width comes
   from a ResizeObserver, and each caption's text is measured once per
   width, all together in a hidden group, after layout (measure()).
   ------------------------------------------------------------------ */
const SVG_NS = 'http://www.w3.org/2000/svg';
const CAP_EVERY = 2200;     // ms between caption changes, the two captions taking turns (each one every 4.4s)
const CAP_SWAP = 170;       // ms a caption takes to fade out before its new words go in (hero.css: --dur-1, plus a frame)
const CAP_SECOND = 1100;    // ms from the first caption to the second
const CLOUD_TITLE = 'Cloud workspace';
/** @param {string} tag @param {string} cls @param {Element} parent */
const make = (tag, cls, parent) => {
  const el = document.createElementNS(SVG_NS, tag);
  el.setAttribute('class', cls);
  parent.append(el);
  return el;
};
// a caption line's words; the cloud's names its app first, in a tspan
/** @param {Element} el @param {string} text @param {string} [app] */
const fill = (el, text, app) => {
  if (!app) { el.textContent = text; return; }
  const name = document.createElementNS(SVG_NS, 'tspan');
  name.setAttribute('class', 'ob-cap-app');
  name.textContent = app;
  el.replaceChildren(name, text);
};
const startCaptions = (/** @type {SVGSVGElement} */ svg) => {
  const vb = svg.viewBox.baseVal;
  const [cloudX, cloudY] = /** @type {string} */ (svg.dataset.cloud).split(',').map(Number);
  // the drawing's own list (tools/gen_office.py); lint can't see a JSDoc cast, so it would call this an any
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const items = /** @type {{ t: string, s: string, c: string, x: number, y: number }[]} */ (JSON.parse(/** @type {string} */ (svg.dataset.items)));
  /** @type {ReturnType<typeof readSizes>} */
  let size;   // read once, at the first measure()
  let width = 0, cloudFill = '';
  /** @type {Map<string, number>} */
  const lengths = new Map();   // each caption text's length in drawing units, at the current width
  const readSizes = () => {
    const css = window.getComputedStyle(svg);
    const rootPx = parseFloat(window.getComputedStyle(document.documentElement).fontSize);
    const px = (/** @type {string} */ name) => { const v = css.getPropertyValue(name).trim(); return parseFloat(v) * (v.endsWith('rem') ? rootPx : 1); };
    return { t: px('--cap-title'), s: px('--cap-sub'), edge: px('--cap-edge'), gap: px('--cap-gap'), line: px('--cap-line'), dot: px('--cap-dot'), halo: px('--cap-halo') };
  };
  const spot = (/** @type {string} */ name) => {
    const g = make('g', 'ob-cap ob-cap-' + name, svg);
    const lead = /** @type {SVGPathElement} */ (make('path', 'ob-cap-lead', g));
    const ring = make('circle', 'ob-cap-ring', g);
    const end = make('circle', 'ob-cap-end', g);
    const words = make('g', 'ob-cap-words', g);
    return { g, lead, ring, end, t: /** @type {SVGTextElement} */ (make('text', 'ob-cap-t', words)), s: /** @type {SVGTextElement} */ (make('text', 'ob-cap-s', words)) };
  };
  const spots = { cloud: spot('cloud'), office: spot('office') };
  const at = { cloud: -1, office: -1 };
  // words: cloud hangs from the drawing's top edge, office stands on its bottom edge
  /** @typedef {ReturnType<typeof spot>} Spot */
  /** @param {Spot} sp @param {boolean} top @param {string} tKey @param {string} sKey */
  const place = (sp, top, tKey, sKey) => {
    if (!width || !lengths.has(tKey)) return null;   // not measured yet (hidden, or mid-swap): measure() places it
    const k = vb.width / width;   // drawing units per screen px
    const tf = size.t * k, sf = size.s * k, x = vb.x + size.edge * k;
    /** @type {[SVGTextElement, number][]} */ ([[sp.t, tf], [sp.s, sf]]).forEach(([el, f]) => {
      el.setAttribute('font-size', f.toFixed(1));
      el.setAttribute('x', x.toFixed(1));
      el.style.strokeWidth = (size.halo * k).toFixed(1) + 'px';
    });
    let ty, sy;
    if (top) { ty = vb.y + size.edge * k + tf * 0.76; sy = ty + size.gap * k + sf * 1.05; }
    else { sy = vb.y + vb.height - size.edge * k - sf * 0.28; ty = sy - size.gap * k - sf * 1.05; }
    sp.t.setAttribute('y', ty.toFixed(1));
    sp.s.setAttribute('y', sy.toFixed(1));
    return { k, x, ty, tf, tw: /** @type {number} */ (lengths.get(tKey)), sw: /** @type {number} */ (lengths.get(sKey)) };   // measured together
  };
  /** @param {Spot} sp @param {string} d @param {string} colour @param {number} x @param {number} y @param {number} k */
  const draw = (sp, d, colour, x, y, k) => {
    sp.lead.setAttribute('d', d);
    sp.lead.setAttribute('stroke', colour);
    sp.lead.setAttribute('stroke-width', (size.line * k).toFixed(1));
    const len = sp.lead.getTotalLength();
    sp.lead.style.strokeDasharray = String(len);
    sp.lead.style.setProperty('--len', String(len));
    [sp.end, sp.ring].forEach((c) => { c.setAttribute('cx', String(x)); c.setAttribute('cy', String(y)); c.setAttribute('r', (size.dot * k).toFixed(1)); });
    sp.end.setAttribute('fill', colour);
    sp.end.setAttribute('stroke-width', (size.dot * 0.6 * k).toFixed(1));
    sp.ring.setAttribute('stroke', colour);
    sp.ring.setAttribute('stroke-width', (size.line * k).toFixed(1));
    replay(sp.lead, 'is-draw');
    replay(sp.end, 'is-in');
    replay(sp.ring, 'is-in');
  };
  const write = {
    cloud: () => {
      const sp = spots.cloud, app = APPS[at.cloud];
      fill(sp.t, CLOUD_TITLE);
      fill(sp.s, ' · ' + app.detail, app.name);
      const L = place(sp, true, 't:' + CLOUD_TITLE, 'app:' + app.id);
      if (!L) return;
      const x0 = L.x + L.tw + size.gap * 2 * L.k, y0 = L.ty - L.tf * 0.32;   // a level tail from the title, then to the cloud
      draw(sp, `M${x0.toFixed(1)},${y0.toFixed(1)} H${cloudX - 50} L${cloudX},${cloudY}`, cloudFill, cloudX, cloudY, L.k);
      /** @type {NodeListOf<SVGElement>} */ (svg.querySelectorAll('.ob-tile')).forEach((t) => t.classList.toggle('is-on', t.dataset.tile === app.id));
    },
    office: () => {
      const sp = spots.office, it = items[at.office];
      fill(sp.t, it.t);
      sp.t.setAttribute('fill', it.c);
      fill(sp.s, it.s);
      const L = place(sp, false, 't:' + it.t, 's:' + it.s);
      if (!L) return;
      const top = L.ty - L.tf * 0.76 - size.gap * 2 * L.k;   // the line rises from just above the words to the item
      const x0 = Math.min(Math.max(it.x, L.x + size.gap * L.k), L.x + Math.max(L.tw, L.sw) - size.gap * L.k);
      draw(sp, `M${x0.toFixed(1)},${top.toFixed(1)} L${it.x},${it.y}`, it.c, it.x, it.y, L.k);
    }
  };
  // each caption's pending swap: its timeout, then its frame (a new step on the same caption cancels both first)
  const swaps = { cloud: { t: 0, f: 0 }, office: { t: 0, f: 0 } };
  const cancel = (/** @type {{ t: number, f: number }} */ sw) => { window.clearTimeout(sw.t); window.cancelAnimationFrame(sw.f); };
  const step = (/** @type {'cloud' | 'office'} */ name, /** @type {boolean} */ animate) => {
    at[name] = (at[name] + 1) % (name === 'cloud' ? APPS.length : items.length);
    const sp = spots[name], sw = swaps[name];
    cancel(sw);
    sp.g.classList.remove('is-pre');
    if (!animate || reduceMotion.matches) { sp.g.classList.remove('is-out'); write[name](); return; }
    sp.g.classList.add('is-out');
    sw.t = window.setTimeout(() => {
      sp.g.classList.add('is-pre');
      sp.g.classList.remove('is-out');
      write[name]();   // drawn once below their place (is-pre), the words rise in from the frame after
      sw.f = window.requestAnimationFrame(() => { sw.f = window.requestAnimationFrame(() => sp.g.classList.remove('is-pre')); });
    }, CAP_SWAP);
  };
  let turn = 0, begun = false;
  const loop = loopWhileSeen(svg, () => step(turn++ % 2 ? 'office' : 'cloud', true), CAP_EVERY, () => begun);
  const tap = () => { if (!begun) return; step('office', true); turn = 0; loop.start(); };
  svg.addEventListener('click', tap);
  // Every caption text, set at this width's sizes in a hidden group and read together after a layout pass: one layout
  // the browser makes anyway, instead of a forced one for each caption as it changes.
  let job = 0;
  const measure = (/** @type {number} */ w) => {
    const mine = ++job;
    if (!size) size = readSizes();
    const k = vb.width / w;
    const box = make('g', 'ob-cap ob-cap-cloud', svg);
    box.setAttribute('visibility', 'hidden');
    /** @type {(key: string, cls: string, f: number, text: string, app?: string) => [string, SVGTextElement]} */
    const probe = (key, cls, f, text, app) => {
      const el = /** @type {SVGTextElement} */ (make('text', cls, box));
      el.setAttribute('font-size', (f * k).toFixed(1));
      fill(el, text, app);
      return [key, el];
    };
    const probes = [
      probe('t:' + CLOUD_TITLE, 'ob-cap-t', size.t, CLOUD_TITLE),
      ...APPS.map((a) => probe('app:' + a.id, 'ob-cap-s', size.s, ' · ' + a.detail, a.name)),
      ...items.flatMap((it) => [probe('t:' + it.t, 'ob-cap-t', size.t, it.t), probe('s:' + it.s, 'ob-cap-s', size.s, it.s)])
    ];
    afterLayout(() => {
      if (mine === job) {
        lengths.clear();
        probes.forEach(([key, el]) => lengths.set(key, el.getComputedTextLength()));
        cloudFill = window.getComputedStyle(probes[0][1]).fill;
        width = w;
        // only the captions already shown: the office's comes 1.1 s after the cloud's (CAP_SECOND), and before that
        // at.office is -1, with no item to write (a width change in that gap threw and left this box behind)
        if (at.cloud >= 0) write.cloud();
        if (at.office >= 0) write.office();
      }
      box.remove();
    });
  };
  // Re-measure only when the drawing's width changes. Phones fire `resize` each time the address bar shows or
  // hides, which would replay the line and dot mid-scroll; the drawing keeps its width then.
  let lastW = 0;
  const relayout = (/** @type {number} */ w) => {
    if (!w || Math.abs(w - lastW) < 0.5) return;
    lastW = w;
    measure(w);
  };
  const onResize = () => relayout(svg.getBoundingClientRect().width);
  const sized = 'ResizeObserver' in window ? new ResizeObserver(([en]) => relayout(en.contentRect.width)) : null;
  if (sized) sized.observe(svg); else { window.addEventListener('resize', onResize); afterLayout(onResize); }
  // first words as the drawing's build ends, which the drawing gives (data-words, PHONE_WORDS in tools/gen_office.py:
  // about 1.1s; at once with reduced motion), the office's 1.1s after
  const quick = reduceMotion.matches;
  const capFirst = Number(svg.dataset.words) || 0;
  let second = 0;
  const first = window.setTimeout(() => {
    begun = true;
    step('cloud', !quick);
    second = window.setTimeout(() => { step('office', !quick); loop.start(); }, quick ? 0 : CAP_SECOND);
  }, quick ? 0 : capFirst);
  return () => {   // the cut is swapped out: let go of the timers and listeners
    loop.off();
    window.clearTimeout(first);
    window.clearTimeout(second);
    cancel(swaps.cloud);
    cancel(swaps.office);
    job++;   // a measure still waiting for its paint drops its results
    svg.removeEventListener('click', tap);
    if (sized) sized.disconnect(); else window.removeEventListener('resize', onResize);
  };
};
if (stage) {
  const phone = window.matchMedia(MEDIA.smallPhone);   // HERO.media.phone
  // Hero.astro writes every one of these data- attributes
  const tablet = window.matchMedia(/** @type {string} */ (stage.dataset.tablet));
  const files = /** @type {Record<'full' | 'tablet' | 'phone', string[]>} */ ({
    full: [stage.dataset.hero],
    tablet: [stage.dataset.heroTablet],
    phone: [stage.dataset.heroPhone, stage.dataset.heroPhoneFlows]
  });
  /** @type {string | null} */
  let shown = null;
  /** @type {Element[]} */
  let added = [];
  /** @type {(IntersectionObserver | null)[]} */
  let observers = [];
  /** @type {(() => void) | null} */
  let stopCloud = null;
  let ticket = 0;   // counts loads: only the latest one may insert (a screen that flips and back mid-download asks twice)
  const clear = () => {
    if (stopCloud) stopCloud();
    stopCloud = null;
    observers.forEach((io) => io && io.disconnect());
    observers = [];
    added.forEach((n) => n.remove());
    added = [];
  };
  // a drawing that can't load (offline, blocked): the still office the page shows without script (the same picture
  // as its <noscript>, cloned from a <template>, so no text is turned into HTML) stands in, and the dashes' layer and
  // the pause button go, so no beams hang over an empty stage. The next change of cut tries again.
  /** @type {HTMLTemplateElement | null} */
  const still = $('template.hero-still', stage);
  const failed = (/** @type {boolean} */ on) => {
    $$('svg.ob-over', stage).forEach((el) => { el.style.display = on ? 'none' : ''; });
    $$('.hero-pause', stage).forEach((el) => { el.style.display = on ? 'none' : ''; });
    if (on && still) { const pic = /** @type {Element} */ (/** @type {Element} */ (still.content.firstElementChild).cloneNode(true)); stage.prepend(pic); added = [pic]; }
  };
  const load = () => {
    const cut = phone.matches ? 'phone' : (tablet.matches ? 'tablet' : 'full');
    if (cut === shown) return;
    shown = cut;
    const mine = ++ticket;
    clear();
    failed(false);
    Promise.all(files[cut].map((url) => window.fetch(url).then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))))
      .then((texts) => {
        if (mine !== ticket) return;   // the screen changed while it loaded (even if it has changed back since)
        const before = stage.children.length;
        stage.insertAdjacentHTML('afterbegin', html(texts.join('')));
        added = Array.from(stage.children).slice(0, stage.children.length - before);
        // looping animations pause off screen: the drawing, and the dashes' layer (the cut's own on phones)
        const layers = cut === 'phone' ? added : [added[0], $('svg.ob-over:not(.ob-phone)', stage)];
        observers = layers.map((el) => whenOnScreen(el));
        /** @type {SVGGElement | null} */
        const cloud = $('svg.ob .ob-cloud', stage);
        const first = /** @type {SVGSVGElement} */ (added[0]);
        if (cut === 'phone') { if (first.dataset.items) stopCloud = startCaptions(first); }
        else if (cloud) stopCloud = startCloud(cloud);
      })
      .catch(() => { if (mine === ticket) { shown = null; failed(true); } });
  };
  load();
  [phone, tablet].forEach((m) => m.addEventListener('change', load));
}

/* ======================================================================
   Services on phones: mark the card in the middle (Home).
   The row swipes and snaps with no script. The card crossing a thin strip
   down the middle of the row gets .is-centre: it sits over its neighbours
   (and, without scroll-driven animation, is the one drawn full size;
   services.css) and lights its dot. The observer only reports a card
   entering or leaving the strip, so nothing runs while the row scrolls.
   A tap on any card opens it. "Swipe" fades once they have left the first card.
   No swipe with a mouse: the arrows step one card, a click on the dots
   jumps to the nearest dot's card, and Left / Right move focus card to card.
   A card that takes keyboard focus slides to the middle. The snap does the rest.
   Not on a mouse press: that focuses the link too, and the slide would carry
   the card out from under the pointer before the button comes up, so the click
   would never land. A click on a side card opens it, as a tap does.
   ====================================================================== */
const svcRow = $('.svc-menu');
const svcDots = $$('.svc-dots .pip');
const svcHint = $('.svc-hint');
if (svcRow && svcDots.length && 'IntersectionObserver' in window) {
  const cards = Array.from(svcRow.children);
  const hint = /** @type {HTMLElement} */ (svcHint);   // Services.astro has it with the dots
  const steps = $$('.svc-step', hint);
  const row = window.matchMedia(MEDIA.phone);
  let current = 0;
  /** @type {number | null} */
  let aim = null;   // the card a step is sliding to, so a quick second click steps on from there
  const centre = (/** @type {number} */ best) => {
    current = best;
    if (best === aim) aim = null;
    cards.forEach((li, i) => li.classList.toggle('is-centre', i === best));
    svcDots.forEach((dot, i) => dot.classList.toggle('on', i === best));
    steps.forEach((b) => b.setAttribute('aria-disabled', String(current + +(/** @type {string} */ (b.dataset.step)) < 0 || current + +(/** @type {string} */ (b.dataset.step)) >= cards.length)));
    if (best > 0) svcHint?.classList.add('is-swiped');
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) centre(cards.indexOf(en.target)); });
  }, { root: svcRow, rootMargin: '0px -49% 0px -49%' });
  cards.forEach((li) => io.observe(li));
  centre(0);
  // scrolls the row only (scrollIntoView would also move the page); the li itself never transforms, so its box is true
  const go = (/** @type {number} */ i) => {
    aim = Math.max(0, Math.min(cards.length - 1, i));
    const li = cards[aim];
    const r = li.getBoundingClientRect(), box = svcRow.getBoundingClientRect();
    svcRow.scrollBy({ left: r.left + r.width / 2 - (box.left + box.width / 2), behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    if (aim === current) aim = null;
  };
  // a slide that ends (or a swipe that cuts it short) forgets its aim. Safari before 26.2 has no scrollend: there a
  // scroll that has been still for 150ms has ended (review J15)
  const settle = () => { aim = null; };
  if ('onscrollend' in window) svcRow.addEventListener('scrollend', settle);
  else {
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    let quiet;   // (window is "never" here to the type check, which knows only browsers with scrollend)
    svcRow.addEventListener('scroll', () => { clearTimeout(quiet); quiet = setTimeout(settle, 150); }, { passive: true });
  }
  steps.forEach((b) => b.addEventListener('click', () => go((aim ?? current) + +(/** @type {string} */ (b.dataset.step)))));
  $('.svc-dots', hint)?.addEventListener('click', (e) => {
    const near = svcDots.map((dot) => { const r = dot.getBoundingClientRect(); return Math.abs(e.clientX - (r.left + r.width / 2)); });
    go(near.indexOf(Math.min(...near)));
  });
  // keyboard focus only (above); a browser without :focus-visible slides on any focus, as before
  const byKeyboard = (/** @type {Element} */ el) => { try { return el.matches(':focus-visible'); } catch { return true; } };
  svcRow.addEventListener('focusin', (e) => { if (row.matches && byKeyboard(/** @type {Element} */ (e.target))) go(cards.indexOf(/** @type {Element} */ (/** @type {Element} */ (e.target).closest('li')))); });
  svcRow.addEventListener('keydown', (e) => {
    if (!row.matches || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || e.altKey || e.ctrlKey || e.metaKey) return;
    const next = cards[cards.indexOf(/** @type {Element} */ (/** @type {Element} */ (e.target).closest('li'))) + (e.key === 'ArrowLeft' ? -1 : 1)];
    if (!next) return;
    e.preventDefault();
    /** @type {HTMLElement} */ ($('a', next)).focus({ preventScroll: true });
  });
}

/* ------------------------------------------------------------------
   Wheel grid (fold.css, tokens.css): on desktop every fold is a whole
   number of wheel steps tall, so the wheel's stops land on fold edges.
   CSS makes each fold at least one screen, rounded up to a step; a fold
   whose words need more room than that (Proof always: it is as tall as
   its words; Services and Grow on a narrow or short desktop, 1100 x 700
   to 1200 x 800) grows by its content, which CSS can't round, so each
   rounds its own height up to the next step here, and the next fold
   starts on a stop too. Off below desktop, where sections take their
   own height.
   ------------------------------------------------------------------ */
const folds = $$('main > .fold, #proof').filter((f) => f.firstElementChild);
if (folds.length && 'ResizeObserver' in window) {
  const fold = window.matchMedia(MEDIA.fold);
  const fit = (/** @type {HTMLElement} */ f) => {
    f.style.minHeight = '';
    if (!fold.matches) return;
    const step = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--wheel-step'));
    const h = f.getBoundingClientRect().height;   // its own height: the CSS floor, or its words if they need more
    const up = Math.ceil(h / step - 0.001) * step;
    if (step > 0 && up - h > 0.5) f.style.minHeight = `${up}px`;
  };
  // a fold's inner box keeps its height when the fold grows (centred in its row, not stretched; its words only rewrap
  // with the width), so this never loops
  const seen = new ResizeObserver((list) => list.forEach((e) => fit(/** @type {HTMLElement} */ (e.target.parentElement))));
  folds.forEach((f) => seen.observe(/** @type {Element} */ (f.firstElementChild)));
  fold.addEventListener('change', () => folds.forEach(fit));
}
