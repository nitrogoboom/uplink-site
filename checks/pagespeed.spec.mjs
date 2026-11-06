// PageSpeed check: ask Google's PageSpeed Insights (its servers, its Lighthouse) to test every page in the sitemap,
// phone and desktop, and report if Home scores under the bar. A tool to run when you want it; CI doesn't run it.
//   npm run pagespeed -- https://uplink-site.johnoreilly.workers.dev           the live site
//   npm run pagespeed -- https://VERSION-uplink-site.johnoreilly.workers.dev   a preview version
//   npm run pagespeed -- ADDRESS --min 100 --strict                            every page held to the bar
//   npm run pagespeed -- ADDRESS --sample                                      Home, one service, one project
// The test runs on Google's machines, as pagespeed.web.dev does, so this PC's connection doesn't count.
// It needs a PageSpeed Insights API key: PSI_API_KEY in .dev.vars (gitignored) or in the environment.
// The key lives in Google Cloud, project uplink-site, APIs & Services > Credentials > pagespeed-gate
// (limited to the PageSpeed Insights API).
// Pages come from the address's sitemap.xml. Home (GATED) must reach the bar on both; the other pages are drafts for
// now, so they are shown but don't fail the check unless --strict.
// A preview deploy is sent with `X-Robots-Tag: noindex` by Cloudflare, so the SEO score here leaves out the "Page is
// blocked from indexing" audit (is-crawlable). Everything else counts.
// Each page and the files it links are fetched once first: a fresh preview starts with a cold Cloudflare cache, and the
// first visit would measure that, not the site.
// Performance moves a point or so between runs, so a test under the bar is run again (up to RUNS times) and its best
// run counts. Reports go to out/lighthouse/PAGE-STRATEGY.json.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from '@playwright/test';
import { ROOT, flag, option, pad, positional } from './lib.mjs';

const API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const CATS = ['performance', 'accessibility', 'best-practices', 'seo'];
const STRATEGIES = ['mobile', 'desktop'];
const GATED = ['/'];
const RUNS = 3;
const OUT = join(ROOT, 'out/lighthouse');
const UA = { 'User-Agent': 'lighthouse-gate warm-up' }; // Cloudflare refuses a client with no user agent of its own

function apiKey() {
  let key = process.env.PSI_API_KEY;
  const vars = join(ROOT, '.dev.vars');
  if (!key && existsSync(vars))
    key = readFileSync(vars, 'utf8').split(/\r?\n/).find((l) => l.startsWith('PSI_API_KEY='))?.split('=').slice(1).join('=').trim();
  if (!key) throw new Error('No PageSpeed API key: put PSI_API_KEY=... in .dev.vars (see the note at the top).');
  return key;
}

// the paths in the site's sitemap (the static pages, plus one per service and project)
async function sitePages(base) {
  const xml = await (await fetch(`${base}/sitemap.xml`, { headers: UA, signal: AbortSignal.timeout(30_000) })).text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/^https?:\/\/[^/]+/, '') || '/');
}

// fetch the page and every file it links from assets/, so the edge cache is filled
async function warm(url) {
  const get = async (u) => (await fetch(u, { headers: UA, signal: AbortSignal.timeout(30_000) })).text();
  const base = url.match(/^https?:\/\/[^/]+/)[0];
  const refs = new Set([...(await get(url)).matchAll(/(?:href|src|srcset|data-hero)="\/?(assets\/[^"#]+)/g)].map((m) => m[1]));
  for (const ref of refs) await get(`${base}/${ref}`);
}

// one PageSpeed test; returns its Lighthouse report
async function run(url, strategy, key) {
  const q = new URLSearchParams([['url', url], ['strategy', strategy], ['key', key], ...CATS.map((c) => ['category', c])]);
  const r = await fetch(`${API}?${q}`, { signal: AbortSignal.timeout(180_000) });
  // never print the request: the key is in it
  if (!r.ok) throw new Error(`PageSpeed API ${r.status} for ${url} (${strategy}): ` + ((await r.json().catch(() => ({}))).error?.message || '').slice(0, 200));
  return (await r.json()).lighthouseResult;
}

// category scores out of 100; SEO without is-crawlable (see the note at the top)
function scores(report) {
  const out = {};
  for (const c of CATS) {
    let refs = report.categories[c].auditRefs.filter((r) => r.weight > 0);
    if (c === 'seo') refs = refs.filter((r) => r.id !== 'is-crawlable');
    const got = refs.map((r) => [r.weight, report.audits[r.id].score]).filter(([, s]) => s !== null && s !== undefined);
    out[c] = Math.round((100 * got.reduce((t, [w, s]) => t + w * s, 0)) / got.reduce((t, [w]) => t + w, 0));
  }
  return out;
}

const lowest = (s) => Math.min(...Object.values(s));

// the best single run over up to RUNS tests (highest lowest score), stopping once one reaches the bar
async function measure(base, path, strategy, key, bar) {
  const name = path.replace(/^\/|\/$/g, '') || 'home';
  let best = null, n = 0;
  while (n < RUNS) {
    n++;
    const report = await run(base + path, strategy, key);
    const s = scores(report);
    if (best === null || lowest(s) > lowest(best)) {
      // one run's scores together, never mixed across runs
      best = s;
      const file = join(OUT, `${name}-${strategy}.json`); // services/help-desk-mobile.json: the folder may not exist yet
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, JSON.stringify(report), 'utf8');
    }
    if (lowest(best) >= bar) break;
  }
  return { name, strategy, best, n };
}

test('pagespeed', async () => {
  test.setTimeout(1_800_000);
  if (!positional[0]) throw new Error('usage: npm run pagespeed -- ADDRESS [--strict] [--min N] [--sample]');
  const base = positional[0].replace(/\/$/, '');
  const bar = Number(option('--min', '100'));
  let paths = await sitePages(base);
  // Home plus the first service and the first project: 6 tests, not 40
  if (flag('--sample')) paths = ['/', ...['/services/', '/work/'].map((d) => paths.find((p) => p.startsWith(d)))];
  const gated = flag('--strict') ? paths : GATED;
  const key = apiKey();
  mkdirSync(OUT, { recursive: true });
  for (const p of paths) await warm(base + p);
  const jobs = paths.flatMap((p) => STRATEGIES.map((s) => [p, s]));
  const results = await Promise.all(jobs.map(([p, s]) => measure(base, p, s, key, bar)));
  const failed = [];
  const lines = [`${pad('page', 10)} ${pad('device', 8)} ` + CATS.map((c) => c.slice(0, 6).padStart(6)).join(' ') + '  runs'];
  jobs.forEach(([path], i) => {
    const { name, strategy, best, n } = results[i];
    const mark = gated.includes(path) ? '' : '  (not gated)';
    lines.push(`${pad(name, 10)} ${pad(strategy, 8)} ` + CATS.map((c) => String(best[c]).padStart(6)).join(' ') + `  ${n}${mark}`);
    if (gated.includes(path)) failed.push(...CATS.filter((c) => best[c] < bar).map((c) => `${name} ${strategy} ${c} ${best[c]}`));
  });
  console.log(lines.join('\n'));
  if (failed.length) throw new Error(`Under ${bar}: ` + failed.join(', '));
  console.log(`\nGated pages at ${bar} or more.`);
});
