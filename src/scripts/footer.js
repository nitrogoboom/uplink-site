/* ==========================================================================
   Uplink Technology · footer (every page)
   The campus map, the rows sliding open and shut (phones), and the
   newsletter mockup. The sections themselves are <details name="footer">
   (Footer.astro): the browser opens and shuts them, and footer.css lays
   them out. Nothing here moves them; on tablet and up it only keeps one
   open (Contact when none is picked).
   ========================================================================== */

import { $, $$, UI, dashes, html, reduceMotion, toast, whenOnScreen } from './core.js';
import { PHONE, TABLET_UP } from '../lib/media.js';

/* ======================================================================
   Campus map (tablet and desktop; phones hide it). Decoration only.
   Each section's data-map names a spot on the map (hq, services, company,
   support, resources); the map's label is in the markup and CSS
   shows the open section's words. Here the camera flies to the spot and
   lights it up whenever a section opens or shuts (the toggle event). With
   nothing open, Contact shows (footer.css, and Contact is opened for real
   on tablet and up, below), so its spot does too. The map
   is drawn by tools/gen_campus.py: each spot's group carries its camera
   (data-vb, a viewBox) and the marker's point (data-mk), and the spot's
   group, route and ring share its data-k.
   ====================================================================== */
const MAP_MOVE = 700; // ms the map's camera takes to fly to a section's spot
const fc = $('.fc');
if (fc) {
  const mapBox = /** @type {HTMLElement} */ ($('[data-fc-map]', fc));
  /** @type {HTMLDetailsElement[]} */
  const sections = $$('.fc-sec', fc);
  const shown = () => sections.find((d) => d.open) || sections[0];
  const nums = (/** @type {string} */ s) => s.split(' ').map(Number);
  // The map (about 30 KB of SVG, 290-odd shapes) is fetched when the footer comes within a screen or so of view,
  // not at load: most visits never reach the footer. Its box keeps its size in CSS, so nothing moves when it lands.
  /** @type {SVGSVGElement | null} */
  let svg = null;
  /** @type {SVGElement | null} */
  let marker = null;
  /** @type {number[]} */
  let vb = [];
  let mk = [0, 0],
    raf = 0;
  const build = () =>
    window
      .fetch(/** @type {string} */ (mapBox.dataset.fcMap))
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((text) => {
        mapBox.insertAdjacentHTML('afterbegin', html(text));
        // the drawing's markup (tools/gen_campus.py) has these
        const map = /** @type {SVGSVGElement} */ ($('svg.fc-w', mapBox));
        svg = map;
        marker = $('.mk', map);
        vb = nums(/** @type {string} */ (map.getAttribute('viewBox')));
        focusMap(true);
        // the map's looping animations pause while it is off screen; the moving dashes start the first time it shows
        whenOnScreen(map, (on) => {
          if (on) map.classList.add('is-seen');
        });
        // the routes' dashes keep the site's beat while the map is on screen (core.js, the dash clock)
        dashes($$('.flow', map), () => !map.classList.contains('is-idle'));
      })
      .catch(() => {
        /* no map: the sections and the label still work */
      });

  const paint = () => {
    // only once the map is in
    /** @type {SVGSVGElement} */ (svg).setAttribute('viewBox', vb.map((n) => n.toFixed(1)).join(' '));
    /** @type {SVGElement} */ (marker).setAttribute('transform', `translate(${mk[0].toFixed(1)} ${mk[1].toFixed(1)})`);
  };
  // the shown section's spot lights up and the camera flies there
  const focusMap = (/** @type {boolean} */ instant) => {
    if (!svg) return; // not in yet: build() shows the spot when it is
    const k = shown().dataset.map;
    const spot = /** @type {SVGElement} */ ($(`.dist[data-k="${k}"]`, svg));
    $$('[data-k]', svg).forEach((el) => el.classList.toggle('on', el.dataset.k === spot.dataset.k));
    const to = nums(/** @type {string} */ (spot.dataset.vb)),
      toMk = nums(/** @type {string} */ (spot.dataset.mk));
    window.cancelAnimationFrame(raf);
    if (instant || reduceMotion.matches) {
      vb = to;
      mk = toMk;
      paint();
      return;
    }
    const v0 = vb.slice(),
      m0 = mk.slice(),
      t0 = performance.now(),
      dur = MAP_MOVE;
    const ease = (/** @type {number} */ p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
    const step = (/** @type {number} */ now) => {
      const p = Math.min(1, (now - t0) / dur),
        e = ease(p);
      vb = v0.map((a, i) => a + (to[i] - a) * e);
      mk = m0.map((a, i) => a + (toMk[i] - a) * e);
      paint();
      if (p < 1) raf = window.requestAnimationFrame(step);
    };
    raf = window.requestAnimationFrame(step);
  };
  // Tiles (tablet and up, where footer.css can place a panel): one section is always open, Contact unless another is
  // picked, so the panel on screen is always the one whose summary says it's open. Without script CSS shows Contact
  // anyway (its summary then says closed). Phones and the fallback rows start with every row shut.
  const tiles = window.matchMedia(TABLET_UP);
  const placed = window.CSS?.supports?.('selector(::details-content)');
  const keepOne = () => {
    if (placed && tiles.matches && !sections.some((d) => d.open)) sections[0].open = true;
  };
  keepOne();
  tiles.addEventListener('change', keepOne);

  /* ======================================================================
     Rows (phones, in a browser that can place a details' panel): a tapped
     row slides open, and the open row slides shut. A browser shuts a
     details at once, panel and all, so the tap is taken over here: the
     row's content box (::details-content) gets a height in --fc-row-h,
     0 and the panel's height, and footer.css slides between the two; a
     shutting row stays open, marked data-shut (footer.css shows it shut),
     until it's down. (Not element.animate() on the content box: Safari
     won't move the box of a details that has none of its own, as these
     rows.) The rows' name is set aside while they slide, or opening one
     would shut the other at once; one row open at a time is then kept
     here. Without script, with reduced motion, and in the tiles the
     browser does it all, at once.
     ====================================================================== */
  const rows = window.matchMedia(PHONE);
  const NAME = sections[0].getAttribute('name') ?? '';
  // a time token in ms: the build writes 320ms as .32s, so mind the unit. Read at a tap, never at load: asking for a
  // computed style before the first paint makes the browser style the whole page for it (PageSpeed, "Forced reflow")
  const ms = (/** @type {string} */ k) => {
    const v = window.getComputedStyle(fc).getPropertyValue(k).trim();
    return parseFloat(v) * (v.endsWith('ms') ? 1 : 1000);
  };
  // the rows on the move: which way each is going, and its landing
  /** @type {Map<HTMLDetailsElement, { open: boolean, timer: number }>} */
  const sliding = new Map();
  const slides = () => Boolean(placed) && rows.matches && !reduceMotion.matches;
  // the panel's full height (reading it also brings the row's style up to date: a height set just before is then the
  // one it slides from)
  const panelH = (/** @type {HTMLDetailsElement} */ d) =>
    `${/** @type {HTMLElement} */ ($('.fc-panel', d)).offsetHeight}px`;
  // down: the row lets go of its height (auto again), and one that slid shut shuts
  const land = (/** @type {HTMLDetailsElement} */ d) => {
    const run = sliding.get(d);
    if (!run) return;
    window.clearTimeout(run.timer);
    sliding.delete(d);
    d.style.removeProperty('--fc-row-h');
    d.removeAttribute('data-shut');
    if (!run.open) d.open = false;
  };
  // slide a row open or shut; one already on the move turns round from where it is (the CSS transition does that)
  const slide = (/** @type {HTMLDetailsElement} */ d, /** @type {boolean} */ open) => {
    const run = sliding.get(d);
    if (run ? run.open === open : d.open === open) return;
    if (!run) {
      // from rest: open from 0, or shut from its full height
      d.open = true;
      const full = panelH(d);
      d.style.setProperty('--fc-row-h', open ? '0px' : full);
      void panelH(d);
    }
    const to = open ? panelH(d) : '0px';
    d.toggleAttribute('data-shut', !open);
    d.style.setProperty('--fc-row-h', to);
    window.clearTimeout(run?.timer);
    const landing = ms(open ? '--dur-fc-row-open' : '--dur-fc-row-shut');
    sliding.set(d, { open, timer: window.setTimeout(() => land(d), landing) });
  };
  // a tap on a row's summary, while the rows slide: a shut row opens as the open one shuts, both at once; a row on its
  // way down turns round and opens again; an open row shuts
  const rowTap = (/** @type {HTMLDetailsElement} */ d) => {
    const open = !d.open || sliding.get(d)?.open === false;
    if (open) sections.forEach((o) => o !== d && o.open && slide(o, false));
    slide(d, open);
  };
  // rows slide, or not: the rows give up their name while they slide and get it back when they stop (a row still on
  // the move lands first, so at most one is open when the name returns)
  const setSlides = () => {
    sliding.forEach((_, d) => land(d));
    const on = slides();
    sections.forEach((d) => (on ? d.removeAttribute('name') : d.setAttribute('name', NAME)));
  };
  setSlides();
  rows.addEventListener('change', setSlides);
  reduceMotion.addEventListener('change', setSlides);
  // Enter and Space on a summary are clicks too
  fc.addEventListener('click', (e) => {
    const tile = /** @type {Element} */ (e.target).closest('.fc-tile');
    if (!tile || !slides()) return;
    e.preventDefault(); // the browser would open or shut it at once
    rowTap(/** @type {HTMLDetailsElement} */ (tile.parentElement));
  });

  // toggle doesn't bubble: listen on the way down. Opening one section shuts the open one, so two events can come
  // in a row; both see the new one open. Shutting the open one leaves none: Contact opens again. While the rows
  // slide, a row opened without a tap (find in page, a link to it) opens at once and the open one slides shut.
  fc.addEventListener(
    'toggle',
    (e) => {
      const d = /** @type {HTMLDetailsElement} */ (e.target);
      if (!d.matches('.fc-sec')) return;
      if (slides() && d.open && !sliding.has(d)) sections.forEach((o) => o !== d && o.open && slide(o, false));
      keepOne();
      focusMap(false);
    },
    true,
  );

  // newsletter (prototype: nothing is sent)
  // the form's input and message are in its markup (Footer.astro)
  /** @type {HTMLFormElement | null} */
  const nl = $('[data-fc-nl]', fc);
  const note = nl ? /** @type {HTMLElement} */ ($('[data-fc-nl-msg]', nl)).textContent : '';
  // once marked wrong, the address clears its error as soon as it reads right, not on the next submit
  if (nl)
    /** @type {HTMLInputElement} */ ($('input', nl)).addEventListener('input', (e) => {
      const t = /** @type {HTMLInputElement} */ (e.target);
      if (t.getAttribute('aria-invalid') && t.checkValidity()) {
        t.removeAttribute('aria-invalid');
        /** @type {HTMLElement} */ ($('[data-fc-nl-msg]', nl)).textContent = note;
      }
    });
  if (nl)
    nl.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = /** @type {HTMLInputElement} */ ($('input', nl)),
        msg = /** @type {HTMLElement} */ ($('[data-fc-nl-msg]', nl));
      if (!input.checkValidity()) {
        input.setAttribute('aria-invalid', 'true');
        msg.textContent = UI.emailError;
        input.focus();
        return;
      }
      input.removeAttribute('aria-invalid');
      msg.textContent = note; // the form's own note, put back
      nl.reset();
      toast(UI.toast.subscribed);
    });

  // the map is fetched when its box comes within a screen of view; phones hide the box (footer.css), so they never
  // fetch it, and a phone turned past 700 px fetches it then
  const near = new IntersectionObserver(
    ([en]) => {
      if (en.isIntersecting) {
        near.disconnect();
        void build();
      }
    },
    { rootMargin: '100% 0px' },
  );
  near.observe(mapBox);
}
