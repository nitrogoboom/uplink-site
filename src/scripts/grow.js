/* ==========================================================================
   Uplink Technology · Home · We grow with you (Grow.astro)
   One business grows in six steps. A step's new parts drop in and glow (earlier ones stay), its risks show as red tags
   and then flip to green fixes as its card goes from "Watch for" to "We handle". It plays once, from bare ground,
   when the section comes on screen; the arrows and dots step through it by hand; the play button pauses, plays and
   replays, and its edge times the whole story. The camera starts close on the office and pulls back as the world
   grows. Reduced motion: the finished world, no movement; the controls still step through.
   Two sets of step buttons do the same job: the dots under the picture (phones, tablets) and the list in the left
   column (desktop, .grow-item); CSS shows one. While the story plays, the open row's foot fills over the step's time.
   The site-wide pause (HoldButton.astro, core.js held) pauses it the same way as its own button, and lets it go on
   when released; while held it doesn't start on its own. Its own play button still plays it.
   Builds no HTML: everything is in the page (Grow.astro); this only sets classes, attributes and text.
   ========================================================================== */

import { $, $$, held, reduceMotion, whenOnScreen } from './core.js';

const DWELL = 4500;    // ms a step
const RISK_AT = 900;   // ms into a step: its risks show (the parts have dropped in by then)
const FIX_AT = 2300;   // ms into a step: the risks flip to fixes
const GLOW = 3400;     // ms the new parts glow
const COUNT = 300;     // ms the team counter takes to climb to a new step's size (short: the desktop list shows it at once)
const PAUSE = 'M2 1h3v10H2zM7 1h3v10H7z', PLAY = 'M2 1l9 5-9 5z', REPLAY = 'M6 1a5 5 0 1 0 5 5h-2a3 3 0 1 1-3-3v2l3-3-3-3z';
const C30 = Math.cos(Math.PI / 6);

