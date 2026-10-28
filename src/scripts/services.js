/* ==========================================================================
   Uplink Technology · Services page
   Service picker: the tiles show one service at a time.
   ========================================================================== */

import { $, $$, html, reduceMotion, registerPicker } from './core.js';

/* ======================================================================
   Services picker (Services page)
   Every service is an <article data-svc> in the HTML. The tiles show
   one at a time; without script they all stack (see site.css).
   ====================================================================== */
const pickerEl = $('[data-picker]');
const svcs = pickerEl ? $$('[data-svc]', pickerEl) : [];
if (svcs.length) {
  // Counts and tiles come from the sections, so adding a service is one more <article data-svc data-tile="...">.
  const two = (n) => String(n).padStart(2, '0');
  svcs.forEach((s, i) => $$('[data-svc-n]', s).forEach((c) => { c.textContent = 'Service ' + two(i + 1) + ' of ' + two(svcs.length); }));
  const keys = $('[data-svc-keys]', pickerEl);
  if (keys) keys.textContent = '· press 1 to ' + Math.min(9, svcs.length);
  $$('[data-svc-max]').forEach((k) => { k.textContent = Math.min(9, svcs.length); });
  const roster = $('[data-roster]', pickerEl);
  if (roster) {
    roster.innerHTML = html(svcs.map((s, i) => '<li><button class="tile" type="button" data-pick="' + i + '" aria-controls="' + s.id +
      '" aria-pressed="' + s.classList.contains('is-on') + '"><span class="tile-n">' + two(i + 1) + '</span><span class="tile-t">' +
      (s.dataset.tile || $('h2', s).textContent) + '</span></button></li>').join(''));
  }
  const tiles = $$('[data-pick]', pickerEl);
  const live = $('[data-picker-live]', pickerEl);
  let current = Math.max(0, svcs.findIndex((s) => s.classList.contains('is-on')));

  const select = (i, opts = {}) => {
    if (i === current || !svcs[i]) return;
    current = i;
    const name = $('h2', svcs[i]).textContent;
    svcs.forEach((s, j) => s.classList.toggle('is-on', j === i));
    tiles.forEach((t, j) => t.setAttribute('aria-pressed', String(j === i)));
    $$('[data-service-cta]', pickerEl).forEach((b) => { b.dataset.service = name; });
    if (live) live.textContent = name + ' selected';
    if (opts.focus) tiles[i].focus({ preventScroll: true });
    if (opts.hash !== false && window.history && history.replaceState) {
      try { history.replaceState(null, '', '#' + svcs[i].id); } catch { /* ignore */ }
    }
  };

  tiles.forEach((t) => t.addEventListener('click', () => select(Number(t.dataset.pick))));

  const fromHash = () => {
    let id = '';
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return -1; }
    return svcs.findIndex((s) => s.id === id);
  };
  const start = fromHash();
  if (start >= 0 && start !== current) {
    select(start, { hash: false });
    pickerEl.scrollIntoView({ block: 'start' });
  }
  window.addEventListener('hashchange', () => {
    const i = fromHash();
    if (i < 0) return;
    select(i, { hash: false });
    pickerEl.scrollIntoView({ block: 'start', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  });

  registerPicker({ select, count: svcs.length });
}
