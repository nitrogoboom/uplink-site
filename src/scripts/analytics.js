/* ==========================================================================
   Uplink Technology · Cloudflare Web Analytics (every page, built site only)
   Cloudflare's "manual setup": the site loads the beacon itself, so Cloudflare
   never rewrites a page to add it (that slowed the first paint and dropped the
   ETag: docs/ops.md, "Domain"). It starts only once the page has loaded, has
   painted, and the browser is idle: fetched any earlier, it shares a slow
   phone's connection with the page, and PageSpeed (which sees "load" land at
   the first paint) counts it against the first paint, 0.2 to 0.45 s. It still
   reports the whole load, from the browser's own timings. No cookies or
   storage. The CSP allows its two hosts (public/_headers); Trusted Types lets
   in only this address (core.js). The token is public: it names the
   jodesign.ca site in Cloudflare.
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

// Safari has no requestIdleCallback: a short wait does the same job there.
const whenIdle = () =>
  'requestIdleCallback' in window ? requestIdleCallback(start, { timeout: 5000 }) : setTimeout(start, 1500);

/** Once the page has painted something (the browser's own first-contentful-paint entry). */
function afterPaint() {
  if (performance.getEntriesByName('first-contentful-paint').length) return whenIdle();
  const seen = new PerformanceObserver(() => {
    seen.disconnect();
    whenIdle();
  });
  seen.observe({ type: 'paint', buffered: true });
}

if (import.meta.env.PROD) {
  if (document.readyState === 'complete') afterPaint();
  else window.addEventListener('load', afterPaint, { once: true });
}
