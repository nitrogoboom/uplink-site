// Link check against the built site: every link, picture, script, stylesheet and preload on every page must answer,
// and a link to a #section must find that id on the page it points to. CI runs it after the site check.
// usage: npm run verify:links [-- --base URL] [--external]   (--external also asks each outside address; slower, not in CI)
// Pages: every built page (dist/), the 404 page's links included, after checking the served sitemap.xml lists them (lib.mjs). Fragments on /soon are not checked: that page
// reads the #address itself (soon.js) to say which page isn't built yet. Fails on any broken address.
// The HTML is parsed by the browser's own parser (DOMParser), so no page script runs and nothing is loaded.
// A second test checks that resting on a link prefetches its page (Speculation Rules), below.
import { expect, test } from '@playwright/test';
import { BASE, MISSING, flag, get, pages } from './lib.mjs';

const EXTERNAL = flag('--external');
const NO_FRAGMENTS = ['/soon']; // pages that read the #address themselves

// every address a page points at and every id it has (template contents too)
const PARSE = (html) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const refs = [], ids = [];
  const visit = (root) => {
    for (const e of root.querySelectorAll('*')) {
      if (e.id) ids.push(e.id);
      for (const key of ['href', 'src', 'data-hero', 'data-hero-tablet', 'data-hero-phone', 'data-fc-map']) {
        const v = e.getAttribute(key);
        if (v && !(e.tagName === 'LINK' && ['canonical', 'alternate'].includes(e.getAttribute('rel')) && key === 'href')) refs.push(v);
      }
      const set = e.getAttribute('srcset');
      if (set && !set.startsWith('data:')) refs.push(...set.split(',').map((p) => p.trim()).filter(Boolean).map((p) => p.split(' ')[0])); // a data: address has commas of its own
      if (e.tagName === 'TEMPLATE') visit(e.content);
    }
  };
  visit(doc);
  return { refs, ids };
};

// [status, body or null]. The 404 page's own address answers 404 on purpose (missing: true); its body still counts.
async function fetchPage(url, missing = false) {
  try {
    const r = await get(url);
    if (!r.ok && !(missing && r.status === 404)) return [r.status, null];
    return [r.status, (r.headers.get('content-type') || '').includes('html') ? await r.text() : null];
  } catch (e) {
    return [String(e.cause?.message || e.message).slice(0, 80), null]; // DNS, refused, timeout
  }
}

const strip = (u) => { const x = new URL(u); x.hash = ''; return x.href; };

test('links answer', async ({ page }) => {
  test.setTimeout(600_000);
  const host = new URL(BASE).host;
  const found = new Map(); // address without #fragment -> pages that point at it
  const frags = new Map(); // 'address#fragment' -> [address, fragment, pages]
  const ids = new Map(); // page path -> its ids
  const fails = [];
  for (const path of await pages(BASE)) {
    const [status, body] = await fetchPage(BASE + path, path.endsWith(MISSING));
    if (body === null) {
      fails.push(`${path}: the page itself answered ${status}${path.endsWith(MISSING) ? ' (the 404 page should answer 404, as HTML)' : ''}`);
      continue;
    }
    const p = await page.evaluate(PARSE, body);
    ids.set(new URL(BASE + path).pathname, new Set(p.ids));
    for (const ref of p.refs) {
      if (/^(mailto|tel|data|javascript):/.test(ref)) continue;
      const full = new URL(ref, BASE + path);
      const url = strip(full);
      // the 404 page's own address (its skip link's #main): fetched above, and answering 404 is its job
      const self = path.endsWith(MISSING) && url === strip(BASE + path);
      if (!self && !found.has(url)) found.set(url, new Set());
      if (!self) found.get(url).add(path);
      const frag = full.hash.slice(1);
      if (frag && full.host === host) {
        const k = url + '#' + frag;
        if (!frags.has(k)) frags.set(k, [url, decodeURIComponent(frag), new Set()]);
        frags.get(k)[2].add(path);
      }
    }
  }
  let outside = 0;
  for (const url of [...found.keys()].sort()) {
    const where = [...found.get(url)].sort();
    if (new URL(url).host !== host) {
      outside++;
      if (!EXTERNAL) continue;
    }
    const [status, body] = await fetchPage(url);
    if (status !== 200) fails.push(`${url} answered ${status} (on ${where.slice(0, 3).join(', ')})`);
    else if (body !== null && !ids.has(new URL(url).pathname)) ids.set(new URL(url).pathname, new Set((await page.evaluate(PARSE, body)).ids));
  }
  for (const k of [...frags.keys()].sort()) {
    const [url, frag, where] = frags.get(k);
    const path = new URL(url).pathname;
    if (NO_FRAGMENTS.includes(path.replace(/\/$/, '')) || !ids.has(path)) continue;
    if (!ids.get(path).has(frag)) fails.push(`${path}#${frag}: no id "${frag}" on that page (linked from ${[...where].sort().slice(0, 3).join(', ')})`);
  }
  console.log(`${found.size} addresses (${outside} outside the site${EXTERNAL ? '' : ', not asked'}), ${frags.size} #section links`);
  console.log(fails.length ? `links: ${fails.length} broken` : 'links: all good');
  if (fails.length) throw new Error(fails.map((f) => 'FAIL ' + f).join('\n'));
});

// Speculation Rules (public/_headers, public/speculation-rules.json; review L12): a pointer resting on a link to one of
// our pages fetches it in the background, under the site's own CSP, and the click is then served from that fetch. A
// link to /api/ or to a .md copy is never fetched that way. Chromium's background fetches don't show as page
// requests, so they're read from the browser's own network log (DevTools protocol).
test('a link rested on is prefetched, and the click uses it; /api/ and .md links are not', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  const prefetched = [];
  cdp.on('Network.requestWillBeSent', (e) => {
    const purpose = Object.entries(e.request.headers).find(([k]) => k.toLowerCase() === 'sec-purpose')?.[1] || '';
    if (purpose.includes('prefetch')) prefetched.push(new URL(e.request.url).pathname);
  });
  const blocked = [];
  page.on('console', (m) => { if (/Content.Security.Policy|speculation/i.test(m.text())) blocked.push(m.text()); });
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  // links of our own, above everything, so each can be hovered where it is
  await page.evaluate((hrefs) => {
    const box = document.createElement('div');
    Object.assign(box.style, { position: 'fixed', top: '0', left: '0', zIndex: '2147483647', background: 'white' });
    for (const href of hrefs) {
      const a = document.createElement('a');
      a.href = href;
      a.textContent = href;
      a.dataset.check = href;
      Object.assign(a.style, { display: 'block', padding: '12px' });
      box.append(a);
    }
    document.body.append(box);
  }, ['/api/report', '/services.md', '/about']);
  for (const href of ['/api/report', '/services.md']) {
    await page.hover(`[data-check="${href}"]`);
    await page.waitForTimeout(600);   // moderate: 200 ms of rest starts a prefetch
  }
  await page.hover('[data-check="/about"]');
  await expect.poll(() => prefetched, { timeout: 10_000, message: 'resting on /about prefetches it' }).toContain('/about');
  expect(prefetched.filter((p) => p.startsWith('/api/') || p.endsWith('.md')), '/api/ and .md links are not prefetched').toEqual([]);
  expect(blocked, 'no CSP or speculation rules complaint').toEqual([]);
  await page.click('[data-check="/about"]');
  await page.waitForURL(`${BASE}/about`);
  expect(await page.evaluate(() => performance.getEntriesByType('navigation')[0].deliveryType), 'the click is served from the prefetch').toBe('navigational-prefetch');
});
