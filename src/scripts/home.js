/* ==========================================================================
   Uplink Technology · Home page
   Growing world and hero cloud.
   ========================================================================== */

import { $, $$, html, reduceMotion, replay, whenOnScreen } from './core.js';

// Runs fn right after the browser's next layout pass (a ResizeObserver's first report comes then), so sizes read
// in fn cost nothing. Read straight after a change to the page, they make the browser lay it out again on the
// spot (a forced layout). Old browsers: after the next paint, which is clean unless something else ran between.
const afterLayout = (fn) => {
  if (!('ResizeObserver' in window)) { window.requestAnimationFrame(() => window.setTimeout(fn, 0)); return; }
  const ro = new ResizeObserver(() => { ro.disconnect(); fn(); });
  ro.observe(document.documentElement);
};

/* ======================================================================
   Growth story: the world grows as you scroll (Home)
   ====================================================================== */
// The scroll sets q, 0 to 3, one unit per level. Inside a level (u, 0 to 1): the step text swaps at 0, the camera
// pulls back over .08-.25, the new pieces build over .25-.75 (level 1: .05-.65), then it holds and the tags show.
// That gives p, 0 to 3, the drawing's own growth scale: every storey and piece starts at its data-at (written by
// tools/gen_tower.py) and builds over 0.4 (storeys 0.55). q is eased toward the scroll so a flick can't make the
// floors jitter. Every screen but a short desktop one: the stage holds still for RUN of a screen per level
// (grow.css: 1 + 3 x RUN = 2.5). Short desktop screens: q follows the steps down the
// right-hand column. Reduced motion: no stage and no scrub; the steps stack and the drawing shows finished. Each level's camera (data-cam1..3) is widened to the picture's shape, and zoomed out to at
// most ZOOM times the level 3 scale per level, so the pull-back stays gentle and the tower never shrinks much.
const tower = $('.grow svg.tg');
const grow = tower && tower.closest('.grow');
if (grow && 'IntersectionObserver' in window) {
  const LEAD = 0.3;   // level 1 starts building this much of a level before the stage pins
  const RUN = 0.5;    // screens of scroll per level
  const ZOOM = 1.25;  // most a level's camera may zoom in on the next one's
  const liveMode = window.matchMedia('(max-width: 1099px), (min-height: 700px)');
  const wide = window.matchMedia('(min-width: 1100px)');
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const amt = (p, at, d) => ease(clamp((p - at) / d));
  const people = (p) => Math.round(p <= 1 ? 1 + 9 * p : p <= 2 ? 10 + 40 * (p - 1) : 50 + 100 * (p - 2));

  const storey = Number(tower.dataset.storey);
  const cams = [1, 2, 3].map((k) => tower.dataset['cam' + k].split(' ').map(Number));
  const floors = $$('.tg-floor', tower).map((el) => ({ el, at: Number(el.dataset.at) }));
  const roof = $('.tg-roof', tower);
  const pieces = $$('.tg-p', tower).map((el) => ({ el, at: Number(el.dataset.at), line: $('.tg-cable', el), flow: $('.tg-flow', el) }));
  const spots = {};
  $$('.tg-a', tower).forEach((c) => { spots[c.dataset.a] = [Number(c.getAttribute('cx')), Number(c.getAttribute('cy'))]; });
  const tags = $$('.grow-tag', grow).map((el) => ({ el, l: Number(el.dataset.l), at: spots[el.dataset.a], w: 0, h: 0 }));
  const steps = $$('.grow-step', grow);
  const side = $('.grow-side', grow);
  const head = $('.section-head', grow);
  const art = $('.grow-art', grow);
  const list = $('.grow-steps', grow);
  const lvl = $('.grow-lvl', grow);
  const num = $('.grow-num', grow);
  const bars = $$('.grow-bar i', grow);

  tower.classList.add('tg-live');
  let live = false, stageH = 0, stageTop = 0, pinTop = 0, stem = 0, views = cams, boxW = 0, boxH = 0;
  let qd = null, drawn = null, last = 0, level = 0, shown = '', lit = '', frame = 0, vbNow = '', onScreen = false;
  let ready = false, run = 0, size = '';

  // each camera, grown to the picture's shape and capped in zoom
  const fit = () => {
    const r = tower.getBoundingClientRect();
    boxW = r.width; boxH = r.height;   // the drawing's box: viewBox changes never move it, so draw() reuses these
    if (!r.width || !r.height) { views = cams; return; }
    const scale = (c) => Math.min(r.width / c[2], r.height / c[3]);
    const far = scale(cams[2]);
    views = cams.map((c, i) => {
      const s = Math.min(scale(c), far * ZOOM ** (2 - i));
      const w = r.width / s, h = r.height / s;
      return [c[0] + c[2] / 2 - w / 2, c[1] + c[3] / 2 - h / 2, w, h];
    });
  };

  // Sizes are read only after a layout pass (afterLayout), never straight after is-live or --grow-cap changes; each of
  // those writes waits one frame. A newer measure drops an older one still waiting (run).
  const read = () => {
    if (live) {
      if (wide.matches) {
        stageH = side.offsetHeight;
        pinTop = parseFloat(getComputedStyle(side).top) || 0;
        stageTop = 0;
      } else {
        stageH = art.offsetHeight + list.offsetHeight;
        pinTop = parseFloat(getComputedStyle(art).top) || 0;
        stageTop = head.offsetTop + head.offsetHeight;
      }
      tags.forEach((t) => { t.w = t.el.offsetWidth; t.h = t.el.offsetHeight; });
      if (tags[0]) stem = parseFloat(getComputedStyle(tags[0].el, '::after').height) || 0;
    }
    size = window.innerWidth + 'x' + document.documentElement.clientHeight;
    fit();
    if (!ready) {   // the first picture shows at once: no step fade on load; fades come back two frames later
      ready = true;
      qd = Math.min(3, Math.max(0, target()));
      draw(qd);
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => grow.classList.remove('no-trans')));
    } else if (onScreen) start();   // redraw for the new size
  };
  const measure = () => {
    const mine = ++run;
    live = liveMode.matches && !reduceMotion.matches;
    grow.classList.toggle('is-live', live);
    drawn = null;
    afterLayout(() => {
      if (mine !== run) return;
      // the step box's height (the tallest step) sizes the picture above it, so the rest waits for that layout
      const cap = live && !wide.matches ? list.offsetHeight + 'px' : '';
      if (cap && cap !== grow.style.getPropertyValue('--grow-cap')) {
        grow.style.setProperty('--grow-cap', cap);
        afterLayout(() => { if (mine === run) read(); });
      } else read();
    });
  };

  const target = () => {
    if (reduceMotion.matches) return 3;
    if (live) return (pinTop - grow.getBoundingClientRect().top - stageTop) / (RUN * stageH) + LEAD;
    const first = steps[0].getBoundingClientRect();
    return (window.innerHeight * 0.85 - first.top) / steps[0].offsetHeight;
  };

  const draw = (q) => {
    const L = Math.min(3, Math.floor(q) + 1);
    const u = q >= 3 ? 1 : q - (L - 1);
    const b0 = L === 1 ? 0.05 : 0.25, b1 = L === 1 ? 0.65 : 0.75;
    const p = L - 1 + clamp((u - b0) / (b1 - b0));
    // the camera pulls back as a level starts; with reduced motion it cuts straight to the level's view
    const k = L === 1 ? 0 : reduceMotion.matches ? 1 : ease(clamp((u - 0.08) / 0.17));
    const from = views[Math.max(0, L - 2)], to = views[L - 1];
    const vb = from.map((v, i) => v + (to[i] - v) * k);
    const vbs = vb.map((v) => v.toFixed(1)).join(' ');
    if (vbs !== vbNow) { vbNow = vbs; tower.setAttribute('viewBox', vbs); }   // between pull-backs the camera rests

    let built = 0, top = 0;
    floors.forEach((f, i) => {
      const a = amt(p, f.at, 0.55);
      built += a;
      if (a > 0.85) top = i + 1;
      f.el.style.opacity = a;
      f.el.style.transform = `translateY(${(-30 * (1 - a)).toFixed(1)}px)`;
    });
    roof.style.opacity = clamp(amt(p, 0, 0.55) * 2);
    roof.style.transform = `translateY(${((floors.length - built) * storey).toFixed(1)}px)`;
    const floorsNow = String(Math.max(1, top));
    if (floorsNow !== lit) { lit = floorsNow; tower.setAttribute('data-floors', lit); }
    pieces.forEach((pc) => {
      const a = amt(p, pc.at, 0.4);
      // a piece's looping parts (dashes, ring, floating cloud) wait, paused, until it shows (grow.css .is-off)
      const off = pc.line ? a <= 0.98 : a === 0;
      if (off !== pc.off) { pc.off = off; pc.el.classList.toggle('is-off', off); }
      if (pc.line) {
        pc.el.style.opacity = a > 0 ? 1 : 0;
        pc.line.style.strokeDashoffset = (1 - a).toFixed(3);
        pc.flow.style.opacity = a > 0.98 ? 1 : 0;
      } else {
        pc.el.style.opacity = a;
        pc.el.style.transform = `translateY(${(-24 * (1 - a)).toFixed(1)}px)`;
      }
    });

    if (L !== level) {
      level = L;
      steps.forEach((s, i) => { if (i === L - 1) s.setAttribute('data-active', ''); else s.removeAttribute('data-active'); });
      if (lvl) lvl.textContent = L;
    }
    const n = String(people(p));
    if (num && n !== shown) { shown = n; num.textContent = n; }
    bars.forEach((b, i) => { b.style.setProperty('--fill', clamp(p - i).toFixed(3)); });

    if (!live) return;
    const s = Math.min(boxW / vb[2], boxH / vb[3]);
    const ox = (boxW - vb[2] * s) / 2, oy = (boxH - vb[3] * s) / 2;
    const fade = clamp((u - 0.72) / 0.1);
    tags.forEach((t) => {
      if (t.l !== L || !t.at) { t.el.style.opacity = 0; return; }
      const half = t.w / 2;
      const x = Math.min(boxW - half - 8, Math.max(half + 8, ox + (t.at[0] - vb[0]) * s));
      const y = oy + (t.at[1] - vb[1]) * s;
      t.el.style.transform = `translate(${(x - half).toFixed(1)}px, ${(y - t.h - stem).toFixed(1)}px)`;
      t.el.style.opacity = fade;
    });
  };

  const tick = (now) => {
    frame = 0;
    const q = Math.min(3, Math.max(0, target()));
    const dt = last ? Math.min(64, now - last) : 16;
    last = now;
    qd = qd === null || reduceMotion.matches ? q : qd + (q - qd) * (1 - Math.exp(-dt / 110));
    if (Math.abs(q - qd) < 0.0005) qd = q;
    if (qd !== drawn) { drawn = qd; draw(qd); }
    // settled on the scroll: stop until the next scroll (or resize) starts it again, so a still page costs nothing
    if (qd !== q) frame = window.requestAnimationFrame(tick);
  };
  function start() { if (ready && !frame) { last = 0; frame = window.requestAnimationFrame(tick); } }
  const stop = () => { if (frame) window.cancelAnimationFrame(frame); frame = 0; };

  grow.classList.add('no-trans');
  measure();
  liveMode.addEventListener('change', measure);
  wide.addEventListener('change', measure);
  reduceMotion.addEventListener('change', measure);
  // Phones fire resize each time the address bar slides; the layout here follows the width and the small viewport
  // height (svh), which don't change then, so measure only when one of those does (read() keeps the last size).
  window.addEventListener('resize', () => {
    const now = window.innerWidth + 'x' + document.documentElement.clientHeight;
    if (now !== size) { size = now; measure(); }
  });
  // A web font arriving (or anything else) that resizes the steps measures again. Not fonts.ready: reading it makes
  // the browser lay the page out on the spot to see which fonts are pending.
  if ('ResizeObserver' in window) {
    let first = true;
    new ResizeObserver(() => { if (first) first = false; else measure(); }).observe(list);
  }
  window.addEventListener('scroll', () => { if (onScreen) start(); }, { passive: true });
  whenOnScreen(grow, (on) => { onScreen = on; if (on) start(); else stop(); });
}

