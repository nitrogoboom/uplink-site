/* ==========================================================================
   Uplink Technology · footer (every page)
   Hero-select roster and campus map.
   ========================================================================== */

import { $, $$, html, reduceMotion, replay, toast, whenOnScreen } from './core.js';
import { MEDIA } from '../lib/media.js';

/* ======================================================================
   Footer: hero-select roster + campus map (every page)
   Each roster tile shows one panel. The panel's data-map names a spot on
   the map (hq, services, company, support, resources, follow) and
   data-map-name / data-map-sub the words of the map's label; the camera
   flies there and lights it up. The map is drawn by tools/gen_campus.py:
   each spot's group carries its camera (data-vb, a viewBox) and the
   marker's point (data-mk), and the spot's group, route and ring share
   its data-k.
   ====================================================================== */
const MAP_MOVE = 700;   // ms the map's camera takes to fly to a tab's spot
const fc = $('.fc');
if (fc) {
  const mapBox = $('[data-fc-map]', fc);
  const hud = $('.fc-hud', fc);
  const nums = (s) => s.split(' ').map(Number);
  // The map (about 30 KB of SVG, 290-odd shapes) is fetched when the footer comes within a screen or so of view,
  // not at load: most visits never reach the footer. Its box keeps its size in CSS, so nothing moves when it lands.
  let svg = null, marker = null, shown = null;
  let vb = [], mk = [0, 0], raf = 0;
  const build = () => window.fetch(mapBox.dataset.fcMap)
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
    .then((text) => {
      mapBox.insertAdjacentHTML('afterbegin', html(text));
      svg = $('svg.fc-w', mapBox); marker = $('.mk', svg);
      vb = nums(svg.getAttribute('viewBox'));
      focusMap(shown, true);
      // the map's looping animations pause while it is off screen; the moving dashes start the first time it shows
      whenOnScreen(svg, (on) => { if (on) svg.classList.add('is-seen'); });
    })
    .catch(() => { /* no map: the panels and the label still work */ });

  const paint = () => {
    svg.setAttribute('viewBox', vb.map((n) => n.toFixed(1)).join(' '));
    marker.setAttribute('transform', `translate(${mk[0].toFixed(1)} ${mk[1].toFixed(1)})`);
  };
  // the label names the panel's spot at once; once the map is in, the spot lights up and the camera flies there
  const focusMap = (panel, instant) => {
    shown = panel;
    $('b', hud).textContent = panel.dataset.mapName;
    $('small', hud).textContent = panel.dataset.mapSub;
    if (!svg) return;   // not in yet: build() shows this spot when it is
    const spot = $(`.dist[data-k="${panel.dataset.map}"]`, svg) || $('.dist[data-k="hq"]', svg);
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

  // roster: tabs with arrow keys, plus the two key-cap buttons
  const tabs = $$('.fc-tile', fc);
  const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
  const roster = $('.fc-roster', fc), home = $('#fc-panels', fc);
  let cur = Math.max(0, tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true'));
  const phone = window.matchMedia(MEDIA.phone);
  let rows = false;   // phones: the tiles are rows that open their panel right under them (no map)
  const select = (i, opts = {}) => {
    if (rows) return;
    cur = (i + tabs.length) % tabs.length;
    tabs.forEach((t, j) => { t.setAttribute('aria-selected', String(j === cur)); t.tabIndex = j === cur ? 0 : -1; });
    panels.forEach((p, j) => { p.classList.toggle('is-on', j === cur); if (j !== cur || opts.instant) p.classList.remove('is-in'); });
    if (!opts.instant) replay(panels[cur], 'is-in');   // the new panel slides in (again, if it was already showing)
    const t = tabs[cur];
    const centre = () => roster.scrollTo({ left: t.offsetLeft - (roster.clientWidth - t.offsetWidth) / 2, behavior: opts.instant || reduceMotion.matches ? 'auto' : 'smooth' });
    // on page load the first tab is already in view (the roster starts at the left), so nothing to measure;
    // measuring during load would force an extra layout pass
    if (!opts.instant) centre(); else if (cur > 0) window.requestAnimationFrame(() => window.setTimeout(centre));
    if (opts.focus) t.focus({ preventScroll: true });
    focusMap(panels[cur], opts.instant);
  };
  // Tab from the tiles goes on into the chosen panel (the tabs come first in the markup); Enter or Space (a click
  // with detail 0) jumps straight there too
  tabs.forEach((t, i) => t.addEventListener('click', (e) => {
    if (rows) { toggle(i); return; }
    select(i);
    if (e.detail === 0) panels[i].focus();
  }));
  roster.addEventListener('keydown', (e) => {
    if (rows) return;
    const map = { ArrowRight: cur + 1, ArrowLeft: cur - 1, Home: 0, End: tabs.length - 1 };
    if (!(e.key in map)) return;
    e.preventDefault();
    select(map[e.key], { focus: true });
  });
  $$('[data-fc-step]', fc).forEach((b) => b.addEventListener('click', () => select(cur + Number(b.dataset.fcStep), { focus: false })));

  // Phones: one row open at a time, or none. Opening a row closes the one above it, which would pull the tapped row
  // up the screen; the page scrolls by the same amount so the row stays under the finger.
  const toggle = (i) => {
    const open = tabs[i].getAttribute('aria-expanded') !== 'true';
    const y0 = tabs[i].getBoundingClientRect().top;
    tabs.forEach((t, j) => t.setAttribute('aria-expanded', String(open && j === i)));
    panels.forEach((p, j) => { p.hidden = !(open && j === i); p.classList.toggle('is-on', open && j === i); p.classList.remove('is-in'); });
    if (open) { cur = i; replay(panels[i], 'is-in'); }
    const dy = tabs[i].getBoundingClientRect().top - y0;
    if (dy) window.scrollBy({ top: dy, behavior: 'instant' });
  };
  // Switch between tabs (tablet, desktop) and rows (phones). Rows: each panel moves in under its row, the tablist
  // roles come off and each row says whether it is open; all start closed. Tabs: the panels go back, cur shows.
  const layout = (instant) => {
    rows = phone.matches;
    fc.classList.toggle('fc-rows-mode', rows);
    if (rows) {
      roster.removeAttribute('role');
      tabs.forEach((t, i) => {
        t.removeAttribute('role'); t.removeAttribute('aria-selected'); t.tabIndex = 0;
        t.setAttribute('aria-expanded', 'false');
        panels[i].setAttribute('role', 'region');
        panels[i].hidden = true; panels[i].classList.remove('is-on', 'is-in');
        t.after(panels[i]);
      });
    } else {
      roster.setAttribute('role', 'tablist');
      tabs.forEach((t, i) => {
        t.setAttribute('role', 'tab'); t.removeAttribute('aria-expanded');
        panels[i].setAttribute('role', 'tabpanel'); panels[i].hidden = false;
        home.append(panels[i]);
      });
      select(cur, { instant });
    }
  };

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

  // the CSS keys on html.js (set in each page's head, before paint); fc-js only says this script ran
  fc.classList.add('fc-js');
  layout(true);
  phone.addEventListener('change', () => layout(true));
  // the map is fetched when its box comes within a screen of view; phones hide the box (footer.css), so they never
  // fetch it, and a phone turned past 700 px fetches it then
  if ('IntersectionObserver' in window) {
    const near = new IntersectionObserver(([en]) => { if (en.isIntersecting) { near.disconnect(); build(); } }, { rootMargin: '100% 0px' });
    near.observe(mapBox);
  } else if (!phone.matches) build();
}
