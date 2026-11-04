/* ==========================================================================
   Uplink Technology · placeholder page
   Names the page that is not built yet.
   ========================================================================== */

import { $ } from './core.js';

/* ======================================================================
   Placeholder page: name the page that is missing (soon.html#client-portal)
   ====================================================================== */
const soonName = $('[data-soon-name]');
if (soonName) {
  const names = {
    'client-portal': 'The client portal', 'remote-support': 'Remote support', 'system-status': 'System status',
    'careers': 'Careers', 'blog': 'The blog', 'terms': 'The terms of service',
    'windows-10-guide': 'The Windows 10 upgrade guide',
    'security-checklist': 'The security checklist', 'social': 'Our social channels', 'francais': 'The French site'
  };
  const baseTitle = document.title;
  const showName = () => {
    const key = location.hash.slice(1);
    const known = Object.prototype.hasOwnProperty.call(names, key);
    soonName.textContent = known ? names[key] : 'This page';
    document.title = known ? names[key] + ' · Coming soon' : baseTitle;
  };
  showName();
  window.addEventListener('hashchange', showName);
}
