/* ==========================================================================
   Uplink Technology · Home · We grow with you (Grow.astro): plays the six-step world (src/README.md, "Scripts").
   A step's new parts drop in and glow (earlier ones stay), its risks show as red tags and then flip to green fixes as
   its card goes from "Watch for" to "We handle". It plays once, from bare ground, when the section comes on screen;
   the arrows and dots step through it by hand; the play button pauses, plays and replays, and its edge times the
   whole story. The camera starts close on the office and pulls back as the world grows. Reduced motion: the finished
   world, no movement; the controls still step through. Once the story ends it stands still (its loops and the dome's
   orbits too) until you play it again. Builds no HTML: this only sets classes, attributes and text.
   ========================================================================== */

import { $, $$, held, reduceMotion, whenOnScreen } from './core.js';

const DWELL = 4500; // ms a step
const RISK_AT = 900; // ms into a step: its risks show (the parts have dropped in by then)
const FIX_AT = 2300; // ms into a step: the risks flip to fixes
const GLOW = 3400; // ms the new parts glow
const COUNT = 300; // ms the team counter takes to climb to a new step's size (short: the desktop list shows it at once)
const PAUSE = 'M2 1h3v10H2zM7 1h3v10H7z',
  PLAY = 'M2 1l9 5-9 5z',
  REPLAY = 'M6 1a5 5 0 1 0 5 5h-2a3 3 0 1 1-3-3v2l3-3-3-3z';
const C30 = Math.cos(Math.PI / 6);

