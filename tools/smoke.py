"""Smoke test: the live site answers the way it should. A few seconds, plain HTTP, no browser. Run it straight
after a deploy, and on launch day after the domain switch (docs/launch-runbook.md).

    python tools/smoke.py https://uplink-site.johnoreilly.workers.dev            # today: noindex expected
    python tools/smoke.py https://uplinkit.ca --launch                           # after launch: indexable, sitemap named
    python tools/smoke.py https://uplinkit.ca --launch --old https://uplink-site.johnoreilly.workers.dev
                                                                                 # and the old address redirects here

Checks:
  every page in sitemap.xml answers 200 over https, as text/html, with the security headers
  plain http:// redirects (301/308) to the same https:// address
  a made-up address answers 404 with the site's 404 page; /404 itself answers 404
  /api/report refuses a GET (405); robots.txt, llms.txt and a .md copy answer
  sitemap.xml names this address (not another host)
  noindex: present while it's a test build; with --launch, gone, and robots.txt names the sitemap
  --old: the old address redirects to the same path here
Exit 1 on any failure. Cloudflare answers Python's default User-Agent with 403, so requests name one.
"""
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

UA = {'User-Agent': 'uplink-smoke-test'}
HEADERS = ['strict-transport-security', 'content-security-policy', 'x-content-type-options', 'referrer-policy',
           'x-frame-options', 'permissions-policy', 'cross-origin-opener-policy', 'cross-origin-resource-policy',
           'x-permitted-cross-domain-policies']


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


plain = urllib.request.build_opener(NoRedirect)


def get(url, method='GET'):
    """(status, headers, body) without following redirects; never raises on an HTTP status."""
    req = urllib.request.Request(url, headers=UA, method=method)
    try:
        with plain.open(req, timeout=30) as r:
            return r.status, r.headers, r.read().decode('utf-8', 'replace')
    except urllib.error.HTTPError as e:
        return e.code, e.headers, e.read().decode('utf-8', 'replace')


def main():
    args = sys.argv[1:]
    if not args or args[0].startswith('-'):
        sys.exit(__doc__)
    base = args[0].rstrip('/')
    launch = '--launch' in args
    old = args[args.index('--old') + 1].rstrip('/') if '--old' in args else None
    host = urllib.parse.urlsplit(base).netloc
    fails = []
    ok = lambda cond, what: cond or fails.append(what)

    status, _, sitemap = get(f'{base}/sitemap.xml')
    ok(status == 200, f'sitemap.xml: {status}')
    urls = re.findall(r'<loc>([^<]+)</loc>', sitemap)
    ok(len(urls) > 0, 'sitemap.xml lists no pages')
    other = [u for u in urls if urllib.parse.urlsplit(u).netloc != host]
    ok(not other, f'sitemap.xml names another host: {other[0] if other else ""}')

    for u in urls:
        path = urllib.parse.urlsplit(u).path
        status, h, _ = get(base + path)
        if status != 200:
            fails.append(f'{path}: {status}')
            continue
        ok('text/html' in (h.get('content-type') or ''), f'{path}: content-type {h.get("content-type")}')
        missing = [n for n in HEADERS if not h.get(n)]
        ok(not missing, f'{path}: missing {", ".join(missing)}')
        noindex = 'noindex' in (h.get('x-robots-tag') or '')
        ok(noindex != launch, f'{path}: noindex {"still on" if launch else "missing (test build)"}')
    print(f'{len(urls)} pages checked')

    status, h, _ = get(f'http://{host}/services')
    ok(status in (301, 308) and h.get('location') == f'https://{host}/services',
       f'http:// redirect: {status} to {h.get("location")}')
    status, _, body = get(f'{base}/no-such-page-smoke-test')
    ok(status == 404, f'made-up address: {status}, not 404')
    ok('404' in body or 'not found' in body.lower(), 'made-up address: not the site 404 page')
    ok(get(f'{base}/404')[0] == 404, '/404 does not answer 404')
    ok(get(f'{base}/api/report')[0] == 405, '/api/report GET is not 405')
    for path in ['/robots.txt', '/llms.txt', '/services.md']:
        ok(get(base + path)[0] == 200, f'{path} does not answer 200')
    robots = get(f'{base}/robots.txt')[2]
    if launch:
        ok(f'Sitemap: {base}/sitemap.xml' in robots, 'robots.txt has no Sitemap line for this address')

    if old:
        status, h, _ = get(f'{old}/services')
        ok(status in (301, 308) and h.get('location') == f'{base}/services',
           f'old address: {status} to {h.get("location")}, not {base}/services')

    for f in fails:
        print('FAIL', f)
    print('smoke test passed' if not fails else f'{len(fails)} failure(s)')
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