/* ------------------------------------------------------------------
   Hero cloud: shows one cloud app at a time, big and readable. A curved
   line runs from the cloud to that app's tile in the floating tray.
   It steps through the apps on a timer; hovering a tile or a bar
   segment picks one. Reduced motion: no timer, no line animation.
   The drawing comes in three cuts, each its own file named on the stage
   (HERO in src/lib/site.ts, preloaded for the same screens), so a screen
   downloads only its own: the full hero; the tablet cut (fewer, bigger
   labels) where the hero shows narrow (data-tablet); and on phones the
   phone cut, animated, with its dashes in a second file. Phones with
   reduced motion fetch nothing and keep the still picture (compact-cuts.css).
   The hero cuts go in ahead of the dashes' layer (svg.ob-over), then the
   cloud starts. A turn or resize that changes the cut swaps the file.
   ------------------------------------------------------------------ */
const stage = $('.hero-art .stage[data-hero]');
// Pause button (Hero.astro): holds every moving part on the page. html.is-held pauses the CSS animations
// (base.css); the cloud and the phone captions stop their timers while held. The choice is kept for next time.
const held = { on: false, ev: new EventTarget() };
const pauseBtn = stage && $('.hero-pause', stage);
if (pauseBtn) {
  const set = (on) => {
    held.on = on;
    document.documentElement.classList.toggle('is-held', on);
    pauseBtn.setAttribute('aria-pressed', String(on));
    held.ev.dispatchEvent(new Event('change'));
  };
  const show = () => { pauseBtn.hidden = reduceMotion.matches; };   // nothing moves with reduced motion
  try { if (window.localStorage.getItem('uplink-held') === '1') set(true); } catch { /* storage blocked: start moving */ }
  pauseBtn.addEventListener('click', () => {
    set(!held.on);
    try { window.localStorage.setItem('uplink-held', held.on ? '1' : '0'); } catch { /* storage blocked: this visit only */ }
  });
  show();
  reduceMotion.addEventListener('change', show);
}
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
const startCloud = (cloud) => {
  const svg = cloud.ownerSVGElement;
  const focus = svg.querySelector('.ob-focus');
  const appText = svg.querySelector('.ob-app');
  const stateText = svg.querySelector('.ob-state');
  const detailText = svg.querySelector('.ob-detail');
  const base = cloud.querySelector('.ob-link-base');
  const flow = cloud.querySelector('.ob-link');
  const end = svg.querySelector('.ob-link-end');
  const START = { x: +(cloud.dataset.sx || 878), y: +(cloud.dataset.sy || 46) };
  const LINK = cloud.dataset.link || 'curve';
  const tile = (id) => svg.querySelector('.ob-tile[data-tile="' + id + '"]');
  const topCentre = (t) => {
    const pts = t.querySelector('.f-t').getAttribute('points').trim().split(/\s+/).map((p) => p.split(',').map(Number));
    return { x: pts.reduce((a, p) => a + p[0], 0) / pts.length, y: pts.reduce((a, p) => a + p[1], 0) / pts.length };
  };
  // The state word is right-aligned, so the dot before it moves with the word's width.
  // The browser reports the new size after its own layout pass (ResizeObserver), so
  // nothing is measured straight after the text changes (that would force a layout).
  // For SVG it reports only the size, so: the word's right edge (its x) minus its width.
  const dot = svg.querySelector('.ob-state-dot');
  let dotSized = null;
  if (dot && 'ResizeObserver' in window) {
    const right = +stateText.parentNode.getAttribute('x');
    dotSized = new ResizeObserver(([en]) => dot.setAttribute('cx', (right - en.contentRect.width - 10).toFixed(1)));
    dotSized.observe(stateText.parentNode);
  }
  let index = -1;
  let swap = 0;
  const show = (i) => {
    i = (i + APPS.length) % APPS.length;
    if (i === index) return;
    const first = index < 0;
    index = i;
    const app = APPS[i];
    svg.querySelectorAll('.ob-tile').forEach((t) => t.classList.toggle('is-on', t.dataset.tile === app.id));
    cloud.querySelectorAll('.ob-seg, .ob-pip').forEach((s) => s.classList.toggle('is-on', s.dataset.app === app.id));
    const t = tile(app.id);
    if (t && LINK !== 'none') {
      const p = topCentre(t);
      const dPath = LINK === 'elbow' ? 'M' + START.x + ',' + START.y + ' H' + p.x + ' V' + p.y : 'M' + START.x + ',' + START.y + ' C' + (START.x + 70) + ',' + START.y + ' ' + p.x + ',' + (p.y - 110) + ' ' + p.x + ',' + p.y;
      base.setAttribute('d', dPath);
      flow.setAttribute('d', dPath);
      end.setAttribute('cx', p.x);
      end.setAttribute('cy', p.y);
      const len = base.getTotalLength();
      base.style.strokeDasharray = len;
      base.style.setProperty('--len', len);
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
  const pick = (id) => { loop.stop(); show(APPS.findIndex((a) => a.id === id)); };
  svg.querySelectorAll('.ob-tile').forEach((t) => {
    t.addEventListener('pointerenter', () => pick(t.dataset.tile));
    t.addEventListener('pointerleave', loop.start);
  });
  cloud.querySelectorAll('.ob-seg-hit').forEach((h) => {
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
   sizes from hero.css (--cap-*), turned into drawing units here.
   Nothing is measured while the captions run: the drawing's width comes
   from a ResizeObserver, and each caption's text is measured once per
   width, all together in a hidden group, after layout (measure()).
   ------------------------------------------------------------------ */
const SVG_NS = 'http://www.w3.org/2000/svg';
const CAP_EVERY = 2200;     // ms between caption changes, the two captions taking turns (each one every 4.4s)
const CAP_SWAP = 170;       // ms a caption takes to fade out before its new words go in (hero.css: --dur-1, plus a frame)
const CAP_FIRST = 3300;     // ms before the first caption: the drawing builds first (office_parts/build.css)
const CAP_SECOND = 1100;    // ms from the first caption to the second
const CLOUD_TITLE = 'Cloud workspace';
const make = (tag, cls, parent) => {
  const el = document.createElementNS(SVG_NS, tag);
  el.setAttribute('class', cls);
  parent.append(el);
  return el;
};
// a caption line's words; the cloud's names its app first, in a tspan
const fill = (el, text, app) => {
  if (!app) { el.textContent = text; return; }
  const name = document.createElementNS(SVG_NS, 'tspan');
  name.setAttribute('class', 'ob-cap-app');
  name.textContent = app;
  el.replaceChildren(name, text);
};
const startCaptions = (svg) => {
  const vb = svg.viewBox.baseVal;
  const [cloudX, cloudY] = svg.dataset.cloud.split(',').map(Number);
  const items = JSON.parse(svg.dataset.items);
  let size = null, width = 0, cloudFill = '';
  const lengths = new Map();   // each caption text's length in drawing units, at the current width
  const readSizes = () => {
    const css = window.getComputedStyle(svg);
    const rootPx = parseFloat(window.getComputedStyle(document.documentElement).fontSize);
    const px = (name) => { const v = css.getPropertyValue(name).trim(); return parseFloat(v) * (v.endsWith('rem') ? rootPx : 1); };
    return { t: px('--cap-title'), s: px('--cap-sub'), edge: px('--cap-edge'), gap: px('--cap-gap'), line: px('--cap-line'), dot: px('--cap-dot'), halo: px('--cap-halo') };
  };
  const spot = (name) => {
    const g = make('g', 'ob-cap ob-cap-' + name, svg);
    const lead = make('path', 'ob-cap-lead', g);
    const ring = make('circle', 'ob-cap-ring', g);
    const end = make('circle', 'ob-cap-end', g);
    const words = make('g', 'ob-cap-words', g);
    return { g, lead, ring, end, t: make('text', 'ob-cap-t', words), s: make('text', 'ob-cap-s', words) };
  };
  const spots = { cloud: spot('cloud'), office: spot('office') };
  const at = { cloud: -1, office: -1 };
  // words: cloud hangs from the drawing's top edge, office stands on its bottom edge
  const place = (sp, top, tKey, sKey) => {
    if (!width || !lengths.has(tKey)) return null;   // not measured yet (hidden, or mid-swap): measure() places it
    const k = vb.width / width;   // drawing units per screen px
    const tf = size.t * k, sf = size.s * k, x = vb.x + size.edge * k;
    [[sp.t, tf], [sp.s, sf]].forEach(([el, f]) => {
      el.setAttribute('font-size', f.toFixed(1));
      el.setAttribute('x', x.toFixed(1));
      el.style.strokeWidth = (size.halo * k).toFixed(1) + 'px';
    });
    let ty, sy;
    if (top) { ty = vb.y + size.edge * k + tf * 0.76; sy = ty + size.gap * k + sf * 1.05; }
    else { sy = vb.y + vb.height - size.edge * k - sf * 0.28; ty = sy - size.gap * k - sf * 1.05; }
    sp.t.setAttribute('y', ty.toFixed(1));
    sp.s.setAttribute('y', sy.toFixed(1));
    return { k, x, ty, tf, tw: lengths.get(tKey), sw: lengths.get(sKey) };
  };
  const draw = (sp, d, colour, x, y, k) => {
    sp.lead.setAttribute('d', d);
    sp.lead.setAttribute('stroke', colour);
    sp.lead.setAttribute('stroke-width', (size.line * k).toFixed(1));
    const len = sp.lead.getTotalLength();
    sp.lead.style.strokeDasharray = len;
    sp.lead.style.setProperty('--len', len);
    [sp.end, sp.ring].forEach((c) => { c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', (size.dot * k).toFixed(1)); });
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
      svg.querySelectorAll('.ob-tile').forEach((t) => t.classList.toggle('is-on', t.dataset.tile === app.id));
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
  const cancel = (sw) => { window.clearTimeout(sw.t); window.cancelAnimationFrame(sw.f); };
  const step = (name, animate) => {
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
  const measure = (w) => {
    const mine = ++job;
    if (!size) size = readSizes();
    const k = vb.width / w;
    const box = make('g', 'ob-cap ob-cap-cloud', svg);
    box.setAttribute('visibility', 'hidden');
    const probe = (key, cls, f, text, app) => {
      const el = make('text', cls, box);
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
        if (begun) { write.cloud(); write.office(); }
      }
      box.remove();
    });
  };
  // Re-measure only when the drawing's width changes. Phones fire `resize` each time the address bar shows or
  // hides, which would replay the line and dot mid-scroll; the drawing keeps its width then.
  let lastW = 0;
  const relayout = (w) => {
    if (!w || Math.abs(w - lastW) < 0.5) return;
    lastW = w;
    measure(w);
  };
  const onResize = () => relayout(svg.getBoundingClientRect().width);
  const sized = 'ResizeObserver' in window ? new ResizeObserver(([en]) => relayout(en.contentRect.width)) : null;
  if (sized) sized.observe(svg); else { window.addEventListener('resize', onResize); afterLayout(onResize); }
  // first words once the drawing has built (about 3.2s; at once with reduced motion), the office's 1.1s after
  const quick = reduceMotion.matches;
  let second = 0;
  const first = window.setTimeout(() => {
    begun = true;
    step('cloud', !quick);
    second = window.setTimeout(() => { step('office', !quick); loop.start(); }, quick ? 0 : CAP_SECOND);
  }, quick ? 0 : CAP_FIRST);
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
  const phone = window.matchMedia('(max-width: 599px)');
  const tablet = window.matchMedia(stage.dataset.tablet);
  const files = {
    full: [stage.dataset.hero],
    tablet: [stage.dataset.heroTablet],
    phone: [stage.dataset.heroPhone, stage.dataset.heroPhoneFlows]
  };
  let shown = null;
  let added = [];
  let observers = [];
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
  const load = () => {
    const cut = phone.matches ? (reduceMotion.matches ? null : 'phone') : (tablet.matches ? 'tablet' : 'full');
    if (cut === shown) return;
    shown = cut;
    const mine = ++ticket;
    clear();
    if (!cut) return;
    Promise.all(files[cut].map((url) => window.fetch(url).then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))))
      .then((texts) => {
        if (mine !== ticket) return;   // the screen changed while it loaded (even if it has changed back since)
        const before = stage.children.length;
        stage.insertAdjacentHTML('afterbegin', html(texts.join('')));
        added = Array.from(stage.children).slice(0, stage.children.length - before);
        // looping animations pause off screen: the drawing, and the dashes' layer (the cut's own on phones)
        const layers = cut === 'phone' ? added : [added[0], $('svg.ob-over:not(.ob-phone)', stage)];
        observers = layers.map((el) => whenOnScreen(el));
        const cloud = $('svg.ob .ob-cloud', stage);
        if (cut === 'phone') { if (added[0].dataset.items) stopCloud = startCaptions(added[0]); }
        else if (cloud) stopCloud = startCloud(cloud);
      })
      .catch(() => { /* no drawing: the stage stays empty and the page still reads */ });
  };
  load();
  [phone, tablet, reduceMotion].forEach((m) => m.addEventListener('change', load));
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
   A card that takes focus slides to the middle. The snap does the rest.
   ====================================================================== */
const svcRow = $('.svc-menu');
const svcDots = $$('.svc-dots i');
const svcHint = $('.svc-hint');
if (svcRow && svcDots.length && 'IntersectionObserver' in window) {
  const cards = Array.from(svcRow.children);
  const steps = $$('.svc-step', svcHint);
  const row = window.matchMedia('(max-width: 699px)');   // as services.css
  let current = 0;
  let aim = null;   // the card a step is sliding to, so a quick second click steps on from there
  const centre = (best) => {
    current = best;
    if (best === aim) aim = null;
    cards.forEach((li, i) => li.classList.toggle('is-centre', i === best));
    svcDots.forEach((dot, i) => dot.classList.toggle('on', i === best));
    steps.forEach((b) => b.setAttribute('aria-disabled', String(current + +b.dataset.step < 0 || current + +b.dataset.step >= cards.length)));
    if (best > 0) svcHint?.classList.add('is-swiped');
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) centre(cards.indexOf(en.target)); });
  }, { root: svcRow, rootMargin: '0px -49% 0px -49%' });
  cards.forEach((li) => io.observe(li));
  centre(0);
  // scrolls the row only (scrollIntoView would also move the page); the li itself never transforms, so its box is true
  const go = (i) => {
    aim = Math.max(0, Math.min(cards.length - 1, i));
    const li = cards[aim];
    const r = li.getBoundingClientRect(), box = svcRow.getBoundingClientRect();
    svcRow.scrollBy({ left: r.left + r.width / 2 - (box.left + box.width / 2), behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    if (aim === current) aim = null;
  };
  svcRow.addEventListener('scrollend', () => { aim = null; });
  steps.forEach((b) => b.addEventListener('click', () => go((aim ?? current) + +b.dataset.step)));
  $('.svc-dots', svcHint)?.addEventListener('click', (e) => {
    const near = svcDots.map((dot) => { const r = dot.getBoundingClientRect(); return Math.abs(e.clientX - (r.left + r.width / 2)); });
    go(near.indexOf(Math.min(...near)));
  });
  svcRow.addEventListener('focusin', (e) => { if (row.matches) go(cards.indexOf(e.target.closest('li'))); });
  svcRow.addEventListener('keydown', (e) => {
    if (!row.matches || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || e.altKey || e.ctrlKey || e.metaKey) return;
    const next = cards[cards.indexOf(e.target.closest('li')) + (e.key === 'ArrowLeft' ? -1 : 1)];
    if (!next) return;
    e.preventDefault();
    $('a', next).focus({ preventScroll: true });
  });
}
