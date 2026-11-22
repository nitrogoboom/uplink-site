/* ==========================================================================
   Uplink Technology · Cloudflare Web Analytics (every page, built site only)
   Cloudflare's "manual setup": the site loads the beacon itself, so Cloudflare
   never rewrites a page to add it (that slowed the first paint and dropped the
   ETag: docs/ops.md, "Domain"). It starts after the page has loaded, not with
   it: on a slow phone, fetching it early took bandwidth from the page and
   pushed the first paint back 0.2 to 0.45 s. It still reports the load, from
   the browser's own timings. No cookies or storage. The CSP allows its two
   hosts (astro.config.mjs); Trusted Types lets in only this address (core.js).
   The token is public: it names the jodesign.ca site in Cloudflare.
   ========================================================================== */

import { BEACON, scriptURL } from './core.js';

const TOKEN = '6169396cdfc244dd9a084dbf544fbafe';

function start() {
  const s = document.createElement('script');
  s.defer = true;
  s.dataset.cfBeacon = JSON.stringify({ token: TOKEN });
  s.src = /** @type {string} */ (scriptURL(BEACON));
  document.body.append(s);
}

if (import.meta.env.PROD) {
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
}