const section = $('#grow');
const grow = section && $('.grow', section);
const svg = grow && $('.grow-stage svg', grow);
if (grow && svg) {
  const stage = $('.grow-stage', grow);
  const steps = $$('.grow-card', grow);
  const N = steps.length, LAST = N - 1;
  const pcs = $$('.pc', svg).map((g) => ({ g, s: Number(g.dataset.s) - 1, o: Number(g.dataset.o) }));
  const tags = $$('.grow-tag', grow).map((el) => ({ el, step: Number(el.dataset.step), k: Number(el.dataset.k), at: $(`.tg-a[data-a="${el.dataset.at}"]`, svg), icon: $('.grow-tag-i', el), text: $('.grow-tag-t', el) }));
  const dots = $$('.grow-dot', grow), items = $$('.grow-item', grow);
  const [prev, next] = $$('.grow-step-btn', grow);
  const play = $('.grow-play', grow), playIcon = $('.grow-play-i path', grow), ring = $('.grow-ring circle', grow);
  const place = $('.grow-place', grow), team = $('.grow-team', grow);
  const teams = steps.map((c) => Number(c.dataset.team) || 0);
  const places = steps.map((c) => c.dataset.place);
  const full = svg.getAttribute('viewBox').split(' ').map(Number);
  let built = -1, cur = -1, playing = false, started = false, visible = false, timer = 0, glowT = 0, beats = [];

  // ---- tags: placed on the drawing's anchors, kept inside the picture, and never on top of each other: when a
  // step's two tags would overlap (a close camera brings anchors together), the upper one moves up clear of the
  // lower one, or, with no room above, the lower one moves down ----
  const placeTags = () => {
    const m = svg.getScreenCTM(); if (!m) return;
    const r = stage.getBoundingClientRect(), pad = 6, gap = 4;
    const top = Math.max(pad, ...[place, team].map((l) => (l.offsetHeight ? l.offsetTop + l.offsetHeight + gap : 0)));   // below the place and team count
    const spots = tags.map((t) => {
      if (!t.at) return null;
      const p = new DOMPoint(Number(t.at.getAttribute('cx')), Number(t.at.getAttribute('cy'))).matrixTransform(m);
      const w = t.el.offsetWidth, h = t.el.offsetHeight;
      return { t, w, h, x: Math.min(r.width - w / 2 - pad, Math.max(w / 2 + pad, p.x - r.left)), y: Math.max(h + top, p.y - r.top - 3) };
    });
    for (let s = 0; s < steps.length; s++) {
      const pair = spots.filter((q) => q && q.t.step === s).sort((a, b) => b.y - a.y);   // lower one first
      for (let k = 1; k < pair.length; k++) {
        const lo = pair[k - 1], hi = pair[k];
        const across = Math.abs(lo.x - hi.x) < (lo.w + hi.w) / 2 + gap, down = lo.y - hi.y < hi.h + gap;
        if (!across || !down) continue;
        const up = lo.y - lo.h - gap;            // the upper tag's bottom edge, just above the lower tag
        if (up >= hi.h + top) hi.y = up; else lo.y = hi.y + lo.h + gap;
      }
    }
    spots.forEach((q) => { if (q) { q.t.el.style.left = `${q.x}px`; q.t.el.style.top = `${q.y}px`; } });
  };

  // ---- the camera: close on what's built, pulling back as the world grows ----
  let vb = full.slice(), camRaf = 0;
  const target = (i) => {
    if (i < 0) return full;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    pcs.forEach(({ g, s }) => { if (s > i) return; const b = g.getBBox(); x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height); });
    if (!Number.isFinite(x0)) return full;
    const side = Math.min(full[2], Math.max(full[2] * 0.6, (x1 - x0) * 1.45, (y1 - y0) * 1.45));
    const x = Math.max(full[0], Math.min(full[0] + full[2] - side, (x0 + x1) / 2 - side / 2));
    const y = Math.max(full[1], Math.min(full[1] + full[3] - side, (y0 + y1) / 2 - side / 2));
    return [x, y, side, side];
  };
  const camTo = (to, animate) => {
    window.cancelAnimationFrame(camRaf);
    const from = vb.slice(), t0 = performance.now(), dur = animate && !reduceMotion.matches ? 1400 : 0;
    const step = (now) => {
      const k = dur ? Math.min(1, (now - t0) / dur) : 1, e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      vb = from.map((v, n) => v + (to[n] - v) * e);
      svg.setAttribute('viewBox', vb.map((v) => v.toFixed(1)).join(' '));
      placeTags();
      if (k < 1) camRaf = window.requestAnimationFrame(step);
    };
    camRaf = window.requestAnimationFrame(step);
  };

  // ---- the team counter: the step's size. The desktop list shows every step's size all along, so the counter
  // mustn't stay on another number: it climbs, briefly, only when the story reaches a step for the first time since
  // bare ground, from the number it shows; going back, to a step already reached, paused, or with reduced motion, it
  // changes at once, with the list. ----
  let teamNow = 0, teamRaf = 0, reached = -1;
  const setTeam = (v) => { teamNow = v; team.textContent = v ? `Team of ${v}` : ''; };
  const count = (i, animate) => {
    window.cancelAnimationFrame(teamRaf);
    const n = i < 0 ? 0 : teams[i], a = teamNow, climb = animate && i > reached && n > a && !reduceMotion.matches;
    reached = i < 0 ? -1 : Math.max(reached, i);
    if (!climb) { setTeam(n); return; }
    const t0 = performance.now();
    const f = (now) => {
      const k = Math.min(1, Math.max(0, (now - t0) / COUNT));
      setTeam(Math.round(a + (n - a) * k));
      if (k < 1) teamRaf = window.requestAnimationFrame(f);
    };
    teamRaf = window.requestAnimationFrame(f);
  };

  // ---- the timer on the play button's edge: 0 (nothing) to 1 (all six steps), run from the clock ----
  let ringRun = null, ringAt = 0, ringRaf = 0;
  const RING = 311.02;   // the play ring's length in its own units (2π × 49.5, as its stroke-dasharray in grow.css)
  const drawRing = (k) => { ring.style.strokeDashoffset = String(RING * (1 - Math.min(1, Math.max(0, k)))); };
  const ringNow = () => (ringRun ? ringRun.a + (ringRun.b - ringRun.a) * Math.min(1, (performance.now() - ringRun.t0) / DWELL) : ringAt);
  const ringTick = () => { ringRaf = 0; if (!ringRun) return; ringAt = ringNow(); drawRing(ringAt); ringRaf = window.requestAnimationFrame(ringTick); };   // runs only while a step plays
  const ringGo = () => { if (!ringRaf) ringRaf = window.requestAnimationFrame(ringTick); };

  // ---- a step's beats: 'risk' (red tags, card on Watch for) or 'fix' (green tags, card on We handle) ----
  const beat = (b, animate) => {
    if (built >= 0) steps[built].dataset.beat = b;
    tags.forEach((t) => {
      const on = t.step === built;
      t.el.classList.toggle('is-on', on);
      if (!on) return;
      const fixed = b === 'fix';
      t.el.classList.toggle('is-fixed', fixed);
      t.icon.textContent = fixed ? '✓' : '!';
      t.text.textContent = fixed ? t.el.dataset.fix : t.el.dataset.risk;
      t.el.style.transitionDelay = animate ? `${t.k * 180}ms` : '0ms';
      if (animate && fixed) { t.el.classList.add('is-flip'); window.setTimeout(() => t.el.classList.remove('is-flip'), 260 + t.k * 180); }
    });
    placeTags();
  };

  // ---- grow (or shrink) the world to step i (-1 = bare ground) ----
  const show = (i, animate, timed) => {
    const from = built;
    built = i;
    window.clearTimeout(glowT);
    pcs.forEach(({ g }) => g.classList.remove('glow'));
    const fresh = pcs.filter((p) => p.s <= i && (p.s > from || (animate && p.s === i && from === i)));
    fresh.forEach(({ g }) => g.classList.add('pre', 'hide'));
    void svg.getBoundingClientRect();   // commit the start of the drop before it begins
    pcs.forEach(({ g, s, o }) => {
      const isNew = fresh.some((p) => p.g === g);
      // not animating (first draw, pause, reduced motion): parts appear or go at once, never a flash of the end
      if (animate) g.classList.remove('pre'); else g.classList.add('pre');
      g.style.transitionDelay = animate && isNew ? `${120 + (s - Math.max(from + 1, 0)) * 500 + o * 140}ms` : '0ms';
      g.classList.toggle('hide', s > i);
      if (animate && isNew) g.classList.add('glow');
    });
    if (!animate) { void svg.getBoundingClientRect(); pcs.forEach(({ g }) => g.classList.remove('pre')); }
    if (animate) glowT = window.setTimeout(() => pcs.forEach(({ g }) => g.classList.remove('glow')), GLOW);
    camTo(target(i), animate);
    count(i, animate);
    tags.forEach((t) => t.el.classList.remove('is-on', 'is-fixed', 'is-flip'));
    steps.forEach((c, k) => { c.classList.toggle('is-on', k === Math.max(0, i)); c.removeAttribute('data-beat'); });
    place.textContent = i < 0 ? '' : places[i];
    if (i >= 0) { if (animate) steps[i].dataset.beat = 'build'; else beat('fix', false); }
    [dots, items].forEach((set) => set.forEach((d, j) => { d.setAttribute('aria-pressed', String(j === i)); d.classList.toggle('is-done', j < i); }));
    items.forEach((d) => d.classList.remove('is-timing'));
    if (timed && i >= 0 && items[i]) { void items[i].offsetWidth; items[i].classList.add('is-timing'); }   // the bar starts over
    prev.disabled = i <= 0; next.disabled = i >= LAST;
    if (timed && i >= 0) { ringRun = { a: i / N, b: (i + 1) / N, t0: performance.now() }; ringGo(); }
    else { const k = !animate && i === from ? ringNow() : i < 0 ? 0 : (i + 1) / N; ringRun = null; ringAt = k; drawRing(k); }
  };

  // ---- playing ----
  const icon = () => {
    const end = cur >= LAST;
    playIcon.setAttribute('d', playing ? PAUSE : end ? REPLAY : PLAY);
    play.setAttribute('aria-label', playing ? 'Pause' : end ? 'Play again' : 'Play');
    stage.classList.toggle('is-paused', !playing && !end && started);
  };
  const go = (i, animate) => {
    cur = i;
    beats.forEach(window.clearTimeout); beats = [];
    const motion = animate && !reduceMotion.matches;
    show(i, motion, playing);
    if (motion && i >= 0) {
      beats.push(window.setTimeout(() => beat('risk', true), RISK_AT));
      beats.push(window.setTimeout(() => beat('fix', true), FIX_AT));
    }
  };
  const stop = () => { playing = false; window.clearTimeout(timer); icon(); };
  const tick = () => {
    window.clearTimeout(timer);
    if (!playing || !visible) return;
    timer = window.setTimeout(() => {
      if (cur >= LAST) { stop(); return; }
      go(cur + 1, true); tick();
    }, cur < 0 ? 0 : DWELL);
  };
  const start = () => { started = true; playing = true; if (cur >= LAST) go(-1, false); icon(); tick(); };
  const jump = (i) => { stop(); started = true; go(Math.max(0, Math.min(LAST, i)), true); icon(); };

  [dots, items].forEach((set) => set.forEach((d, i) => d.addEventListener('click', () => jump(i))));
  prev.addEventListener('click', () => jump(cur - 1));
  next.addEventListener('click', () => jump(cur + 1));
  const pause = () => { stop(); beats.forEach(window.clearTimeout); beats = []; show(cur, false, false); icon(); };
  play.addEventListener('click', () => { if (playing) pause(); else start(); });

  grow.style.setProperty('--grow-dwell', `${DWELL}ms`);   // the list row's timing bar runs one step
  grow.classList.add('is-live');
  if (reduceMotion.matches) { started = true; go(LAST, false); } else go(-1, false);
  icon();
  window.requestAnimationFrame(placeTags);
  if (document.fonts) document.fonts.ready.then(placeTags);
  window.addEventListener('resize', placeTags);
  // ---- the dome's horizontal rings turn: a band of light runs round each (bright near side, faint far side) ----
  // Their frame loop runs only while the section is on screen and not paused.
  const orbits = $$('.dome-orbit', svg).map((g) => {
    const R = Number(g.dataset.r), u = Number(g.dataset.u), ox = Number(g.dataset.ox), oy = Number(g.dataset.oy);
    const NS = 'http://www.w3.org/2000/svg', TAIL = 1.6, PIECES = 14;
    const P = (x, y, z) => `${(ox + (x - y) * C30 * u).toFixed(1)},${(oy + ((x + y) * u) / 2 - z * u).toFixed(1)}`;
    const rings = g.dataset.lat.split(',').map(Number).map((k, n) => {
      const h = R * k, r = Math.sqrt(R * R - h * h);
      const pieces = Array.from({ length: PIECES }, () => { const p = document.createElementNS(NS, 'path'); g.append(p); return p; });
      return { h, r, pieces, period: n ? 11000 : 8000, phase: n * 2.4 };
    });
    const draw = (t) => rings.forEach((ringR) => {
      const head = ringR.phase + (t / ringR.period) * Math.PI * 2;
      ringR.pieces.forEach((p, i) => {
        const a1 = head - (TAIL * i) / PIECES, a0 = a1 - TAIL / PIECES, mid = (a0 + a1) / 2;
        const near = Math.cos(mid) + Math.sin(mid) > 0, fade = 1 - i / PIECES;
        let d = '';
        for (let k = 0; k <= 4; k++) { const a = a0 + ((a1 - a0) * k) / 4; d += (k ? 'L' : 'M') + P(ringR.r * Math.cos(a), ringR.r * Math.sin(a), ringR.h); }
        p.setAttribute('d', d);
        p.setAttribute('stroke-width', ((near ? 2.6 : 1.6) * (0.5 + fade / 2)).toFixed(2));
        p.setAttribute('stroke-opacity', ((near ? 0.95 : 0.35) * fade).toFixed(2));
      });
    });
    let t = 0, last = 0, raf = 0;
    const orbit = (now) => {
      const dt = last ? Math.min(64, now - last) : 0; last = now;
      t += dt; draw(t);
      raf = window.requestAnimationFrame(orbit);
    };
    draw(1500);
    return (run) => {
      if (run && !raf && !reduceMotion.matches) { last = 0; raf = window.requestAnimationFrame(orbit); }
      if (!run && raf) { window.cancelAnimationFrame(raf); raf = 0; }
    };
  });
  const orbitsRun = () => orbits.forEach((o) => o(visible && !stage.classList.contains('is-paused') && !(held.on && !playing)));
  play.addEventListener('click', orbitsRun);

  // starts as the section's first pixel arrives, so it's already moving when you see it; off screen it waits
  whenOnScreen(section, (on) => {
    visible = on;
    if (on && !started && !reduceMotion.matches && !held.on) start(); else if (on && playing) tick(); else window.clearTimeout(timer);
    orbitsRun();
  });

  // the site-wide pause: hold it where it is; on release, go on only if the hold is what stopped it
  let heldStopped = false;
  held.ev.addEventListener('change', () => {
    if (held.on && playing) { heldStopped = true; pause(); }
    else if (!held.on && (heldStopped || (!started && visible)) && !reduceMotion.matches) { heldStopped = false; start(); }
    orbitsRun();
  });
}
