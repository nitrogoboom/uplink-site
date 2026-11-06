// Link check against the built site: every link, picture, script, stylesheet and preload on every page must answer,
// and a link to a #section must find that id on the page it points to. CI runs it after the site check.
// usage: npm run verify:links [-- --base URL] [--external]   (--external also asks each outside address; slower, not in CI)
// Pages: the served sitemap.xml plus /soon and the 404 page (lib.mjs). Fragments on /soon are not checked: that page
// reads the #address itself (soon.js) to say which page isn't built yet. Fails on any broken address.
// The HTML is parsed by the browser's own parser (DOMParser), so no page script runs and nothing is loaded.
import { test } from '@playwright/test';
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

// [status, body or null]. The 404 page's own address answers 404 on purpose; its body still counts.
async function fetchPage(url) {
  try {
    const r = await get(url);
    if (!r.ok) return [r.status, null];
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
    const [status, body] = await fetchPage(BASE + path);
    if (body === null) {
      if (!path.endsWith(MISSING)) fails.push(`${path}: the page itself answered ${status}`);
      continue;
    }
    const p = await page.evaluate(PARSE, body);
    ids.set(new URL(BASE + path).pathname, new Set(p.ids));
    for (const ref of p.refs) {
      if (/^(mailto|tel|data|javascript):/.test(ref)) continue;
      const full = new URL(ref, BASE + path);
      const url = strip(full);
      if (!found.has(url)) found.set(url, new Set());
      found.get(url).add(path);
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
