"""Cache busting: stamp every CSS, JS and image link in the pages with a hash of the file.

    python tools/stamp.py site            # rewrite ?v= on every page
    python tools/stamp.py site --check    # exit 1 if any stamp is out of date

`assets/css/site.css` becomes `assets/css/site.css?v=1a2b3c4d`. The hash comes
from the file's contents, so it changes only when the file does. `site/_headers`
lets browsers keep these files for a year, so run this after every CSS, JS or
image edit (verify_footer.py runs the check). build_pages.py stamps as it builds.
Other query words and #fragments stay: `x.svg?card#plain` becomes `x.svg?card&v=1a2b3c4d#plain`.
Fonts are not stamped: fonts.css asks for them by plain name, and their preloads must match it.
"""
import hashlib
import pathlib
import re
import sys

ref = re.compile(r'((?:href|src|srcset|data-compact|data-hero)=")(/?)(assets/(?:css|js|img)/[\w.-]+\.(?:css|js|svg|png))'
                 r'(?:\?([^"#]*))?(#[^"]*)?"')


def file_hash(site, rel):
    data = (site / rel).read_bytes().replace(b'\r\n', b'\n')  # same stamp whatever git did to line endings
    return hashlib.sha256(data).hexdigest()[:8]


def stamp_text(site, t):
    def stamp(m):
        query = [q for q in (m.group(4) or '').split('&') if q and not q.startswith('v=')]
        query.append('v=' + file_hash(site, m.group(3)))
        return f'{m.group(1)}{m.group(2)}{m.group(3)}?{"&".join(query)}{m.group(5) or ""}"'
    return ref.sub(stamp, t)


if __name__ == '__main__':
    site = pathlib.Path(sys.argv[1])
    check = '--check' in sys.argv
    stale = []
    for f in sorted(site.glob('*.html')):
        t = f.read_text(encoding='utf-8')
        new = stamp_text(site, t)
        if new != t:
            stale.append(f.name)
            if not check:
                f.write_text(new, encoding='utf-8', newline='')
    if check:
        print('stamps out of date: ' + ', '.join(stale) if stale else 'stamps ok')
        sys.exit(1 if stale else 0)
    print('stamped: ' + (', '.join(stale) or 'nothing changed'))