const section = $('#grow');
const grow = section && $('.grow', section);
/** @type {SVGSVGElement | null} */
const svg = grow && $('.grow-stage svg', grow);
if (grow && svg) {
  // the section's parts are all in Grow.astro and its drawing (tools/gen_grow.py)
  const stage = /** @type {HTMLElement} */ ($('.grow-stage', grow));
  const steps = $$('.grow-card', grow);
  const N = steps.length,
    LAST = N - 1;
  const pcs = /** @type {SVGGElement[]} */ ($$('.pc', svg)).map((g) => ({
    g,
    s: Number(g.dataset.s) - 1,
    o: Number(g.dataset.o),
  }));
  const tags = $$('.grow-tag', grow).map((el) => ({
    el,
    step: Number(el.dataset.step),
    k: Number(el.dataset.k),
    at: $(`.tg-a[data-a="${el.dataset.at}"]`, svg),
    icon: /** @type {HTMLElement} */ ($('.grow-tag-i', el)),
    text: /** @type {HTMLElement} */ ($('.grow-tag-t', el)),
  }));
  const dots = $$('.grow-dot', grow),
    items = $$('.grow-item', grow);
  const [prev, next] = $$('.grow-step-btn', grow);
  const play = /** @type {HTMLElement} */ ($('.grow-play', grow)),
    playIcon = /** @type {SVGPathElement} */ ($('.grow-play-i path', grow)),
    ring = /** @type {SVGCircleElement} */ ($('.grow-ring circle', grow));
  const place = /** @type {HTMLElement} */ ($('.grow-place', grow)),
    team = /** @type {HTMLElement} */ ($('.grow-team', grow));
  const teams = steps.map((c) => Number(c.dataset.team) || 0);
  const places = steps.map((c) => c.dataset.place);
  const full = /** @type {string} */ (svg.getAttribute('viewBox')).split(' ').map(Number);
  let built = -1,
    cur = -1,
    playing = false,
    started = false,
    visible = false,
    timer = 0,
    glowT = 0;
  /** @type {number[]} */
  let beats = [];

  // ---- tags: placed on the drawing's anchors, kept inside the picture, and never on top of each other: when a
  // step's two tags would overlap (a close camera brings anchors together), the upper one moves up clear of the
  // lower one, or, with no room above, the lower one moves down ----
  const placeTags = () => {
    const m = svg.getScreenCTM();
    if (!m) return;
    const r = stage.getBoundingClientRect(),
      pad = 6,
      gap = 4;
    const top = Math.max(pad, ...[place, team].map((l) => (l.offsetHeight ? l.offsetTop + l.offsetHeight + gap : 0))); // below the place and team count
    const spots = tags.map((t) => {
      if (!t.at) return null;
      const p = new DOMPoint(Number(t.at.getAttribute('cx')), Number(t.at.getAttribute('cy'))).matrixTransform(m);
      const w = t.el.offsetWidth,
        h = t.el.offsetHeight;
      return {
        t,
        w,
        h,
        x: Math.min(r.width - w / 2 - pad, Math.max(w / 2 + pad, p.x - r.left)),
        y: Math.max(h + top, p.y - r.top - 3),
      };
    });
    for (let s = 0; s < steps.length; s++) {
      const pair = /** @type {NonNullable<typeof spots[number]>[]} */ (spots.filter((q) => q && q.t.step === s)).sort(
        (a, b) => b.y - a.y,
      ); // lower one first
      for (let k = 1; k < pair.length; k++) {
        const lo = pair[k - 1],
          hi = pair[k];
        const across = Math.abs(lo.x - hi.x) < (lo.w + hi.w) / 2 + gap,
          down = lo.y - hi.y < hi.h + gap;
        if (!across || !down) continue;
        const up = lo.y - lo.h - gap; // the upper tag's bottom edge, just above the lower tag
        if (up >= hi.h + top) hi.y = up;
        else lo.y = hi.y + lo.h + gap;
      }
    }
    spots.forEach((q) => {
      if (q) {
        q.t.el.style.left = `${q.x}px`;
        q.t.el.style.top = `${q.y}px`;
      }
    });
  };

  // ---- the camera: close on what's built, pulling back as the world grows ----
  let vb = full.slice(),
    camRaf = 0;
  const target = (/** @type {number} */ i) => {
    if (i < 0) return full;
    let x0 = Infinity,
      y0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity;
    pcs.forEach(({ g, s }) => {
      if (s > i) return;
      const b = g.getBBox();
      x0 = Math.min(x0, b.x);
      y0 = Math.min(y0, b.y);
      x1 = Math.max(x1, b.x + b.width);
      y1 = Math.max(y1, b.y + b.height);
    });
    if (!Number.isFinite(x0)) return full;
    const side = Math.min(full[2], Math.max(full[2] * 0.6, (x1 - x0) * 1.45, (y1 - y0) * 1.45));
    const x = Math.max(full[0], Math.min(full[0] + full[2] - side, (x0 + x1) / 2 - side / 2));
    const y = Math.max(full[1], Math.min(full[1] + full[3] - side, (y0 + y1) / 2 - side / 2));
    return [x, y, side, side];
  };
  const camTo = (/** @type {number[]} */ to, /** @type {boolean} */ animate) => {
    window.cancelAnimationFrame(camRaf);
    const from = vb.slice(),
      t0 = performance.now(),
      dur = animate && !reduceMotion.matches ? 1400 : 0;
    const step = (/** @type {number} */ now) => {
      const k = dur ? Math.min(1, (now - t0) / dur) : 1,
        e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
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
  let teamNow = 0,
    teamRaf = 0,
    reached = -1;
  const setTeam = (/** @type {number} */ v) => {
    teamNow = v;
    team.textContent = v ? `Team of ${v}` : '';
  };
  const count = (/** @type {number} */ i, /** @type {boolean} */ animate) => {
    window.cancelAnimationFrame(teamRaf);
    const n = i < 0 ? 0 : teams[i],
      a = teamNow,
      climb = animate && i > reached && n > a && !reduceMotion.matches;
    reached = i < 0 ? -1 : Math.max(reached, i);
    if (!climb) {
      setTeam(n);
      return;
    }
    const t0 = performance.now();
    const f = (/** @type {number} */ now) => {
      const k = Math.min(1, Math.max(0, (now - t0) / COUNT));
      setTeam(Math.round(a + (n - a) * k));
      if (k < 1) teamRaf = window.requestAnimationFrame(f);
    };
    teamRaf = window.requestAnimationFrame(f);
  };

  // ---- the open step's clock: how long it has played. It holds while the story waits (paused, off screen, the
  // site's pause), so the step goes on from there, not from the start. A step picked by hand shows done (DWELL). ----
  let playedAt = 0,
    runSince = 0; // ms of the step already played; when it last set off (0: holding)
  const played = () => playedAt + (runSince ? performance.now() - runSince : 0);
  const hold = () => {
    playedAt = played();
    runSince = 0;
  };

  // ---- the timer on the play button's edge: 0 (nothing) to 1 (all six steps), read from the clock. Its frame
  // loop runs only while a step plays: it stops at the step's end, on a pause and off screen ----
  let ringRaf = 0;
  const RING = 311.02; // the play ring's length in its own units (2π × 49.5, as its stroke-dasharray in grow.css)
  const drawRing = (/** @type {number} */ k) => {
    ring.style.strokeDashoffset = String(RING * (1 - Math.min(1, Math.max(0, k))));
  };
  const ringAt = () => (cur < 0 ? 0 : (cur + Math.min(1, played() / DWELL)) / N);
  const ringTick = () => {
    drawRing(ringAt());
    ringRaf = runSince && played() < DWELL ? window.requestAnimationFrame(ringTick) : 0;
  };
  const ringGo = () => {
    if (!ringRaf) ringRaf = window.requestAnimationFrame(ringTick);
  };
  const ringStop = () => {
    window.cancelAnimationFrame(ringRaf);
    ringRaf = 0;
    drawRing(ringAt());
  };

  // ---- the open row's foot (desktop list), from the same clock: it fills while the step plays, waits where it is
  // while the step does, and goes once the step is done or was picked by hand ----
  const bar = () => {
    const k = played(),
      d = cur >= 0 ? items[cur] : null,
      on = !!d && k < DWELL && (k > 0 || runSince > 0);
    items.forEach((x) => {
      if (x !== d || !on) x.classList.remove('is-timing', 'is-waiting');
    });
    if (!on) return;
    d.style.setProperty('--grow-at', `${-Math.round(k)}ms`);
    d.classList.remove('is-timing');
    void d.offsetWidth;
    d.classList.add('is-timing'); // from where the clock is
    d.classList.toggle('is-waiting', !runSince);
  };

  // ---- a step's beats: 'risk' (red tags, card on Watch for) or 'fix' (green tags, card on We handle) ----
  const beat = (/** @type {'risk' | 'fix'} */ b, /** @type {boolean} */ animate) => {
    if (built >= 0) steps[built].dataset.beat = b;
    tags.forEach((t) => {
      const on = t.step === built;
      t.el.classList.toggle('is-on', on);
      if (!on) return;
      const fixed = b === 'fix';
      t.el.classList.toggle('is-fixed', fixed);
      t.icon.textContent = fixed ? '✓' : '!';
      t.text.textContent = /** @type {string} */ (fixed ? t.el.dataset.fix : t.el.dataset.risk);
      t.el.style.transitionDelay = animate ? `${t.k * 180}ms` : '0ms';
      if (animate && fixed) {
        t.el.classList.add('is-flip');
        window.setTimeout(() => t.el.classList.remove('is-flip'), 260 + t.k * 180);
      }
    });
    placeTags();
  };

  // ---- grow (or shrink) the world to step i (-1 = bare ground) ----
  const show = (/** @type {number} */ i, /** @type {boolean} */ animate, /** @type {boolean} */ timed) => {
    const from = built;
    built = i;
    window.clearTimeout(glowT);
    pcs.forEach(({ g }) => g.classList.remove('glow'));
    const fresh = pcs.filter((p) => p.s <= i && (p.s > from || (animate && p.s === i && from === i)));
    fresh.forEach(({ g }) => g.classList.add('pre', 'hide'));
    void svg.getBoundingClientRect(); // commit the start of the drop before it begins
    pcs.forEach(({ g, s, o }) => {
      const isNew = fresh.some((p) => p.g === g);
      // not animating (first draw, pause, reduced motion): parts appear or go at once, never a flash of the end
      if (animate) g.classList.remove('pre');
      else g.classList.add('pre');
      g.style.transitionDelay = animate && isNew ? `${120 + (s - Math.max(from + 1, 0)) * 500 + o * 140}ms` : '0ms';
      g.classList.toggle('hide', s > i);
      if (animate && isNew) g.classList.add('glow');
    });
    if (!animate) {
      void svg.getBoundingClientRect();
      pcs.forEach(({ g }) => g.classList.remove('pre'));
    }
    if (animate) glowT = window.setTimeout(() => pcs.forEach(({ g }) => g.classList.remove('glow')), GLOW);
    camTo(target(i), animate);
    count(i, animate);
    tags.forEach((t) => t.el.classList.remove('is-on', 'is-fixed', 'is-flip'));
    steps.forEach((c, k) => {
      c.classList.toggle('is-on', k === Math.max(0, i));
      c.removeAttribute('data-beat');
    });
    place.textContent = i < 0 ? '' : /** @type {string} */ (places[i]);
    if (i >= 0) {
      if (animate) steps[i].dataset.beat = 'build';
      else beat('fix', false);
    }
    // Two sets of step buttons do the same job: the dots under the picture (phones, tablets) and the list in the left
    // column (desktop, .grow-item); CSS shows one. They're marked aria-current="step" (one of a set is the open one,
    // not a pressed toggle). At the ends the arrows are aria-disabled, not disabled, so a keyboard user's focus stays.
    // While the story plays, the open row's foot fills over the step's time.
    [dots, items].forEach((set) =>
      set.forEach((d, j) => {
        if (j === i) d.setAttribute('aria-current', 'step');
        else d.removeAttribute('aria-current');
        d.classList.toggle('is-done', j < i);
      }),
    );
    prev.setAttribute('aria-disabled', String(i <= 0));
    next.setAttribute('aria-disabled', String(i >= LAST));
    // the clock: a step the story plays starts at 0 (tick sets it going); one picked by hand shows done; a pause
    // (the same step, shown at once) keeps what it played
    if (timed) {
      playedAt = 0;
      runSince = 0;
    } else if (i !== from || animate) {
      playedAt = i < 0 ? 0 : DWELL;
      runSince = 0;
    }
    ringStop();
    bar();
  };

  // ---- playing ----
  const icon = () => {
    const end = cur >= LAST;
    playIcon.setAttribute('d', playing ? PAUSE : end ? REPLAY : PLAY);
    play.setAttribute('aria-label', playing ? 'Pause' : end ? 'Play again' : 'Play');
    stage.classList.toggle('is-paused', !playing && started); // paused, and at the end: nothing loops
  };
  const go = (/** @type {number} */ i, /** @type {boolean} */ animate) => {
    cur = i;
    beats.forEach((b) => window.clearTimeout(b));
    beats = [];
    const motion = animate && !reduceMotion.matches;
    show(i, motion, playing);
    if (motion && i >= 0) {
      beats.push(window.setTimeout(() => beat('risk', true), RISK_AT));
      beats.push(window.setTimeout(() => beat('fix', true), FIX_AT));
    }
  };
  const stop = () => {
    playing = false;
    window.clearTimeout(timer);
    hold();
    ringStop();
    bar();
    icon();
  };
  // the step plays on for what's left of it, while the story plays and is on screen; otherwise its clock holds
  const tick = () => {
    window.clearTimeout(timer);
    if (!playing || !visible) {
      hold();
      ringStop();
      bar();
      return;
    }
    if (!runSince) runSince = performance.now();
    timer = window.setTimeout(
      () => {
        if (cur >= LAST) {
          stop();
          orbitsRun();
          return;
        } // the end: it stands still
        go(cur + 1, true);
        tick();
      },
      cur < 0 ? 0 : Math.max(0, DWELL - played()),
    );
    ringGo();
    bar();
  };
  const start = () => {
    started = true;
    playing = true;
    if (cur >= LAST) go(-1, false);
    icon();
    tick();
  };
  const jump = (/** @type {number} */ i) => {
    stop();
    started = true;
    go(Math.max(0, Math.min(LAST, i)), true);
    icon();
  };

  // your own choice wins over the site's pause: once you've played, paused or picked a step, releasing the site's
  // pause leaves Grow as you left it
  let heldStopped = false;
  [dots, items].forEach((set) =>
    set.forEach((d, i) =>
      d.addEventListener('click', () => {
        heldStopped = false;
        jump(i);
      }),
    ),
  );
  [prev, next].forEach((b, n) =>
    b.addEventListener('click', () => {
      if (b.getAttribute('aria-disabled') !== 'true') {
        heldStopped = false;
        jump(cur + (n ? 1 : -1));
      }
    }),
  );
  const pause = () => {
    stop();
    beats.forEach((b) => window.clearTimeout(b));
    beats = [];
    show(cur, false, false);
    icon();
  };
  play.addEventListener('click', () => {
    heldStopped = false;
    if (playing) pause();
    else start();
  });

  grow.style.setProperty('--grow-dwell', `${DWELL}ms`); // the list row's timing bar runs one step
  grow.classList.add('is-live');
  if (reduceMotion.matches) {
    started = true;
    go(LAST, false);
  } else go(-1, false);
  icon();
  window.requestAnimationFrame(placeTags);
  if (document.fonts) void document.fonts.ready.then(placeTags);
  window.addEventListener('resize', placeTags);
  // ---- the dome's horizontal rings turn: a band of light runs round each (bright near side, faint far side) ----
  // Their frame loop runs only while the section is on screen and not paused.
  const orbits = $$('.dome-orbit', svg).map((g) => {
    const R = Number(g.dataset.r),
      u = Number(g.dataset.u),
      ox = Number(g.dataset.ox),
      oy = Number(g.dataset.oy);
    const NS = 'http://www.w3.org/2000/svg',
      TAIL = 1.6,
      PIECES = 14;
    const P = (/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ z) =>
      `${(ox + (x - y) * C30 * u).toFixed(1)},${(oy + ((x + y) * u) / 2 - z * u).toFixed(1)}`;
    const rings = /** @type {string} */ (g.dataset.lat)
      .split(',')
      .map(Number)
      .map((k, n) => {
        const h = R * k,
          r = Math.sqrt(R * R - h * h);
        const pieces = Array.from({ length: PIECES }, () => {
          const p = document.createElementNS(NS, 'path');
          g.append(p);
          return p;
        });
        return { h, r, pieces, period: n ? 11000 : 8000, phase: n * 2.4 };
      });
    const draw = (/** @type {number} */ t) =>
      rings.forEach((ringR) => {
        const head = ringR.phase + (t / ringR.period) * Math.PI * 2;
        ringR.pieces.forEach((p, i) => {
          const a1 = head - (TAIL * i) / PIECES,
            a0 = a1 - TAIL / PIECES,
            mid = (a0 + a1) / 2;
          const near = Math.cos(mid) + Math.sin(mid) > 0,
            fade = 1 - i / PIECES;
          let d = '';
          for (let k = 0; k <= 4; k++) {
            const a = a0 + ((a1 - a0) * k) / 4;
            d += (k ? 'L' : 'M') + P(ringR.r * Math.cos(a), ringR.r * Math.sin(a), ringR.h);
          }
          p.setAttribute('d', d);
          p.setAttribute('stroke-width', ((near ? 2.6 : 1.6) * (0.5 + fade / 2)).toFixed(2));
          p.setAttribute('stroke-opacity', ((near ? 0.95 : 0.35) * fade).toFixed(2));
        });
      });
    let t = 0,
      last = 0,
      raf = 0;
    const orbit = (/** @type {number} */ now) => {
      const dt = last ? Math.min(64, now - last) : 0;
      last = now;
      t += dt;
      draw(t);
      raf = window.requestAnimationFrame(orbit);
    };
    draw(1500);
    return (/** @type {boolean} */ run) => {
      if (run && !raf && !reduceMotion.matches) {
        last = 0;
        raf = window.requestAnimationFrame(orbit);
      }
      if (!run && raf) {
        window.cancelAnimationFrame(raf);
        raf = 0;
      }
    };
  });
  const orbitsRun = () =>
    orbits.forEach((o) =>
      o(visible && !reduceMotion.matches && !stage.classList.contains('is-paused') && !(held.on && !playing)),
    );
  play.addEventListener('click', orbitsRun);
  [...dots, ...items, prev, next].forEach((b) => b.addEventListener('click', orbitsRun));

  // starts as the section's first pixel arrives, so it's already moving when you see it; off screen it waits
  whenOnScreen(section, (on) => {
    visible = on;
    if (on && !started && !reduceMotion.matches && !held.on) start();
    else if (playing) tick(); // tick holds the clock off screen
    orbitsRun();
  });

  // the site-wide pause: hold it where it is; on release, go on only if the hold is what stopped it
  // The site-wide pause (HoldButton.astro, core.js held) pauses it the same way as its own button, and lets it go on
  // when released, unless you've used its own controls since; while held it doesn't start on its own. Its own play
  // button still plays it. Paused, off screen or held, a step keeps the time it has played and goes on from there.
  // Reduced motion switched on mid-visit pauses it.
  held.ev.addEventListener('change', () => {
    if (held.on && playing) {
      heldStopped = true;
      pause();
    } else if (!held.on && (heldStopped || (!started && visible)) && !reduceMotion.matches) {
      heldStopped = false;
      start();
    }
    orbitsRun();
  });

  // reduced motion switched on mid-visit: it pauses where it is (before it has started, the finished world, as on
  // a first visit with reduced motion); switched off, it stays put until you play it
  reduceMotion.addEventListener('change', () => {
    if (reduceMotion.matches) {
      heldStopped = false;
      if (playing) pause();
      else if (!started) {
        started = true;
        go(LAST, false);
        icon();
      }
    }
    orbitsRun();
  });
}
