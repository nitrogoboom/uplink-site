"""Build the pages in site/ from the parts in src/.

    python tools/build_pages.py            # write site/*.html and site/assets/css/site.css
    python tools/build_pages.py --check    # exit 1 if site/ is out of date with src/

Each folder in src/pages/ is one page: `page.html` holds the <head> and the
order of the sections, and each section is its own file next to it. A line
like `<!-- @include 1-hero.html -->` is swapped for that file:
  - a name with an extension is a file in the same folder as the line
  - a bare name (`Header`) is a shared part, src/components/Header.html
Notes between `<!---` and `--->` (or `/*---` and `---*/` in CSS) are for
people reading the source; the build drops them.

Shared parts change a little per page, like Astro props:
  - Header and BottomNav: the current page's tab gets aria-current="page";
    Header's {prev} and {next} are the Q / E keyhop links.
  - 404 is served at any depth, so its shared parts get root links (/services).
src/styles/site.css lists the CSS files in cascade order; the build joins
them into site/assets/css/site.css. Stamps (?v=) are added last (stamp.py).
"""
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from stamp import stamp_text

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, SITE = ROOT / 'src', ROOT / 'site'
TABS = [('home', './'), ('services', 'services'), ('work', 'work'), ('about', 'about'), ('contact', 'contact')]

INCLUDE = re.compile(r'<!-- @include ([\w./-]+) -->|/\* @include ([\w./-]+) \*/')
NOTE = re.compile(r'<!---.*?--->\n?|/\*---.*?---\*/\n?', re.S)


def read(p):
    return p.read_text(encoding='utf-8').replace('\r\n', '\n')


def expand(path, part=lambda name, text: text):
    """The file with its notes dropped and its includes filled in (one trailing newline dropped from each)."""
    def sub(m):
        name = m.group(1) or m.group(2)
        if '.' in name:
            return expand(path.parent / name, part).removesuffix('\n')
        return part(name, expand(SRC / 'components' / (name + '.html'), part)).removesuffix('\n')
    return INCLUDE.sub(sub, NOTE.sub('', read(path)))


def build_page(folder):
    page = folder / 'page.html'
    key = re.search(r'<body data-page="(\w+)"', read(page)).group(1)
    keys = [k for k, _ in TABS]
    i = keys.index(key) if key in keys else len(TABS)   # pages off the tab bar sit after Contact
    prev, next_ = TABS[i - 1][1], (TABS[i + 1] if i + 1 < len(TABS) else TABS[0])[1]

    def part(name, text):
        text = text.replace(f'data-page="{key}">', f'data-page="{key}" aria-current="page">')
        text = text.replace('{prev}', prev).replace('{next}', next_)
        if folder.name == '404':  # served at any depth, so its links start at the root
            text = text.replace('href="./"', 'href="/"')
            text = re.sub(r'(href=")(?!https?:|mailto:|tel:|#|/)', r'\1/', text)
        return text
    return expand(page, part)


def outputs():
    out = {SITE / 'assets/css/site.css': expand(SRC / 'styles/site.css')}
    pages = {}
    for folder in sorted((SRC / 'pages').iterdir()):
        if (folder / 'page.html').exists():
            pages[SITE / ('index.html' if folder.name == 'home' else folder.name + '.html')] = build_page(folder)
    return out, pages


if __name__ == '__main__':
    check = '--check' in sys.argv
    css, pages = outputs()
    stale = []
    for f, text in css.items():   # CSS first: the page stamps hash it
        if not f.exists() or read(f) != text:
            stale.append(f.relative_to(SITE).as_posix())
            if not check:
                f.write_text(text, encoding='utf-8', newline='')
    for f, text in pages.items():
        text = stamp_text(SITE, text)
        if not f.exists() or read(f) != text:
            stale.append(f.name)
            if not check:
                f.write_text(text, encoding='utf-8', newline='')
    if check:
        print('site/ out of date with src/: ' + ', '.join(stale) if stale else 'site/ matches src/')
        sys.exit(1 if stale else 0)
    print('built: ' + (', '.join(stale) or 'nothing changed'))
