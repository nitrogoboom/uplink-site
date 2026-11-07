/* ==========================================================================
   Uplink Technology · footer (every page)
   The campus map, and the newsletter mockup. The sections themselves are
   <details name="footer"> (Footer.astro): the browser opens and shuts them,
   and footer.css lays them out. Nothing here moves or relabels them.
   ========================================================================== */

import { $, $$, html, reduceMotion, toast, whenOnScreen } from './core.js';
import { MEDIA } from '../lib/media.js';

/* ======================================================================
   Campus map (tablet and desktop; phones hide it). Decoration only.
   Each section's data-map names a spot on the map (hq, services, company,
   support, resources, follow); the map's label is in the markup and CSS
   shows the open section's words. Here the camera flies to the spot and
   lights it up whenever a section opens or shuts (the toggle event). With
   nothing open, Contact shows (footer.css), so its spot does too. The map
   is drawn by tools/gen_campus.py: each spot's group carries its camera
   (data-vb, a viewBox) and the marker's point (data-mk), and the spot's
   group, route and ring share its data-k.
   ====================================================================== */
const MAP_MOVE = 700;   // ms the map's camera takes to fly to a section's spot
const fc = $('.fc');
if (fc) {
  const mapBox = $('[data-fc-map]', fc);
  const sections = $$('.fc-sec', fc);
  const shown = () => sections.find((d) => d.open) || sections[0];
  const nums = (s) => s.split(' ').map(Number);
  // The map (about 30 KB of SVG, 290-odd shapes) is fetched when the footer comes within a screen or so of view,
  // not at load: most visits never reach the footer. Its box keeps its size in CSS, so nothing moves when it lands.
  let svg = null, marker = null;
  let vb = [], mk = [0, 0], raf = 0;
  const build = () => window.fetch(mapBox.dataset.fcMap)
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
    .then((text) => {
      mapBox.insertAdjacentHTML('afterbegin', html(text));
      svg = $('svg.fc-w', mapBox); marker = $('.mk', svg);
      vb = nums(svg.getAttribute('viewBox'));
      focusMap(true);
      // the map's looping animations pause while it is off screen; the moving dashes start the first time it shows
      whenOnScreen(svg, (on) => { if (on) svg.classList.add('is-seen'); });
    })
    .catch(() => { /* no map: the sections and the label still work */ });

  const paint = () => {
    svg.setAttribute('viewBox', vb.map((n) => n.toFixed(1)).join(' '));
    marker.setAttribute('transform', `translate(${mk[0].toFixed(1)} ${mk[1].toFixed(1)})`);
  };
  // the shown section's spot lights up and the camera flies there
  const focusMap = (instant) => {
    if (!svg) return;   // not in yet: build() shows the spot when it is
    const k = shown().dataset.map;
    const spot = $(`.dist[data-k="${k}"]`, svg) || $('.dist[data-k="hq"]', svg);
    $$('[data-k]', svg).forEach((el) => el.classList.toggle('on', el.dataset.k === spot.dataset.k));
    const to = nums(spot.dataset.vb), toMk = nums(spot.dataset.mk);
    window.cancelAnimationFrame(raf);
    if (instant || reduceMotion.matches) { vb = to; mk = toMk; paint(); return; }
    const v0 = vb.slice(), m0 = mk.slice(), t0 = performance.now(), dur = MAP_MOVE;
    const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur), e = ease(p);
      vb = v0.map((a, i) => a + (to[i] - a) * e);
      mk = m0.map((a, i) => a + (toMk[i] - a) * e);
      paint();
      if (p < 1) raf = window.requestAnimationFrame(step);
    };
    raf = window.requestAnimationFrame(step);
  };
  // toggle doesn't bubble: listen on the way down. Opening one section shuts the open one, so two events can come
  // in a row; both read the same open section.
  fc.addEventListener('toggle', (e) => { if (e.target.matches('.fc-sec')) focusMap(false); }, true);

  // newsletter (prototype: nothing is sent)
  const nl = $('[data-fc-nl]', fc);
  const note = nl ? $('[data-fc-nl-msg]', nl).textContent : '';
  // once marked wrong, the address clears its error as soon as it reads right, not on the next submit
  if (nl) $('input', nl).addEventListener('input', (e) => {
    if (e.target.getAttribute('aria-invalid') && e.target.checkValidity()) {
      e.target.removeAttribute('aria-invalid');
      $('[data-fc-nl-msg]', nl).textContent = note;
    }
  });
  if (nl) nl.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('input', nl), msg = $('[data-fc-nl-msg]', nl);
    if (!input.checkValidity()) {
      input.setAttribute('aria-invalid', 'true');
      msg.textContent = 'Enter an email like name@company.com.';
      input.focus();
      return;
    }
    input.removeAttribute('aria-invalid');
    msg.textContent = 'One email a month. Threats to watch and fixes that matter.';
    nl.reset();
    toast({ title: 'Subscribed', text: 'Prototype form: nothing is sent yet.' });
  });

  // the map is fetched when its box comes within a screen of view; phones hide the box (footer.css), so they never
  // fetch it, and a phone turned past 700 px fetches it then
  if ('IntersectionObserver' in window) {
    const near = new IntersectionObserver(([en]) => { if (en.isIntersecting) { near.disconnect(); build(); } }, { rootMargin: '100% 0px' });
    near.observe(mapBox);
  } else if (!window.matchMedia(MEDIA.phone).matches) build();
}
