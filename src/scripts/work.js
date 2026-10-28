/* ==========================================================================
   Uplink Technology · Our work page
   Filters and the project pop-up.
   ========================================================================== */

import { Uplink } from './core.js';

const { $, $$, openDialog, shortcutsOn } = Uplink;

/* ======================================================================
   Work: filters + project pop-up
   ====================================================================== */
// Each card names its project (data-case); the <article id="case-<name>"> further down the page holds the
// full story and the pop-up copies that article's text in, so the HTML stays the only source. The card's
// href is the project's own page, where the link goes without script.
const workGrid = $('[data-work-grid]');
if (workGrid) {
  const items = $$('[data-tags]', workGrid);
  const cards = items.map((li) => $('a[data-case]', li));
  const sources = cards.map((a) => a && document.getElementById('case-' + a.dataset.case));
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

  const dlg = document.getElementById('case-dialog');
  let open = -1;
  const visible = () => items.map((li, i) => (li.hidden ? -1 : i)).filter((i) => i >= 0);

  const fill = (i) => {
    const src = sources[i];
    if (!src || !dlg) return;
    open = i;
    $$('[data-case-bind]', dlg).forEach((el) => {
      const field = $('[data-case-field="' + el.dataset.caseBind + '"]', src);
      el.textContent = field ? field.textContent : '';
    });
    const im = $('[data-case-img]', dlg), srcImg = $('img', src);
    if (im && srcImg) { im.src = srcImg.getAttribute('src'); im.alt = srcImg.alt; }
    const cut = $('[data-case-src]', dlg);   // the compact cut used on smaller screens
    if (cut && srcImg && srcImg.dataset.compact) cut.srcset = srcImg.dataset.compact;   // stamped link, from 2-details.html
    const link = $('[data-case-link]', dlg);
    if (link) link.href = '/work/' + cards[i].dataset.case;
    const list = visible();
    const pos = $('[data-case-pos]', dlg);
    if (pos) pos.textContent = (list.indexOf(i) + 1) + ' of ' + list.length;
  };
  const step = (d) => {
    const list = visible();
    if (!list.length) return;
    const at = Math.max(0, list.indexOf(open));
    fill(list[(at + d + list.length) % list.length]);
  };

  cards.forEach((a, i) => {
    if (!a || !sources[i] || !dlg) return;
    a.addEventListener('click', (e) => { e.preventDefault(); fill(i); openDialog('case-dialog', a); });
  });
  if (dlg) {
    $$('[data-case-step]', dlg).forEach((b) => b.addEventListener('click', () => step(Number(b.dataset.caseStep))));
    dlg.addEventListener('keydown', (e) => {
      if (!shortcutsOn() || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    });
  }
}
