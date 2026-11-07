// What the checks share: their command-line arguments, the pages and screen sizes, a fetch that names itself, and a
// watcher for script errors.
// pages(base): every address in the served sitemap.xml ('/' for home), then /soon and an address that gets the 404
// page. Throws if the sitemap lists fewer than five pages, so a broken sitemap can't pass a check by leaving pages out.
// SIZES: phone, tablet, 1440 x 900 and 3440 x 1440 (site, spacing and text checks).
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));

// scripts/check.mjs passes its arguments here, as JSON: `npm run verify:text -- --text 1` gives ['--text', '1']
export const ARGS = JSON.parse(process.env.CHECK_ARGS || '[]');
const VALUED = new Set(['--base', '--out', '--text', '--only', '--min', '--old']); // options that take a value
export const flag = (name) => ARGS.includes(name);
export const option = (name, fallback) => (ARGS.includes(name) ? ARGS[ARGS.indexOf(name) + 1] : fallback);
export const positional = ARGS.filter((a, i) => !a.startsWith('--') && !VALUED.has(ARGS[i - 1]));
export const BASE = option('--base', 'http://localhost:8787').replace(/\/$/, '');

export const MISSING = 'no-such-page'; // any missing address gets the 404 page
// Cloudflare refuses a client with no user agent of its own on a workers.dev address (403), so fetches name themselves
export const UA = { 'User-Agent': 'uplink-site checks' };
export const SIZES = [
  { n: 'phone', w: 390, h: 844 },
  { n: 'tablet', w: 820, h: 1180 },
  { n: '1440', w: 1440, h: 900 },
  { n: '3440', w: 3440, h: 1440 },
];

export const get = (url, init = {}) =>
  fetch(url, { ...init, headers: { ...UA, ...init.headers }, signal: AbortSignal.timeout(30_000) });

export async function pages(base) {
  const sitemap = await (await get(base + '/sitemap.xml')).text();
  const found = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/^https?:\/\/[^/]+/, '') || '/');
  if (found.length < 5) throw new Error(`sitemap.xml lists ${found.length} page(s): expected at least the five static pages`);
  return [...found, '/soon', '/' + MISSING];
}

// Chromium reports a CSP or Trusted Types block as a console error, and a script crash as a page error
export function watch(page, where, errs) {
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    // the 404 page's own status is the point of that page, not an error
    if (where.startsWith(MISSING) && m.location().url.replace(/\/$/, '').endsWith(MISSING) && m.text().includes('status of 404')) return;
    errs.push(`${where}: console: ${m.text()}`);
  });
  page.on('pageerror', (e) => errs.push(`${where}: page error: ${e}`));
}

// run fn over items, at most n at a time; results in item order
export async function lanes(items, n, fn) {
  const out = new Array(items.length);
  let next = 0;
  const lane = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, lane));
  return out;
}

// fail a test with every finding listed, not just the first
export function verdict(fails) {
  if (fails.length) throw new Error(`FAILED (${fails.length}):\n  ` + fails.join('\n  '));
}

export const pad = (s, n) => String(s).padEnd(n);
