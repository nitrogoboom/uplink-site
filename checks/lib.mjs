// What the checks share: their command-line arguments, the pages and screen sizes, a fetch that names itself, and a
// watcher for script errors.
// pages(base): every page the build wrote (dist/**/*.html, or --dist DIR), as addresses ('/' for home, /soon, and an
// address that gets the 404 page in place of /404). It also reads the served sitemap.xml and throws unless it lists
// exactly the built pages other than /soon and the 404, so a page can't drop out of the sitemap, or out of the checks,
// unnoticed.
// SIZES: phone, tablet, 1440 x 900 and 3440 x 1440 (site and spacing checks).
import { existsSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));

// scripts/check.mjs passes its arguments here, as JSON: `npm run verify -- --out DIR` gives ['--out', 'DIR']
export const ARGS = JSON.parse(process.env.CHECK_ARGS || '[]');
const VALUED = new Set(['--base', '--out', '--only', '--min', '--old', '--dist']); // options that take a value
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

export const DIST = join(ROOT, option('--dist', 'dist'));
const NOT_IN_SITEMAP = ['/soon', '/404', '/light']; // light: the light Home test copy, noindex // soon is noindex; the 404 page is served at any missing address

// the built pages' addresses: dist/index.html -> '/', dist/services/backup.html -> '/services/backup'
export function builtPages(dir = DIST) {
  if (!existsSync(join(dir, 'index.html')))
    throw new Error(`no built site in ${dir}: run npm run build first (or pass --dist DIR)`);
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) walk(join(d, e.name));
      else if (e.name.endsWith('.html'))
        out.push(
          '/' +
            relative(dir, join(d, e.name))
              .split(sep)
              .join('/')
              .replace(/(^|\/)index\.html$/, '')
              .replace(/\.html$/, ''),
        );
    }
  };
  walk(dir);
  return out.sort();
}

export async function pages(base) {
  const built = builtPages();
  const sitemap = await (await get(base + '/sitemap.xml')).text();
  const listed = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/^https?:\/\/[^/]+/, '') || '/');
  const want = built.filter((p) => !NOT_IN_SITEMAP.includes(p));
  const missing = want.filter((p) => !listed.includes(p));
  const extra = listed.filter((p) => !want.includes(p));
  if (missing.length || extra.length)
    throw new Error(
      `sitemap.xml at ${base} doesn't match the build (${DIST}): ${[...missing.map((p) => `${p} not listed`), ...extra.map((p) => `${p} listed but not built`)].join(', ')}`,
    );
  return [...listed, ...NOT_IN_SITEMAP.filter((p) => built.includes(p)).map((p) => (p === '/404' ? '/' + MISSING : p))];
}

// Chromium reports a CSP or Trusted Types block as a console error, and a script crash as a page error
export function watch(page, where, errs) {
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    // the 404 page's own status is the point of that page, not an error
    if (
      where.startsWith(MISSING) &&
      m.location().url.replace(/\/$/, '').endsWith(MISSING) &&
      m.text().includes('status of 404')
    )
      return;
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
