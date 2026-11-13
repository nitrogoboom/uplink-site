/* ==========================================================================
   Uplink Technology · placeholder page
   Names the page that is not built yet.
   ========================================================================== */

import { $, words } from './core.js';
import { fill } from '../lib/fill.js';

/* ======================================================================
   Placeholder page: name the page that is missing (soon.html#client-portal)
   ====================================================================== */
const soonName = $('[data-soon-name]');
if (soonName) {
  // the pages' names by the address's #part, and the title they go in: src/data/copy/en/soon.yaml
  const { names: byHash, pageTitle } = /** @type {import('../lib/copy').SoonWords} */ (words('words-page'));
  /** @type {Record<string, string>} */
  const names = byHash;
  const fallback = soonName.textContent; // "This page", as the markup has it
  const baseTitle = document.title;
  const showName = () => {
    const key = location.hash.slice(1);
    const known = Object.prototype.hasOwnProperty.call(names, key);
    soonName.textContent = known ? names[key] : fallback;
    document.title = known ? fill(pageTitle, { name: names[key] }) : baseTitle;
  };
  showName();
  window.addEventListener('hashchange', showName);
}
