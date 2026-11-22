/* ==========================================================================
   Uplink Technology · Home page
   The hero (the cloud's apps, the drawing's dashes), the Services row on phones. The "We grow with
   you" section runs from grow.js (imported here).
   ========================================================================== */

import { $, $$, dashes, held, reduceMotion, settle, whenOnScreen } from './core.js';
import { MEDIA } from '../lib/media.js';
import './grow.js';

/* ------------------------------------------------------------------
   Hero: the office drawing is in the page already (Hero.astro) and
   builds in by its own CSS. Here: its dashes keep the site's beat, its
   loops rest off screen, a load with the pause on shows it built, and
   the cloud names one app at a time, lighting that app's tile (and, on
   phones, its caption). Every part of an app carries data-app; the
   first shows until the timer starts. Reduced motion: no timer.
   ------------------------------------------------------------------ */
const CLOUD_EVERY = 3200; // ms each app shows before the next
/** @type {HTMLElement | null} */
const stage = $('.hero-art .stage');
if (stage) {
  const parts = /** @type {HTMLElement[]} */ ($$('[data-app]', stage));
  const apps = [...new Set(parts.map((el) => el.dataset.app))];
  let at = 0;
  let timer = 0;
  let onScreen = false;
  const step = () => {
    at = (at + 1) % apps.length;
    parts.forEach((el) => el.classList.toggle('is-on', el.dataset.app === apps[at]));
  };
  // the timer runs only while it may: the drawing on screen, the tab showing, motion allowed and the pause off
  const run = () => {
    window.clearInterval(timer);
    timer = 0;
    if (onScreen && !document.hidden && !reduceMotion.matches && !held.on)
      timer = window.setInterval(step, CLOUD_EVERY);
  };
  whenOnScreen(stage, (on) => {
    onScreen = on;
    run();
  });
  document.addEventListener('visibilitychange', run);
  reduceMotion.addEventListener('change', run);
  held.ev.addEventListener('change', () => {
    settle(stage);
    run();
  });
  settle(stage);
  dashes($$('.ob-flow', stage), () => !stage.classList.contains('is-idle'));
}

/* ------------------------------------------------------------------
   The next page's CSS. Home carries its CSS inside the page; every other
   page links one shared file, which the build names here in a
   <meta name="later-css"> (scripts/head.mjs). Once Home has loaded and
   the browser is idle, ask for that file quietly: the next page then
   finds it in the browser's cache and shows at once.
   Chrome, Edge and Firefox keep a fetched file for the next page's
   <link>; the CSP needs nothing new for a fetch. Safari doesn't keep it
   (seen in WebKit 27.2, November 17, 2026) but does keep one asked for
   as a preload. Safari is also the one without <link rel="prefetch">,
   which is how the script tells which to use.
   ------------------------------------------------------------------ */
const laterCss = /** @type {HTMLMetaElement | null} */ ($('meta[name="later-css"]'));
if (laterCss) {
  const href = laterCss.content;
  const ask = () => {
    const link = document.createElement('link');
    if (link.relList.supports('prefetch')) void window.fetch(href, { priority: 'low' }).catch(() => {});
    else document.head.append(Object.assign(link, { rel: 'preload', as: 'style', href }));
  };
  const idle = () => (window.requestIdleCallback ? window.requestIdleCallback(ask) : window.setTimeout(ask, 2000));
  if (document.readyState === 'complete') idle();
  else window.addEventListener('load', idle, { once: true });
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
  // scroll that has been still for 150ms has ended
  const forgetAim = () => {
    aim = null;
  };
  if ('onscrollend' in window) svcRow.addEventListener('scrollend', forgetAim);
  else {
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    let quiet; // (window is "never" here to the type check, which knows only browsers with scrollend)
    svcRow.addEventListener(
      'scroll',
      () => {
        clearTimeout(quiet);
        quiet = setTimeout(forgetAim, 150);
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
  // keyboard focus only (above)
  svcRow.addEventListener('focusin', (e) => {
    if (row.matches && /** @type {Element} */ (e.target).matches(':focus-visible'))
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
