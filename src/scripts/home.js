/* ==========================================================================
   Uplink Technology · Home page
   Growing world and hero cloud.
   ========================================================================== */

import { $, $$, html, reduceMotion, whenOnScreen } from './core.js';

/* ======================================================================
   Growth story: the world grows as you scroll (Home)
   ====================================================================== */
// The scroll sets q, 0 to 3, one unit per level. Inside a level (u, 0 to 1): the step text swaps at 0, the camera
// pulls back over .08-.25, the new pieces build over .25-.75 (level 1: .05-.65), then it holds and the tags show.
// That gives p, 0 to 3, the drawing's own growth scale: every storey and piece starts at its data-at (written by
// tools/gen_tower.py) and builds over 0.4 (storeys 0.55). q is eased toward the scroll so a flick can't make the
// floors jitter. Phone and tablet: the stage holds still for RUN of a screen per level (grow.css: 1 + 3 x RUN = 3.7)
// and snaps softly to each hold. Desktop: q follows the steps down the right-hand column.
const tower = $('.grow svg.tg');
const grow = tower && tower.closest('.grow');
if (grow && 'IntersectionObserver' in window) {
  const LEAD = 0.3;   // level 1 starts building this much of a level before the stage pins
  const RUN = 0.9;    // screens of scroll per level, phone and tablet
  const HOLD = 0.87;  // where in a level the snap mark sits
  const stageMode = window.matchMedia('(max-width: 1099px)');
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
  const head = $('.section-head', grow);
  const art = $('.grow-art', grow);
  const list = $('.grow-steps', grow);
  const snaps = $$('.grow-snap', grow);
  const lvl = $('.grow-lvl', grow);
  const num = $('.grow-num', grow);
  const bars = $$('.grow-bar i', grow);

  tower.classList.add('tg-live');
  let live = false, stageH = 0, pinTop = 0, stem = 0;
  let qd = null, drawn = null, last = 0, level = 0, shown = '', lit = '', frame = 0;

  const measure = () => {
    live = stageMode.matches;
    grow.classList.toggle('is-live', live);
    if (!live) return;
    grow.style.setProperty('--grow-cap', list.offsetHeight + 'px');
    stageH = art.offsetHeight + list.offsetHeight;
    pinTop = parseFloat(getComputedStyle(art).top) || 0;
    const pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const headEnd = head.offsetTop + head.offsetHeight;
    snaps.forEach((s, i) => { s.style.top = Math.round(headEnd - pinTop + (i + HOLD - LEAD) * RUN * stageH + pad) + 'px'; });
    tags.forEach((t) => { t.w = t.el.offsetWidth; t.h = t.el.offsetHeight; });
    if (tags[0]) stem = parseFloat(getComputedStyle(tags[0].el, '::after').height) || 0;
    drawn = null;
  };

  const target = () => {
    if (live) return (pinTop - head.getBoundingClientRect().bottom) / (RUN * stageH) + LEAD;
    const first = steps[0].getBoundingClientRect();
    return (window.innerHeight * 0.85 - first.top) / steps[0].offsetHeight;
  };

  const draw = (q) => {
    const L = Math.min(3, Math.floor(q) + 1);
    const u = q >= 3 ? 1 : q - (L - 1);
    const b0 = L === 1 ? 0.05 : 0.25, b1 = L === 1 ? 0.65 : 0.75;
    const p = L - 1 + clamp((u - b0) / (b1 - b0));
    const k = L === 1 ? 0 : ease(clamp((u - 0.08) / 0.17));
    const from = cams[Math.max(0, L - 2)], to = cams[L - 1];
    const vb = from.map((v, i) => v + (to[i] - v) * k);
    tower.setAttribute('viewBox', vb.map((v) => v.toFixed(1)).join(' '));

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
    const r = tower.getBoundingClientRect();
    const s = Math.min(r.width / vb[2], r.height / vb[3]);
    const ox = (r.width - vb[2] * s) / 2, oy = (r.height - vb[3] * s) / 2;
    const fade = clamp((u - 0.72) / 0.1);
    tags.forEach((t) => {
      if (t.l !== L || !t.at) { t.el.style.opacity = 0; return; }
      const half = t.w / 2;
      const x = Math.min(r.width - half - 8, Math.max(half + 8, ox + (t.at[0] - vb[0]) * s));
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
    if (qd !== drawn) { drawn = qd; draw(qd); }   // nothing to do while the scroll is still
    frame = window.requestAnimationFrame(tick);
  };
  const start = () => { if (!frame) { last = 0; frame = window.requestAnimationFrame(tick); } };
  const stop = () => { if (frame) window.cancelAnimationFrame(frame); frame = 0; };

  // The first picture shows at once: no step fade on load. Fades come back two frames later.
  grow.classList.add('no-trans');
  measure();
  qd = Math.min(3, Math.max(0, target()));
  draw(qd);
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => grow.classList.remove('no-trans')));
  stageMode.addEventListener('change', measure);
  window.addEventListener('resize', measure);
  if (document.fonts) document.fonts.ready.then(measure);
  whenOnScreen(grow, (on) => { if (on) start(); else stop(); });
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
const APPS = [
  { id: 'mail',   name: 'Email',    state: 'Online',  detail: 'Spam and phishing filtered' },
  { id: 'files',  name: 'Files',    state: 'Synced',  detail: 'OneDrive and Drive backed up' },
  { id: 'meet',   name: 'Meetings', state: 'Ready',   detail: 'Teams and Meet, one-click join' },
  { id: 'chat',   name: 'Chat',     state: 'Online',  detail: 'Every channel watched' },
  { id: 'cal',    name: 'Calendar', state: 'Synced',  detail: 'Shared calendars in step' },
  { id: 'secure', name: 'Sign-in',  state: 'Secured', detail: 'MFA on for every user' }
];
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
  if (dot && 'ResizeObserver' in window) {
    const right = +stateText.parentNode.getAttribute('x');
    new ResizeObserver(([en]) => dot.setAttribute('cx', (right - en.contentRect.width - 10).toFixed(1))).observe(stateText.parentNode);
  }
  let index = -1;
  let timer = 0;
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
      base.classList.remove('is-draw');
      void base.getBoundingClientRect();
      base.classList.add('is-draw');
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
    swap = window.setTimeout(write, 180);
  };
  let onScreen = true;
  const stop = () => { window.clearInterval(timer); timer = 0; };
  const start = () => {
    stop();
    if (reduceMotion.matches || document.hidden || !onScreen) return;
    timer = window.setInterval(() => show(index + 1), 3200);
  };
  const pick = (id) => { stop(); show(APPS.findIndex((a) => a.id === id)); };
  svg.querySelectorAll('.ob-tile').forEach((t) => {
    t.addEventListener('pointerenter', () => pick(t.dataset.tile));
    t.addEventListener('pointerleave', start);
  });
  cloud.querySelectorAll('.ob-seg-hit').forEach((h) => {
    h.addEventListener('pointerenter', () => pick(h.dataset.app));
    h.addEventListener('pointerleave', start);
  });
  const onVisible = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVisible);
  reduceMotion.addEventListener('change', start);
  // off screen: no timer, and the looping animations pause
  const seen = whenOnScreen(svg, (on) => { onScreen = on; if (on) start(); else stop(); });
  show(0);
  start();
  return () => {   // the cut is swapped out: let go of the timers and listeners
    stop();
    window.clearTimeout(swap);
    document.removeEventListener('visibilitychange', onVisible);
    reduceMotion.removeEventListener('change', start);
    if (seen) seen.disconnect();
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
   ------------------------------------------------------------------ */
const SVG_NS = 'http://www.w3.org/2000/svg';
const make = (tag, cls, parent) => {
  const el = document.createElementNS(SVG_NS, tag);
  el.setAttribute('class', cls);
  parent.append(el);
  return el;
};
const restart = (el, cls) => { el.classList.remove(cls); void el.getBoundingClientRect(); el.classList.add(cls); };
const startCaptions = (svg) => {
  const vb = svg.viewBox.baseVal;
  const [cloudX, cloudY] = svg.dataset.cloud.split(',').map(Number);
  const items = JSON.parse(svg.dataset.items);
  const css = window.getComputedStyle(svg);
  const rootPx = parseFloat(window.getComputedStyle(document.documentElement).fontSize);
  const px = (name) => { const v = css.getPropertyValue(name).trim(); return parseFloat(v) * (v.endsWith('rem') ? rootPx : 1); };
  const size = { t: px('--cap-title'), s: px('--cap-sub'), edge: px('--cap-edge'), gap: px('--cap-gap'), line: px('--cap-line'), dot: px('--cap-dot'), halo: px('--cap-halo') };
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
  const place = (sp, top) => {
    const shown = svg.getBoundingClientRect().width;
    if (!shown) return null;   // not laid out (hidden, or mid-swap): the next step or resize places it
    const k = vb.width / shown;   // drawing units per screen px
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
    return { k, x, ty, tf, tw: sp.t.getComputedTextLength(), sw: sp.s.getComputedTextLength() };
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
    restart(sp.lead, 'is-draw');
    restart(sp.end, 'is-in');
    restart(sp.ring, 'is-in');
  };
  const write = {
    cloud: () => {
      const sp = spots.cloud, app = APPS[at.cloud];
      sp.t.textContent = 'Cloud workspace';
      const name = document.createElementNS(SVG_NS, 'tspan');
      name.setAttribute('class', 'ob-cap-app');
      name.textContent = app.name;
      sp.s.replaceChildren(name, ' · ' + app.detail);
      const L = place(sp, true);
      if (!L) return;
      const x0 = L.x + L.tw + size.gap * 2 * L.k, y0 = L.ty - L.tf * 0.32;   // a level tail from the title, then to the cloud
      draw(sp, `M${x0.toFixed(1)},${y0.toFixed(1)} H${cloudX - 50} L${cloudX},${cloudY}`, window.getComputedStyle(sp.t).fill, cloudX, cloudY, L.k);
      svg.querySelectorAll('.ob-tile').forEach((t) => t.classList.toggle('is-on', t.dataset.tile === app.id));
    },
    office: () => {
      const sp = spots.office, it = items[at.office];
      sp.t.textContent = it.t;
      sp.t.setAttribute('fill', it.c);
      sp.s.textContent = it.s;
      const L = place(sp, false);
      if (!L) return;
      const top = L.ty - L.tf * 0.76 - size.gap * 2 * L.k;   // the line rises from just above the words to the item
      const x0 = Math.min(Math.max(it.x, L.x + size.gap * L.k), L.x + Math.max(L.tw, L.sw) - size.gap * L.k);
      draw(sp, `M${x0.toFixed(1)},${top.toFixed(1)} L${it.x},${it.y}`, it.c, it.x, it.y, L.k);
    }
  };
  let swap = 0;
  const step = (name, animate) => {
    at[name] = (at[name] + 1) % (name === 'cloud' ? APPS.length : items.length);
    const sp = spots[name];
    if (!animate || reduceMotion.matches) { write[name](); return; }
    sp.g.classList.add('is-out');
    swap = window.setTimeout(() => {
      sp.g.classList.add('is-pre');
      sp.g.classList.remove('is-out');
      write[name]();
      void sp.g.getBoundingClientRect();
      sp.g.classList.remove('is-pre');
    }, 170);
  };
  let timer = 0, turn = 0, onScreen = true, begun = false;
  const stop = () => { window.clearInterval(timer); timer = 0; };
  const start = () => {
    stop();
    if (!begun || reduceMotion.matches || document.hidden || !onScreen) return;
    timer = window.setInterval(() => step(turn++ % 2 ? 'office' : 'cloud', true), 2200);
  };
  const tap = () => { if (!begun) return; step('office', true); turn = 0; start(); };
  svg.addEventListener('click', tap);
  const relayout = () => { if (begun) { write.cloud(); write.office(); } };
  window.addEventListener('resize', relayout);
  const onVisible = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVisible);
  reduceMotion.addEventListener('change', start);
  const seen = whenOnScreen(svg, (on) => { onScreen = on; if (on) start(); else stop(); });
  // first words once the drawing has built (about 3.2s; at once with reduced motion), the office's 1.1s after
  const quick = reduceMotion.matches;
  const first = window.setTimeout(() => {
    begun = true;
    step('cloud', !quick);
    swap = window.setTimeout(() => { step('office', !quick); start(); }, quick ? 0 : 1100);
  }, quick ? 0 : 3300);
  return () => {   // the cut is swapped out: let go of the timers and listeners
    stop();
    window.clearTimeout(first);
    window.clearTimeout(swap);
    svg.removeEventListener('click', tap);
    window.removeEventListener('resize', relayout);
    document.removeEventListener('visibilitychange', onVisible);
    reduceMotion.removeEventListener('change', start);
    if (seen) seen.disconnect();
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
    clear();
    if (!cut) return;
    Promise.all(files[cut].map((url) => window.fetch(url).then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))))
      .then((texts) => {
        if (cut !== shown) return;   // the screen changed while it loaded
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
   Services on phones: light the dot for the card in the middle (Home).
   The row swipes and snaps with no script; browsers without
   scroll-driven animation also get the middle card marked (services.css).
   A tap on a side card brings it to the middle; a tap on the middle card
   opens it. "Swipe" fades once they have left the first card.
   ====================================================================== */
const svcRow = $('.svc-menu');
const svcDots = $$('.svc-dots i');
const svcHint = $('.svc-hint');
if (svcRow && svcDots.length) {
  const phone = window.matchMedia('(max-width: 699px)');
  let queued = false;
  const mark = () => {
    queued = false;
    if (!phone.matches) return;
    const cards = Array.from(svcRow.children);
    const mid = svcRow.scrollLeft + svcRow.clientWidth / 2;
    let best = 0, gap = Infinity;
    cards.forEach((li, i) => {
      const d = Math.abs(li.offsetLeft + li.offsetWidth / 2 - mid);
      if (d < gap) { gap = d; best = i; }
    });
    cards.forEach((li, i) => li.classList.toggle('is-centre', i === best));
    svcDots.forEach((dot, i) => dot.classList.toggle('on', i === best));
    if (best > 0) svcHint?.classList.add('is-swiped');
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(mark); } };
  svcRow.addEventListener('scroll', queue, { passive: true });
  // detail is 0 for Enter on a focused card, which focus has already scrolled to the middle
  svcRow.addEventListener('click', (e) => {
    const li = e.target.closest('.svc-menu > li');
    if (!phone.matches || !li || e.detail === 0) return;
    mark();
    if (li.classList.contains('is-centre')) return;
    e.preventDefault();
    li.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduceMotion.matches ? 'instant' : 'smooth' });
  });
  phone.addEventListener('change', queue);
  queue();
}
