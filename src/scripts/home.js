/* ==========================================================================
   Uplink Technology · Home page
   The hero (the drawing cut for the screen, the cloud, the phone captions), the Services row on
   phones. The "We grow with you" section runs from grow.js (imported here).
   ========================================================================== */

import { $, $$, held, html, reduceMotion, replay, settle, theme, whenOnScreen, words } from './core.js';
import { MEDIA } from '../lib/media.js';
import './grow.js';

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
// The cloud's apps, in the order they show; each id is its tile in the drawing (data-tile, tools/gen_office.py) and
// its words come from src/data/copy/home.yaml, cloud (index.astro carries them).
const WORDS = /** @type {import('../lib/copy-schema').HomeWords} */ (words('words-page')).cloud;
const APPS = /** @type {const} */ (['mail', 'files', 'meet', 'chat', 'cal', 'secure']).map((id) => ({
  id,
  ...WORDS.apps[id],
}));
// A timer that runs tick every `every` ms only while it may: el on screen, the tab showing, motion allowed, the
// pause button off, and ready() (default: always). It stops and starts itself as those change. start() restarts
// the count (after a hover or a tap); off() lets go of the timer and every listener, when the cut is swapped out.
/** @param {Element} el @param {() => void} tick @param {number} every @param {() => boolean} [ready] */
const loopWhileSeen = (el, tick, every, ready = () => true) => {
  let timer = 0,
    onScreen = true;
  const stop = () => {
    window.clearInterval(timer);
    timer = 0;
  };
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
  const seen = whenOnScreen(el, (on) => {
    onScreen = on;
    if (on) start();
    else stop();
  });
  const off = () => {
    stop();
    document.removeEventListener('visibilitychange', onVisible);
    reduceMotion.removeEventListener('change', start);
    held.ev.removeEventListener('change', start);
    if (seen) seen.disconnect();
  };
  return { start, stop, off };
};
const CLOUD_EVERY = 3200; // ms each app shows before the next
const WORDS_SWAP = 180; // ms the old words take to fade out (the drawing's own .18s, tools/office_parts/hero.css)
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
    const pts = /** @type {string} */ (/** @type {Element} */ (t.querySelector('.f-t')).getAttribute('points'))
      .trim()
      .split(/\s+/)
      .map((p) => p.split(',').map(Number));
    return { x: pts.reduce((a, p) => a + p[0], 0) / pts.length, y: pts.reduce((a, p) => a + p[1], 0) / pts.length };
  };
  // The state word is right-aligned, so the dot before it moves with the word's width.
  // The browser reports the new size after its own layout pass (ResizeObserver), so
  // nothing is measured straight after the text changes (that would force a layout).
  // For SVG it reports only the size, so: the word's right edge (its x) minus its width.
  const dot = svg.querySelector('.ob-state-dot');
  /** @type {ResizeObserver | null} */
  let dotSized = null;
  if (dot) {
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
    /** @type {NodeListOf<SVGElement>} */ (svg.querySelectorAll('.ob-tile')).forEach((t) =>
      t.classList.toggle('is-on', t.dataset.tile === app.id),
    );
    /** @type {NodeListOf<SVGElement>} */ (cloud.querySelectorAll('.ob-seg, .ob-pip')).forEach((s) =>
      s.classList.toggle('is-on', s.dataset.app === app.id),
    );
    const t = tile(app.id);
    if (t && LINK !== 'none') {
      const p = topCentre(t);
      const dPath =
        LINK === 'elbow'
          ? 'M' + START.x + ',' + START.y + ' H' + p.x + ' V' + p.y
          : 'M' +
            START.x +
            ',' +
            START.y +
            ' C' +
            (START.x + 70) +
            ',' +
            START.y +
            ' ' +
            p.x +
            ',' +
            (p.y - 110) +
            ' ' +
            p.x +
            ',' +
            p.y;
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
    if (first || reduceMotion.matches) {
      write();
      return;
    }
    focus.classList.add('is-out');
    swap = window.setTimeout(write, WORDS_SWAP);
  };
  const loop = loopWhileSeen(svg, () => show(index + 1), CLOUD_EVERY);
  const pick = (/** @type {string | undefined} */ id) => {
    loop.stop();
    show(APPS.findIndex((a) => a.id === id));
  };
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
  return () => {
    // the cut is swapped out: let go of the timers and listeners
    loop.off();
    window.clearTimeout(swap);
    if (dotSized) dotSized.disconnect();
  };
};

