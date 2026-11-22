/* ==========================================================================
   Uplink Technology · Home · We grow with you (Grow.astro): plays the six-step world (src/README.md, "Scripts").
   A step's new parts drop in and glow (earlier ones stay), its risks show as red tags and then flip to green fixes as
   its card goes from "Watch for" to "We handle". It plays once, from bare ground, when the section comes on screen;
   the arrows and dots step through it by hand; the play button pauses, plays and replays, and its edge times the
   whole story. The camera starts close on the office and pulls back as the world grows. Reduced motion: the finished
   world, no movement; the controls still step through. Once the story ends it stands still (its loops and the dome's
   orbits too) until you play it again. Builds no HTML: this only sets classes, attributes and text.
   ========================================================================== */

import { $, $$, dashes, held, reduceMotion, whenOnScreen, words } from './core.js';

const DWELL = 4500; // ms a step
const RISK_AT = 900; // ms into a step: its risks show (the parts have dropped in by then)
const FIX_AT = 2300; // ms into a step: the risks flip to fixes
const GLOW = 3400; // ms the new parts glow
const PAUSE = 'M2 1h3v10H2zM7 1h3v10H7z',
  PLAY = 'M2 1l9 5-9 5z',
  REPLAY = 'M6 1a5 5 0 1 0 5 5h-2a3 3 0 1 1-3-3v2l3-3-3-3z';

