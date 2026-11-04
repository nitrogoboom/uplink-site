"""Link check against the built site: every link, picture, script, stylesheet and preload on every page must answer,
and a link to a #section must find that id on the page it points to. CI runs it after the browser check.

usage: python tools/check_links.py [base]        (default http://localhost:8787, i.e. npm run serve)
       python tools/check_links.py [base] --external   also asks each outside address (slower; not in CI)

Pages: the served sitemap.xml plus /soon and the 404 page (site_pages.py). Fragments on /soon are not checked: that
page reads the #address itself (soon.js) to say which page isn't built yet. Exits 1 on any broken address.
"""

import sys, urllib.error, urllib.request
from html.parser import HTMLParser
from urllib.parse import urldefrag, urljoin, urlparse
from site_pages import UA, pages

ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
BASE = ARGS[0] if ARGS else 'http://localhost:8787'
EXTERNAL = '--external' in sys.argv
NO_FRAGMENTS = ('/soon',)  # pages that read the #address themselves


class Page(HTMLParser):
    """Collects every address a page points at and every id it has."""

    def __init__(self):
        super().__init__()
        self.refs, self.ids = [], set()

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get('id'):
            self.ids.add(a['id'])
        for key in ('href', 'src', 'data-hero', 'data-hero-tablet', 'data-hero-phone', 'data-fc-map'):
            if a.get(key) and not (tag == 'link' and a.get('rel') in ('canonical', 'alternate') and key == 'href'):
                self.refs.append(a[key])
        if a.get('srcset') and not a['srcset'].startswith('data:'):  # a data: address has commas of its own
            self.refs += [part.strip().split(' ')[0] for part in a['srcset'].split(',') if part.strip()]


def get(url):
    """(status, body or None). The 404 page's own address answers 404 on purpose; its body still counts."""
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
            body = r.read() if 'html' in r.headers.get('Content-Type', '') else None
            return r.status, body
    except urllib.error.HTTPError as e:
        return e.code, None
    except Exception as e:  # DNS, refused, timeout
        return str(e)[:80], None


def main():
    host = urlparse(BASE).netloc
    found = {}  # address without #fragment -> pages that point at it
    frags = {}  # (address, fragment) -> pages
    ids = {}  # page address -> its ids
    for path in pages(BASE):
        status, body = get(BASE + path)
        if body is None:
            if not path.endswith('no-such-page'):
                print(f'FAIL {path}: the page itself answered {status}')
            continue
        p = Page()
        p.feed(body.decode('utf-8', 'replace'))
        ids[urlparse(BASE + path).path] = p.ids
        for ref in p.refs:
            if ref.startswith(('mailto:', 'tel:', 'data:', 'javascript:')):
                continue
            url, frag = urldefrag(urljoin(BASE + path, ref))
            found.setdefault(url, set()).add(path)
            if frag and urlparse(url).netloc == host:
                frags.setdefault((url, frag), set()).add(path)

    broken, outside = [], 0
    for url, where in sorted(found.items()):
        if urlparse(url).netloc != host:
            outside += 1
            if not EXTERNAL:
                continue
        status, body = get(url)
        if status != 200:
            broken.append(f'{url} answered {status} (on {", ".join(sorted(where)[:3])})')
        elif body is not None and urlparse(url).path not in ids:
            p = Page()
            p.feed(body.decode('utf-8', 'replace'))
            ids[urlparse(url).path] = p.ids
    for (url, frag), where in sorted(frags.items()):
        path = urlparse(url).path
        if path.rstrip('/') in NO_FRAGMENTS or path not in ids:
            continue
        if frag not in ids[path]:
            broken.append(f'{path}#{frag}: no id "{frag}" on that page (linked from {", ".join(sorted(where)[:3])})')

    print(
        f'{len(found)} addresses ({outside} outside the site{"" if EXTERNAL else ", not asked"}), {len(frags)} #section links'
    )
    for b in broken:
        print('FAIL', b)
    print('links: all good' if not broken else f'links: {len(broken)} broken')
    sys.exit(1 if broken else 0)


main()