/* ------------------------------------------------------------------
   Hero captions on phones. The phone cut has no words of its own; two
   captions sit over its free corners: the cloud's (top left; the app it
   names is lit on the tray) and the office's (bottom left; one item at a
   time). They are plain HTML boxes (hero.css, .hero-cap), so their words
   wrap and grow with the visitor's text size. Each has a dot on the
   drawing at what it names, the same colour dot after its title, and a
   line between the two: the one thing read from the page, the title
   dot's place, once a change. Each changes every 4.4s, 2.2s after the other.
   Tapping the drawing moves the office one on. Words and points come
   from the drawing (data-cloud, data-items: tools/gen_office.py).
   ------------------------------------------------------------------ */
const SVG_NS = 'http://www.w3.org/2000/svg';
const CAP_EVERY = 2200; // ms between caption changes, the two captions taking turns (each one every 4.4s)
const CAP_SWAP = 170; // ms a caption takes to fade out before its new words go in (hero.css: --dur-1, plus a frame)
const CAP_SECOND = 1100; // ms from the first caption to the second
const CLOUD_TITLE = WORDS.title;
/** @param {string} cls @param {Element} parent */
const span = (cls, parent) => {
  const el = document.createElement('span');
  el.className = cls;
  parent.append(el);
  return el;
};
const startCaptions = (/** @type {SVGSVGElement} */ svg) => {
  const box = /** @type {HTMLElement} */ (svg.parentElement); // the stage
  const vb = svg.viewBox.baseVal;
  const [cloudX, cloudY] = /** @type {string} */ (svg.dataset.cloud).split(',').map(Number);
  // the drawing's own list (tools/gen_office.py); lint can't see a JSDoc cast, so it would call this an any
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const items = /** @type {{ t: string, s: string, c: string, x: number, y: number }[]} */ (
    JSON.parse(/** @type {string} */ (svg.dataset.items))
  );
  // a caption: its box over the drawing, and on the drawing its line and its dot (a line of no length with round
  // ends, so the dot keeps its size on screen whatever the drawing's scale: hero.css, .ob-mark)
  const spot = (/** @type {'cloud' | 'office'} */ name) => {
    const el = document.createElement('div');
    el.className = 'hero-cap hero-cap--' + name;
    el.setAttribute('aria-hidden', 'true'); // the drawing's own label says what it shows
    const head = span('hero-cap-t', el);
    const t = span('', head);
    const dot = span('hero-cap-dot', head);
    const s = span('hero-cap-s', el);
    box.append(el);
    const mark = document.createElementNS(SVG_NS, 'g');
    mark.setAttribute('class', 'ob-mark ob-mark-' + name);
    const [lead, ...pin] = ['ob-mark-lead', 'ob-mark-edge', 'ob-mark-pin'].map((cls) => {
      const p = document.createElementNS(SVG_NS, 'path');
      p.setAttribute('class', cls);
      mark.append(p);
      return p;
    });
    svg.append(mark);
    return { el, dot, t, s, mark, lead, pin };
  };
  const spots = { cloud: spot('cloud'), office: spot('office') };
  const at = { cloud: -1, office: -1 };
  /** @typedef {ReturnType<typeof spot>} Spot */
  // where each caption points now, so its line can be drawn again when the drawing's size changes
  /** @type {{ sp: Spot, x: number, y: number, level: boolean }[]} */
  const aims = [];
  // the line from the dot after a caption's title to its dot on the drawing. The title dot's place comes from the
  // boxes' offsets (a transform on the way in doesn't move those), turned into the drawing's units: the drawing
  // fills the stage. level: a flat run first, then down to the point (the cloud's, which sits beside its caption)
  /** @param {Spot} sp @param {number} x @param {number} y @param {boolean} level */
  const lineTo = (sp, x, y, level) => {
    if (!box.clientWidth) return;
    const k = vb.width / box.clientWidth;
    const sx = vb.x + (sp.el.offsetLeft + sp.dot.offsetLeft + sp.dot.offsetWidth / 2) * k;
    const sy = vb.y + (sp.el.offsetTop + sp.dot.offsetTop + sp.dot.offsetHeight / 2) * k;
    const run = level ? `H${Math.max(sx, x - 50).toFixed(1)}` : '';
    sp.lead.setAttribute('d', `M${sx.toFixed(1)},${sy.toFixed(1)}${run}L${x},${y}`);
  };
  /** @param {Spot} sp @param {number} x @param {number} y @param {boolean} level */
  const pinAt = (sp, x, y, level) => {
    sp.pin.forEach((p) => p.setAttribute('d', `M${x},${y}h0.01`));
    const aim = aims.find((a) => a.sp === sp);
    if (aim) Object.assign(aim, { x, y });
    else aims.push({ sp, x, y, level });
    lineTo(sp, x, y, level);
  };
  const redraw = () => aims.forEach((a) => lineTo(a.sp, a.x, a.y, a.level));
  // the office's dot beside its title: the colour its dot on the drawing shows, which the light theme changes
  const match = () => {
    if (at.office >= 0) spots.office.dot.style.background = window.getComputedStyle(spots.office.pin[1]).stroke;
  };
  const write = {
    cloud: () => {
      const sp = spots.cloud,
        app = APPS[at.cloud];
      sp.t.textContent = CLOUD_TITLE;
      const name = document.createElement('b');
      name.className = 'hero-cap-app';
      name.textContent = app.name;
      sp.s.replaceChildren(name, ' · ' + app.detail);
      pinAt(sp, cloudX, cloudY, true);
      /** @type {NodeListOf<SVGElement>} */ (svg.querySelectorAll('.ob-tile')).forEach((t) =>
        t.classList.toggle('is-on', t.dataset.tile === app.id),
      );
    },
    office: () => {
      const sp = spots.office,
        it = items[at.office];
      sp.t.textContent = it.t;
      sp.s.textContent = it.s;
      sp.pin[1].setAttribute('stroke', it.c);
      sp.lead.setAttribute('stroke', it.c);
      pinAt(sp, it.x, it.y, false);
      match();
    },
  };
  // each caption's pending swap: its timeout, then its frame (a new step on the same caption cancels both first)
  const swaps = { cloud: { t: 0, f: 0 }, office: { t: 0, f: 0 } };
  const cancel = (/** @type {{ t: number, f: number }} */ sw) => {
    window.clearTimeout(sw.t);
    window.cancelAnimationFrame(sw.f);
  };
  const step = (/** @type {'cloud' | 'office'} */ name, /** @type {boolean} */ animate) => {
    at[name] = (at[name] + 1) % (name === 'cloud' ? APPS.length : items.length);
    const sp = spots[name],
      sw = swaps[name];
    const both = [sp.el, sp.mark];
    cancel(sw);
    sp.el.classList.remove('is-pre');
    if (!animate || reduceMotion.matches) {
      both.forEach((x) => x.classList.remove('is-out'));
      write[name]();
      both.forEach((x) => x.classList.add('is-on'));
      return;
    }
    both.forEach((x) => x.classList.add('is-out'));
    sw.t = window.setTimeout(() => {
      sp.el.classList.add('is-pre');
      both.forEach((x) => x.classList.remove('is-out'));
      write[name](); // written once below their place (is-pre), the words rise in from the frame after
      both.forEach((x) => x.classList.add('is-on'));
      sw.f = window.requestAnimationFrame(() => {
        sw.f = window.requestAnimationFrame(() => sp.el.classList.remove('is-pre'));
      });
    }, CAP_SWAP);
  };
  let turn = 0,
    begun = false;
  const loop = loopWhileSeen(
    svg,
    () => step(turn++ % 2 ? 'office' : 'cloud', true),
    CAP_EVERY,
    () => begun,
  );
  const tap = () => {
    if (!begun) return;
    step('office', true);
    turn = 0;
    loop.start();
  };
  svg.addEventListener('click', tap);
  theme.ev.addEventListener('change', match);
  // the stage's size changes (a turned phone), or the web font arrives and the titles change width: the lines again
  const sized = new ResizeObserver(redraw);
  sized.observe(box);
  void document.fonts.ready.then(redraw);
  // first words as the drawing's build ends, which the drawing gives (data-words, PHONE_WORDS in tools/gen_office.py:
  // about 1.1s; at once with reduced motion), the office's 1.1s after
  const quick = reduceMotion.matches;
  const capFirst = Number(svg.dataset.words) || 0;
  let second = 0;
  const first = window.setTimeout(
    () => {
      begun = true;
      step('cloud', !quick);
      second = window.setTimeout(
        () => {
          step('office', !quick);
          loop.start();
        },
        quick ? 0 : CAP_SECOND,
      );
    },
    quick ? 0 : capFirst,
  );
  return () => {
    // the cut is swapped out: let go of the timers and listeners, and take the caption boxes with it (their dots
    // leave with the drawing)
    loop.off();
    window.clearTimeout(first);
    window.clearTimeout(second);
    cancel(swaps.cloud);
    cancel(swaps.office);
    svg.removeEventListener('click', tap);
    theme.ev.removeEventListener('change', match);
    sized.disconnect();
    spots.cloud.el.remove();
    spots.office.el.remove();
  };
};
if (stage) {
  const phone = window.matchMedia(MEDIA.smallPhone); // HERO.media.phone
  // Hero.astro writes every one of these data- attributes
  const tablet = window.matchMedia(/** @type {string} */ (stage.dataset.tablet));
  const files = /** @type {Record<'full' | 'tablet' | 'phone', string[]>} */ ({
    full: [stage.dataset.hero],
    tablet: [stage.dataset.heroTablet],
    phone: [stage.dataset.heroPhone, stage.dataset.heroPhoneFlows],
  });
  /** @type {string | null} */
  let shown = null;
  /** @type {Element[]} */
  let added = [];
  /** @type {(IntersectionObserver | null)[]} */
  let observers = [];
  /** @type {(() => void) | null} */
  let stopCloud = null;
  let ticket = 0; // counts loads: only the latest one may insert (a screen that flips and back mid-download asks twice)
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
    $$('svg.ob-over', stage).forEach((el) => {
      el.style.display = on ? 'none' : '';
    });
    $$('.hero-pause', stage).forEach((el) => {
      el.style.display = on ? 'none' : '';
    });
    if (on && still) {
      const pic = /** @type {Element} */ (/** @type {Element} */ (still.content.firstElementChild).cloneNode(true));
      stage.prepend(pic);
      added = [pic];
    }
  };
  const load = () => {
    const cut = phone.matches ? 'phone' : tablet.matches ? 'tablet' : 'full';
    if (cut === shown) return;
    shown = cut;
    const mine = ++ticket;
    clear();
    failed(false);
    Promise.all(
      files[cut].map((url) =>
        window.fetch(url).then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status))))),
      ),
    )
      .then((texts) => {
        if (mine !== ticket) return; // the screen changed while it loaded (even if it has changed back since)
        const before = stage.children.length;
        stage.insertAdjacentHTML('afterbegin', html(texts.join('')));
        added = Array.from(stage.children).slice(0, stage.children.length - before);
        // paused: the drawing shows built, not its empty first frame (a reload, or a new cut after a resize)
        settle(stage);
        // looping animations pause off screen: the drawing, and the dashes' layer (the cut's own on phones)
        const layers = cut === 'phone' ? added : [added[0], $('svg.ob-over:not(.ob-phone)', stage)];
        observers = layers.map((el) => whenOnScreen(el));
        /** @type {SVGGElement | null} */
        const cloud = $('svg.ob .ob-cloud', stage);
        const first = /** @type {SVGSVGElement} */ (added[0]);
        if (cut === 'phone') {
          if (first.dataset.items) stopCloud = startCaptions(first);
        } else if (cloud) stopCloud = startCloud(cloud);
      })
      .catch(() => {
        if (mine === ticket) {
          shown = null;
          failed(true);
        }
      });
  };
  load();
  [phone, tablet].forEach((m) => m.addEventListener('change', load));
  // paused mid-build: the drawing finishes building at once and its loops hold
  held.ev.addEventListener('change', () => settle(stage));
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
if (svcRow && svcDots.length) {
  const cards = Array.from(svcRow.children);
  const hint = /** @type {HTMLElement} */ (svcHint); // Services.astro has it with the dots
  const steps = $$('.svc-step', hint);
  const row = window.matchMedia(MEDIA.phone);
  let current = 0;
  /** @type {number | null} */
  let aim = null; // the card a step is sliding to, so a quick second click steps on from there
  const centre = (/** @type {number} */ best) => {
    current = best;
    if (best === aim) aim = null;
    cards.forEach((li, i) => li.classList.toggle('is-centre', i === best));
    svcDots.forEach((dot, i) => dot.classList.toggle('on', i === best));
    steps.forEach((b) =>
      b.setAttribute(
        'aria-disabled',
        String(
          current + +(/** @type {string} */ (b.dataset.step)) < 0 ||
            current + +(/** @type {string} */ (b.dataset.step)) >= cards.length,
        ),
      ),
    );
    if (best > 0) svcHint?.classList.add('is-swiped');
  };
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) centre(cards.indexOf(en.target));
      });
    },
    { root: svcRow, rootMargin: '0px -49% 0px -49%' },
  );
  cards.forEach((li) => io.observe(li));
  centre(0);
  // scrolls the row only (scrollIntoView would also move the page); the li itself never transforms, so its box is true
  const go = (/** @type {number} */ i) => {
    aim = Math.max(0, Math.min(cards.length - 1, i));
    const li = cards[aim];
    const r = li.getBoundingClientRect(),
      box = svcRow.getBoundingClientRect();
    svcRow.scrollBy({
      left: r.left + r.width / 2 - (box.left + box.width / 2),
      behavior: reduceMotion.matches ? 'auto' : 'smooth',
    });
    if (aim === current) aim = null;
  };
  // a slide that ends (or a swipe that cuts it short) forgets its aim. Safari before 26.2 has no scrollend: there a
  // scroll that has been still for 150ms has ended (review J15)
  const settle = () => {
    aim = null;
  };
  if ('onscrollend' in window) svcRow.addEventListener('scrollend', settle);
  else {
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    let quiet; // (window is "never" here to the type check, which knows only browsers with scrollend)
    svcRow.addEventListener(
      'scroll',
      () => {
        clearTimeout(quiet);
        quiet = setTimeout(settle, 150);
      },
      { passive: true },
    );
  }
  steps.forEach((b) =>
    b.addEventListener('click', () => go((aim ?? current) + +(/** @type {string} */ (b.dataset.step)))),
  );
  $('.svc-dots', hint)?.addEventListener('click', (e) => {
    const near = svcDots.map((dot) => {
      const r = dot.getBoundingClientRect();
      return Math.abs(e.clientX - (r.left + r.width / 2));
    });
    go(near.indexOf(Math.min(...near)));
  });
  // keyboard focus only (above); a browser without :focus-visible slides on any focus, as before
  const byKeyboard = (/** @type {Element} */ el) => {
    try {
      return el.matches(':focus-visible');
    } catch {
      return true;
    }
  };
  svcRow.addEventListener('focusin', (e) => {
    if (row.matches && byKeyboard(/** @type {Element} */ (e.target)))
      go(cards.indexOf(/** @type {Element} */ (/** @type {Element} */ (e.target).closest('li'))));
  });
  svcRow.addEventListener('keydown', (e) => {
    if (!row.matches || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || e.altKey || e.ctrlKey || e.metaKey) return;
    const next =
      cards[
        cards.indexOf(/** @type {Element} */ (/** @type {Element} */ (e.target).closest('li'))) +
          (e.key === 'ArrowLeft' ? -1 : 1)
      ];
    if (!next) return;
    e.preventDefault();
    /** @type {HTMLElement} */ ($('a', next)).focus({ preventScroll: true });
  });
}
