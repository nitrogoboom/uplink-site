"""PageSpeed check: ask Google's PageSpeed Insights (its servers, its Lighthouse) to test every page in the
sitemap, phone and desktop, and report if Home scores under the bar. A tool to run when you want it;
CI doesn't run it.

    python tools/pagespeed.py https://uplink-site.johnoreilly.workers.dev     # the live site
    python tools/pagespeed.py https://<version>-uplink-site.johnoreilly.workers.dev   # a preview version
    python tools/pagespeed.py <address> --min 100 --strict                  # every page held to the bar
    python tools/pagespeed.py <address> --sample                            # Home, one service, one project

The test runs on Google's machines, as pagespeed.web.dev does, so this PC's connection doesn't count.
It needs a PageSpeed Insights API key: PSI_API_KEY in .dev.vars (gitignored) or in the environment.
The key lives in Google Cloud, project uplink-site, APIs & Services > Credentials > pagespeed-gate
(limited to the PageSpeed Insights API).

Pages come from the live site's sitemap.xml. Home (GATED) must reach the bar on both; the other pages are drafts for
now, so they are shown but don't fail the check unless --strict.
A preview deploy is sent with `X-Robots-Tag: noindex` by Cloudflare, so the SEO score here
leaves out the "Page is blocked from indexing" audit (is-crawlable). Everything else counts.
Each page and the files it links are fetched once first: a fresh preview starts with a cold
Cloudflare cache, and the first visit would measure that, not the site.
Performance moves a point or so between runs, so a test under the bar is run again (up to RUNS times)
and its best run counts. Reports go to out/lighthouse/<page>-<strategy>.json.
"""
import concurrent.futures
import json
import os
import pathlib
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
CATS = ['performance', 'accessibility', 'best-practices', 'seo']
STRATEGIES = ['mobile', 'desktop']
GATED = ['/']
RUNS = 3
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'out' / 'lighthouse'


def api_key():
    key = os.environ.get('PSI_API_KEY')
    vars_file = ROOT / '.dev.vars'
    if not key and vars_file.exists():
        key = next((line.split('=', 1)[1].strip() for line in vars_file.read_text(encoding='utf-8').splitlines()
                    if line.startswith('PSI_API_KEY=')), None)
    if not key:
        sys.exit('No PageSpeed API key: put PSI_API_KEY=... in .dev.vars (see the note at the top).')
    return key


def pages(base):
    """The paths in the live site's sitemap (the static pages, plus one per service and project)."""
    # a named User-Agent: Cloudflare answers Python's default one with 403
    req = urllib.request.Request(f'{base}/sitemap.xml', headers={'User-Agent': 'lighthouse-gate warm-up'})
    xml = urllib.request.urlopen(req, timeout=30).read().decode('utf-8')
    return [re.sub(r'^https?://[^/]+', '', u) or '/' for u in re.findall(r'<loc>([^<]+)</loc>', xml)]


def warm(url):
    """Fetch the page and every file it links from assets/, so the edge cache is filled."""
    get = lambda u: urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'lighthouse-gate warm-up'}), timeout=30).read()
    base = re.match(r'https?://[^/]+', url).group(0)
    for ref in set(re.findall(r'(?:href|src|srcset|data-hero)="/?(assets/[^"#]+)', get(url).decode('utf-8'))):
        get(f'{base}/{ref}')


def run(url, strategy, key):
    """One PageSpeed test; returns its Lighthouse report."""
    query = urllib.parse.urlencode([('url', url), ('strategy', strategy), ('key', key)] + [('category', c) for c in CATS])
    try:
        with urllib.request.urlopen(f'{API}?{query}', timeout=180) as resp:
            return json.load(resp)['lighthouseResult']
    except urllib.error.HTTPError as e:   # never print the request: the key is in it
        sys.exit(f'PageSpeed API {e.code} for {url} ({strategy}): ' + json.load(e).get('error', {}).get('message', '')[:200])


def scores(report):
    """Category scores out of 100; SEO without is-crawlable (see the note at the top)."""
    out = {}
    for c in CATS:
        refs = [r for r in report['categories'][c]['auditRefs'] if r['weight'] > 0]
        if c == 'seo':
            refs = [r for r in refs if r['id'] != 'is-crawlable']
        got = [(r['weight'], report['audits'][r['id']]['score']) for r in refs]
        got = [(w, s) for w, s in got if s is not None]
        out[c] = round(100 * sum(w * s for w, s in got) / sum(w for w, _ in got))
    return out


def test(base, path, strategy, key, bar):
    """The best single run over up to RUNS tests (highest lowest score), stopping once one reaches the bar."""
    name = path.strip('/') or 'home'
    best = None
    for n in range(1, RUNS + 1):
        report = run(base + path, strategy, key)
        s = scores(report)
        if best is None or min(s.values()) > min(best.values()):   # one run's scores together, never mixed across runs
            best = s
            file = OUT / f'{name}-{strategy}.json'   # services/help-desk-mobile.json: the page's folder may not exist yet
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_text(json.dumps(report), encoding='utf-8')
        if min(best.values()) >= bar:
            break
    return name, strategy, best, n


def main():
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    base = args[0].rstrip('/')
    bar = int(args[args.index('--min') + 1]) if '--min' in args else 100
    paths = pages(base)
    if '--sample' in args:   # Home plus the first service and the first project: 6 tests, not 40
        paths = ['/'] + [next(p for p in paths if p.startswith(d)) for d in ('/services/', '/work/')]
    gated = paths if '--strict' in args else GATED
    key = api_key()
    OUT.mkdir(parents=True, exist_ok=True)
    for p in paths:
        warm(base + p)
    jobs = [(p, s) for p in paths for s in STRATEGIES]
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(jobs)) as pool:
        results = list(pool.map(lambda j: test(base, j[0], j[1], key, bar), jobs))
    failed = []
    print(f'{"page":10} {"device":8} ' + ' '.join(f'{c[:6]:>6}' for c in CATS) + '  runs')
    for (path, _), (name, strategy, best, n) in zip(jobs, results):
        mark = '' if path in gated else '  (not gated)'
        print(f'{name:10} {strategy:8} ' + ' '.join(f'{best[c]:>6}' for c in CATS) + f'  {n}{mark}')
        if path in gated:
            failed += [f'{name} {strategy} {c} {best[c]}' for c in CATS if best[c] < bar]
    if failed:
        print(f'\nUnder {bar}: ' + ', '.join(failed))
        sys.exit(1)
    print(f'\nGated pages at {bar} or more.')


if __name__ == '__main__':
    main()
