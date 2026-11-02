/* ==========================================================================
   Uplink Technology · Our work page
   Filters. Each card links to its project's own page.
   ========================================================================== */

import { $, $$ } from './core.js';

/* ======================================================================
   Work: filters
   ====================================================================== */
const workGrid = $('[data-work-grid]');
if (workGrid) {
  const items = $$('[data-tags]', workGrid);
  const filters = $$('[data-filter]');
  const liveCount = $('[data-work-live]');
  const empty = $('[data-work-empty]');

  filters.forEach((btn) => btn.addEventListener('click', () => {
    const f = btn.dataset.filter;
    filters.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    let shown = 0;
    items.forEach((li) => {
      const on = f === 'all' || li.dataset.tags.split(' ').includes(f);
      li.hidden = !on;
      if (on) shown += 1;
    });
    if (empty) empty.hidden = shown > 0;
    if (liveCount) liveCount.textContent = 'Showing ' + shown + (shown === 1 ? ' project' : ' projects');
  }));
}
