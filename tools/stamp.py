"""Cache busting: stamp every CSS and JS link in the pages with a hash of the file.

    python tools/stamp.py site            # rewrite ?v= on every page
    python tools/stamp.py site --check    # exit 1 if any stamp is out of date

`assets/css/site.css` becomes `assets/css/site.css?v=1a2b3c4d`. The hash comes
from the file's contents, so it changes only when the file does. `site/_headers`
lets browsers keep these files for a year, so run this after every CSS or JS
edit (verify_footer.py runs the check).
"""
import hashlib
import pathlib
import re
import sys

site = pathlib.Path(sys.argv[1])
check = '--check' in sys.argv
ref = re.compile(r'((?:href|src)="/?(assets/(?:css|js)/[\w.-]+\.(?:css|js)))(?:\?v=\w*)?"')


def stamp(m):
    data = (site / m.group(2)).read_bytes().replace(b'\r\n', b'\n')  # same stamp whatever git did to line endings
    v = hashlib.sha256(data).hexdigest()[:8]
    return f'{m.group(1)}?v={v}"'


stale = []
for f in sorted(site.glob('*.html')):
    t = f.read_text(encoding='utf-8')
    new = ref.sub(stamp, t)
    if new != t:
        stale.append(f.name)
        if not check:
            f.write_text(new, encoding='utf-8', newline='')
if check:
    print('stamps out of date: ' + ', '.join(stale) if stale else 'stamps ok')
    sys.exit(1 if stale else 0)
print('stamped: ' + (', '.join(stale) or 'nothing changed'))
