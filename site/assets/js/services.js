/* ==========================================================================
   Uplink Technology · Services page
   Service picker: the tiles show one service at a time.
   ========================================================================== */
(() => {
  'use strict';

  const { $, $$, reduceMotion } = window.Uplink;

  /* ======================================================================
     Services picker (Services page)
     Every service is an <article data-svc> in the HTML. The tiles show
     one at a time; without script they all stack (see site.css).
     ====================================================================== */
  const pickerEl = $('[data-picker]');
  const svcs = pickerEl ? $$('[data-svc]', pickerEl) : [];
  if (svcs.length) {
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
        try { history.replaceState(null, '', '#' + svcs[i].id); } catch (e) { /* ignore */ }
      }
    };

    tiles.forEach((t) => t.addEventListener('click', () => select(Number(t.dataset.pick))));

    const fromHash = () => {
      let id = '';
      try { id = decodeURIComponent(location.hash.slice(1)); } catch (e) { return -1; }
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

    window.Uplink.picker = { select, count: svcs.length };
  }
})();