const section = $('#grow');
const grow = section && $('.grow', section);
// the drawing: a stack of layers, one <svg> each (Grow.astro): the ground first, then each part in drawing order
/** @type {HTMLElement | null} */
const world = grow && $('.grow-world', grow);
if (grow && world) {
  const layers = /** @type {SVGSVGElement[]} */ ($$('svg.gw', world));
  const ground = layers[0];
  // the play button's names: src/data/copy/en/home.yaml, grow (index.astro carries them)
  const T = /** @type {import('../lib/copy').HomeWords} */ (words('words-page')).grow;
  // the section's parts are all in Grow.astro and its drawing (tools/gen_grow.py)
  const stage = /** @type {HTMLElement} */ ($('.grow-stage', grow));
  const steps = $$('.grow-card', grow);
  const N = steps.length,
    LAST = N - 1;
  // each part's layer (g, which drops in) and its shapes (box, measured for the camera)
  const pcs = /** @type {SVGSVGElement[]} */ ($$('svg.pc', world)).map((g) => ({
    g,
    box: /** @type {SVGGElement} */ (g.firstElementChild),
    s: Number(g.dataset.s) - 1,
    o: Number(g.dataset.o),
  }));
  const tags = $$('.grow-tag', grow).map((el) => ({
    el,
    step: Number(el.dataset.step),
    k: Number(el.dataset.k),
    at: /** @type {SVGElement} */ ($(`.tg-a[data-a="${el.dataset.at}"]`, world)),
    icon: /** @type {HTMLElement} */ ($('.grow-tag-i', el)),
    text: /** @type {HTMLElement} */ ($('.grow-tag-t', el)),
  }));
  const dots = $$('.grow-dot', grow),
    items = $$('.grow-item', grow);
  const [prev, next] = $$('.grow-step-btn', grow);
  const play = /** @type {HTMLElement} */ ($('.grow-play', grow)),
    playIcon = /** @type {SVGPathElement} */ ($('.grow-play-i path', grow)),
    ring = /** @type {SVGCircleElement} */ ($('.grow-ring circle', grow));
  const place = /** @type {HTMLElement} */ ($('.grow-place', grow));
  const places = steps.map((c) => c.dataset.place);
  const full = /** @type {string} */ (ground.getAttribute('viewBox')).split(' ').map(Number);
  let built = -1,
    cur = -1,
    playing = false,
    started = false,
    visible = false,
    timer = 0,
    glowT = 0,
    preRaf = 0;
  /** @type {number[]} */
  let beats = [];
  let at = { left: 0, top: 0 }; // the drawing's box in the stage (placeTags)

  // ---- tags: placed on the drawing's anchors, kept inside the picture, and never on top of each other: when a
  // step's two tags would overlap (a close camera brings anchors together), the upper one moves up clear of the
  // lower one, or, with no room above, the lower one moves down ----
  // Only while the section is on screen: measuring it at load, far below the first screen, made the browser lay the
  // whole page out early (PageSpeed, "Forced reflow"). Coming on screen places them (whenOnScreen, below).
  const placeTags = () => {
    if (!visible) return;
    // the drawing's box in the stage, from the stage's outer edge: measured while no move transforms it
    if (!camAnim) {
      const s = stage.getBoundingClientRect(),
        d = world.getBoundingClientRect();
      at = { left: d.left - s.left, top: d.top - s.top };
    }
    const v = view(),
      left = at.left,
      top0 = at.top,
      width = stage.offsetWidth,
      pad = 6,
      gap = 4;
    const top = Math.max(pad, place.offsetHeight ? place.offsetTop + place.offsetHeight + gap : 0); // below the place
    const spots = tags.map((t) => {
      const px = left + v.x + v.k * Number(t.at.getAttribute('cx')),
        py = top0 + v.y + v.k * Number(t.at.getAttribute('cy'));
      const w = t.el.offsetWidth,
        h = t.el.offsetHeight;
      return {
        t,
        w,
        h,
        x: Math.min(width - w / 2 - pad, Math.max(w / 2 + pad, px)),
        y: Math.max(h + top, py - 3),
      };
    });
    for (let s = 0; s < steps.length; s++) {
      const pair = spots.filter((q) => q.t.step === s).sort((a, b) => b.y - a.y); // lower one first
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
      q.t.el.style.left = `${q.x}px`;
      q.t.el.style.top = `${q.y}px`;
    });
  };

  // ---- the camera: close on what's built, pulling back as the world grows ----
  // The camera moves by sliding and scaling the drawing (a transform, which the graphics chip runs), not by rewriting
  // its viewBox every frame, which redrew the whole picture 60 times a second (70 to 100% of a slowed phone's main
  // thread for each step's first second and a half). A move sets the new viewBox once and starts the drawing where the
  // old view had it. The path is the old one's: the same 1.4 s and ease, scale and offset moving together.
  // `vb` is the view on screen, as a viewBox, mid-move too, so a new move starts from where the camera is.
  let vb = full.slice(),
    camRaf = 0;
  /** @type {Animation | null} */
  let camAnim = null;
  let move = { r: 1, tx: 0, ty: 0, t0: 0, dur: 0 }; // the running move: where it set off, as a transform of the new view
  const CAM_MS = 1400;
  const ease = (/** @type {number} */ k) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
  // the same ease for the browser: linear() through 21 points of it (Chrome 113, Firefox 112, Safari 17.2)
  const EASE = `linear(${Array.from({ length: 21 }, (_, n) => ease(n / 20).toFixed(4)).join(', ')})`;
  // a square viewBox in the drawing's box, centred as the browser fits it: a point p sits at k * p + (x, y)
  const fit = (/** @type {number[]} */ b) => {
    const W = world.clientWidth,
      H = world.clientHeight,
      k = Math.min(W, H) / b[2];
    return { k, x: (W - b[2] * k) / 2 - b[0] * k, y: (H - b[3] * k) / 2 - b[1] * k };
  };
  // the view on screen now: the set viewBox, carried by what is left of the running move
  const view = () => {
    const f = fit(/** @type {string} */ (ground.getAttribute('viewBox')).split(' ').map(Number));
    if (!camAnim) return f;
    const e = ease(Math.min(1, (performance.now() - move.t0) / move.dur)),
      r = move.r + (1 - move.r) * e;
    return { k: r * f.k, x: r * f.x + move.tx * (1 - e), y: r * f.y + move.ty * (1 - e) };
  };
  const asViewBox = (/** @type {{ k: number, x: number, y: number }} */ v) => {
    const W = world.clientWidth,
      H = world.clientHeight,
      s = Math.min(W, H) / v.k;
    return [((W - s * v.k) / 2 - v.x) / v.k, ((H - s * v.k) / 2 - v.y) / v.k, s, s];
  };
  const target = (/** @type {number} */ i) => {
    if (i < 0) return full;
    let x0 = Infinity,
      y0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity;
    pcs.forEach(({ box, s }) => {
      if (s > i) return;
      const b = box.getBBox();
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
    if (camAnim) vb = asViewBox(view()); // stopped mid-move: go on from where the camera is
    camAnim?.cancel();
    camAnim = null;
    world.style.willChange = '';
    if (to.every((v, n) => v === vb[n])) return; // already there (the first draw, a pause): nothing to write
    const a = fit(vb);
    vb = to.slice();
    const box = vb.map((v) => v.toFixed(1)).join(' ');
    layers.forEach((l) => l.setAttribute('viewBox', box));
    const dur = animate && !reduceMotion.matches ? CAM_MS : 0;
    if (!dur) {
      placeTags();
      return;
    }
    // where the old view had the drawing, as a transform of the new one
    const b = fit(to),
      r = a.k / b.k;
    move = { r, tx: a.x - r * b.x, ty: a.y - r * b.y, t0: performance.now(), dur };
    // its own layer for the move only: the parts dropping in then repaint just themselves, not the whole picture at
    // each new scale; at rest the drawing stays sharp under a phone's pinch zoom
    world.style.willChange = 'transform';
    camAnim = world.animate(
      [{ transform: `translate(${move.tx}px, ${move.ty}px) scale(${r})` }, { transform: 'none' }],
      {
        duration: dur,
        easing: EASE,
      },
    );
    const done = camAnim;
    void camAnim.finished.then(
      () => {
        if (camAnim !== done) return;
        camAnim = null;
        world.style.willChange = '';
        placeTags();
      },
      () => {},
    );
    // the tags ride along while any is showing (the risks come up at RISK_AT, before the move ends)
    const follow = () => {
      if (camAnim !== done) return;
      if (tags.some((t) => t.el.classList.contains('is-on'))) placeTags();
      camRaf = window.requestAnimationFrame(follow);
    };
    camRaf = window.requestAnimationFrame(follow);
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

  // ---- the timer on the play button's edge: 0 (nothing) to 1 (all six steps), read from the clock. It stands
  // where the clock is; while a step plays, the site's beat moves it on a few times a second (core.js, the dash
  // clock; registered below). Not a CSS animation of the dash: that costs a frame of page work 60 times a second ----
  const RING = 311.02; // the play ring's length in its own units (2π × 49.5, as its stroke-dasharray in grow.css)
  const ringOff = (/** @type {number} */ k) => `${RING * (1 - Math.min(1, Math.max(0, k)))}`;
  const ringSync = () => {
    ring.style.strokeDashoffset = ringOff(cur < 0 ? 0 : (cur + Math.min(1, played() / DWELL)) / N);
  };

  // ---- the open step's stretch of the growth line (desktop list), from the same clock: it fills while the step
  // plays, waits where it is while the step does, and goes once the step is done or was picked by hand ----
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
    window.cancelAnimationFrame(preRaf);
    if (fresh.length) {
      fresh.forEach(({ g }) => g.classList.add('pre', 'hide'));
      void world.getBoundingClientRect(); // commit the start of the drop before it begins
    }
    pcs.forEach(({ g, s, o }) => {
      const isNew = fresh.some((p) => p.g === g);
      // not animating (first draw, pause, reduced motion): parts appear or go at once, never a flash of the end
      if (animate) g.classList.remove('pre');
      else g.classList.add('pre');
      g.style.transitionDelay = animate && isNew ? `${120 + (s - Math.max(from + 1, 0)) * 500 + o * 140}ms` : '0ms';
      g.classList.toggle('hide', s > i);
      if (animate && isNew) g.classList.add('glow');
    });
    // .pre (no transition) stays until the browser has drawn the parts where they now are: two frames on, with no
    // layout asked for here. A show() before then cancels this and sets .pre itself (above).
    if (!animate)
      preRaf = window.requestAnimationFrame(() => {
        preRaf = window.requestAnimationFrame(() => pcs.forEach(({ g }) => g.classList.remove('pre')));
      });
    if (animate) glowT = window.setTimeout(() => pcs.forEach(({ g }) => g.classList.remove('glow')), GLOW);
    camTo(target(i), animate);
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
    // While the story plays, the open step's stretch of the line fills over the step's time.
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
    ringSync();
    bar();
  };

  // ---- playing ----
  const icon = () => {
    const end = cur >= LAST;
    playIcon.setAttribute('d', playing ? PAUSE : end ? REPLAY : PLAY);
    play.setAttribute('aria-label', playing ? T.play.pause : end ? T.play.again : T.play.play);
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
    ringSync();
    bar();
    icon();
  };
  // the step plays on for what's left of it, while the story plays and is on screen; otherwise its clock holds
  const tick = () => {
    window.clearTimeout(timer);
    if (!playing || !visible) {
      hold();
      ringSync();
      bar();
      return;
    }
    if (!runSince) runSince = performance.now();
    timer = window.setTimeout(
      () => {
        if (cur >= LAST) {
          stop();
          return;
        } // the end: it stands still
        go(cur + 1, true);
        tick();
      },
      cur < 0 ? 0 : Math.max(0, DWELL - played()),
    );
    ringSync();
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
  // the web font arrives and the tags change width. The fonts' own "done" event, not document.fonts.ready: asking
  // for that makes the browser lay the whole page out on the spot (PageSpeed, "Forced reflow")
  document.fonts.addEventListener('loadingdone', placeTags);
  window.addEventListener('resize', placeTags);
  // ---- the dome's horizontal rings turn: a band of light runs round each (bright near side, faint far side). Set
  // up once: each ring's line, copied three times into the drawing's empty .dome-orbit (a faint tail, a middle, a
  // bright head), as dashes grow.css runs round it. CSS holds them with the rest of the drawing: paused, at the end,
  // off screen (.is-idle), on the site's pause (.is-held); with reduced motion they stand still. ----
  const orbit = $('.dome-orbit', world);
  if (orbit)
    $$('.dome-lat', world).forEach((lat, n) =>
      ['is-tail', 'is-mid', 'is-head'].forEach((layer) => {
        const p = /** @type {Element} */ (lat.cloneNode(false));
        ['class', 'stroke', 'stroke-width', 'stroke-opacity'].forEach((a) => p.removeAttribute(a));
        p.setAttribute('pathLength', '100'); // the dashes in grow.css are shares of the ring
        p.classList.add('dome-run', layer, n ? 'is-upper' : 'is-lower');
        orbit.append(p);
      }),
    );

  // the cables' dashes and the dome's bands keep the site's beat (core.js, the dash clock) while the world is on
  // screen and not standing still (paused, or at the story's end); the play ring moves on with them
  dashes(
    $$('[stroke-dasharray="5 5"], [stroke-dasharray="4 4"], [stroke-dasharray="6 6"], .dome-run', world),
    () => visible && !stage.classList.contains('is-paused'),
    ringSync,
  );

  // starts as the section's first pixel arrives, so it's already moving when you see it; off screen it waits
  whenOnScreen(section, (on) => {
    visible = on;
    if (on) placeTags();
    if (on && !started && !reduceMotion.matches && !held.on) start();
    else if (playing) tick(); // tick holds the clock off screen
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
  });
}
