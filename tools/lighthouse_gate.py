"""Lighthouse gate: run Lighthouse (mobile, the PageSpeed settings) on every page in the sitemap
and fail if any score is under the bar.

    python tools/lighthouse_gate.py https://<hash>.uplink-site-4p8.pages.dev    # a preview deploy
    python tools/lighthouse_gate.py https://uplink-site-4p8.pages.dev --min 100   # the live site

Pages come from site/sitemap.xml, so a new page is checked once it is in the sitemap.
Lighthouse is the version PageSpeed runs (LH below); it needs Chrome installed.
A preview deploy is sent with `X-Robots-Tag: noindex` by Cloudflare, so the SEO score here
leaves out the "Page is blocked from indexing" audit (is-crawlable). Everything else counts.
Performance moves a point or so between runs, so a page under the bar is run again (up to RUNS times)
and its best run counts. Reports go to out/lighthouse/<page>.json.
deploy.py runs this on a preview before it deploys to the live address.
"""
import json
import pathlib
import re
import subprocess
import sys

LH = 'lighthouse@13.5.0'
CATS = ['performance', 'accessibility', 'best-practices', 'seo']
RUNS = 3
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'out' / 'lighthouse'


def pages():
    xml = (ROOT / 'site' / 'sitemap.xml').read_text(encoding='utf-8')
    return [re.sub(r'^https?://[^/]+', '', u) or '/' for u in re.findall(r'<loc>([^<]+)</loc>', xml)]


def run(url, path):
    cmd = ['npx', '-y', LH, url, '--output=json', f'--output-path={path}', '--quiet',
           '--only-categories=' + ','.join(CATS), '--chrome-flags=--headless=new']
    subprocess.run(cmd, check=True, shell=(sys.platform == 'win32'), stdout=subprocess.DEVNULL)
    return json.loads(path.read_text(encoding='utf-8'))


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


def main():
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    base = args[0].rstrip('/')
    bar = int(args[args.index('--min') + 1]) if '--min' in args else 100
    OUT.mkdir(parents=True, exist_ok=True)
    failed = []
    print(f'{"page":10} ' + ' '.join(f'{c[:6]:>6}' for c in CATS) + '  runs')
    for p in pages():
        name = p.strip('/') or 'home'
        best = None
        for n in range(1, RUNS + 1):
            s = scores(run(base + p, OUT / f'{name}.json'))
            best = s if best is None else {c: max(best[c], s[c]) for c in CATS}
            if min(best.values()) >= bar:
                break
        print(f'{name:10} ' + ' '.join(f'{best[c]:>6}' for c in CATS) + f'  {n}')
        failed += [f'{name} {c} {best[c]}' for c in CATS if best[c] < bar]
    if failed:
        print(f'\nUnder {bar}: ' + ', '.join(failed))
        sys.exit(1)
    print(f'\nAll pages at {bar} or more.')


if __name__ == '__main__':
    main()
