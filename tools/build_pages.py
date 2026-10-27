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
  - Header and BottomNav: the current page's tab gets aria-current="page".
  - 404 is served at any depth, so its shared parts get root links (/services).
src/styles/site.css lists the CSS files in cascade order; the build joins
site/assets/css/tokens.css and them into site/assets/css/site.css, minified,
and puts CSS inside each page's <head> (no stylesheet request blocks the
first paint): the shared files plus only that page's own (src/pages/<page>/*.css),
in the same cascade order (page_css()). tools/verify_css_split.py checks each page
still computes exactly the styles it would with the whole site.css. Stamps (?v=) are added last (stamp.py).

The site's own address is SITE_URL (below, or the SITE_URL environment
variable): `{site}` in a page.html (canonical, og:url, og:image, JSON-LD)
becomes it, and so do the links in the files the build writes:
  - site/sitemap.xml and site/robots.txt: every page without a noindex tag
  - site/llms.txt: a guide to the site for AI agents, from each page's <title>
    and description and the service cards on the home page (Home links to index.md)
  - site/agents.md and site/index.md (the home page as Markdown): written by
    hand in src/agents.md and src/index.md, with {site} filled in
  - the Early Hints block in site/_headers (HINTS below): the five
    first-screen fonts, sent before each page
  - JSON-LD in the <head> of Services, Our work, About and Contact (structured()):
    breadcrumbs and the page type, plus each service and the FAQ on Services, read
    from the page itself. Home's business block is written by hand in its page.html.
The home hero drawing (src/pages/home/1-hero-office.svg) is not inlined: it is
copied to site/assets/img/hero-office.svg, and `{hero}` in the home page (the
stage's data-hero and its preload) becomes that address; stamp.py stamps both.
home.js fetches it on screens 600px and wider; phones show the still picture.
"""
import html
import json
import os
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

# The live address. A test build for now; set the real domain here (or SITE_URL in the environment) at launch.
SITE_URL = os.environ.get('SITE_URL', 'https://uplink-site-4p8.pages.dev').rstrip('/')

# Early Hints: sent as a 103 before every page, in this order. They match the font preloads in each page.html.
# Every page's first screen uses these five faces (checked in Chrome on all pages, phone and desktop).
FIRST_FONTS = ['barlow-condensed-700-italic', 'barlow-400', 'barlow-600', 'barlow-condensed-700', 'barlow-condensed-600-italic']
HINTS = [f'</assets/fonts/{f}.woff2>; rel=preload; as=font; type="font/woff2"; crossorigin' for f in FIRST_FONTS]
HERO = 'assets/img/hero-office.svg'
# schema.org type of each inner page; each one's JSON-LD points at Home's business block by this @id
PAGE_TYPES = {'services': 'FAQPage', 'work': 'CollectionPage', 'about': 'AboutPage', 'contact': 'ContactPage'}
BUSINESS = '{site}/#business'
STYLESHEET = re.compile(r'<link rel="stylesheet" href="/?assets/css/site\.css(?:\?v=\w+)?">')
HINTS_BLOCK = re.compile(r'(# @early-hints[^\n]*\n).*?(# @end early-hints\n)', re.S)

# CSS minifier: drops comments and spare whitespace, never touches the inside of a string
CSS_TOKEN = re.compile(r'/\*.*?\*/|"(?:\\.|[^"\\\n])*"|\'(?:\\.|[^\'\\\n])*\'', re.S)


def squeeze(s):
    s = re.sub(r'\s+', ' ', s)
    s = re.sub(r' ?([{};,>]) ?', r'\1', s)
    return s.replace(': ', ':').replace(';}', '}')


def minify_css(css):
    out, last = [], 0
    for m in CSS_TOKEN.finditer(css):
        out.append(squeeze(css[last:m.start()]))
        if not m.group(0).startswith('/*'):
            out.append(m.group(0))
        last = m.end()
    out.append(squeeze(css[last:]))
    return ''.join(out).strip().replace(';}', '}') + '\n'


def read(p):
    return p.read_text(encoding='utf-8').replace('\r\n', '\n')


def expand(path, part=lambda name, text: text, keep=lambda name: True):
    """The file with its notes dropped and its includes filled in (one trailing newline dropped from each).
    An include that keep() turns down is dropped."""
    def sub(m):
        name = m.group(1) or m.group(2)
        if not keep(name):
            return ''
        if '.' in name:
            return expand(path.parent / name, part, keep).removesuffix('\n')
        return part(name, expand(SRC / 'components' / (name + '.html'), part)).removesuffix('\n')
    return INCLUDE.sub(sub, NOTE.sub('', read(path)))


def build_page(folder):
    page = folder / 'page.html'
    key = re.search(r'<body data-page="(\w+)"', read(page)).group(1)

    def part(name, text):
        text = text.replace(f'data-page="{key}">', f'data-page="{key}" aria-current="page">')
        if folder.name == '404':  # served at any depth, so its links start at the root
            text = text.replace('href="./"', 'href="/"')
            text = re.sub(r'(href=")(?!https?:|mailto:|tel:|#|/)', r'\1/', text)
        return text
    return expand(page, part)


def page_info(path, text):
    """What the sitemap and llms.txt need from a built page: its address, name, description, and noindex."""
    title = html.unescape(re.search(r'<title>(.*?)</title>', text).group(1))
    desc = html.unescape(re.search(r'<meta name="description" content="(.*?)">', text).group(1))
    return {'url': SITE_URL + path, 'name': 'Home' if path == '/' else title.split(' · ')[0], 'desc': desc,
            'index': not re.search(r'<meta name="robots" content="[^"]*noindex', text)}


def structured(key, info, text):
    """The page's JSON-LD (see PAGE_TYPES), as a <script> for its <head>."""
    biz = {'@id': BUSINESS.replace('{site}', SITE_URL)}
    page = {'@type': PAGE_TYPES[key], '@id': info['url'], 'url': info['url'], 'name': info['name'],
            'description': info['desc'], 'inLanguage': 'en-CA', 'publisher': biz}
    if key == 'about':
        page['about'] = biz
    graph = [page, {'@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE_URL + '/'},
        {'@type': 'ListItem', 'position': 2, 'name': info['name'], 'item': info['url']}]}]
    if key == 'services':
        plain = lambda s: html.unescape(re.sub(r'<[^>]+>', '', s)).strip()
        page['mainEntity'] = [{'@type': 'Question', 'name': plain(q), 'acceptedAnswer': {'@type': 'Answer', 'text': plain(a)}}
                              for q, a in re.findall(r'<details>\s*<summary>(.*?)<svg.*?</summary>\s*<div>(.*?)</div>\s*</details>', text, re.S)]
        graph += [{'@type': 'Service', '@id': f"{info['url']}#{sid}", 'url': f"{info['url']}#{sid}", 'name': plain(name),
                   'description': plain(lead), 'provider': biz, 'areaServed': 'Ontario'}
                  for sid, name, lead in re.findall(r'<article class="svc[^"]*" id="([\w-]+)".*?<h2[^>]*>(.*?)</h2>\s*<p class="lead">(.*?)</p>', text, re.S)]
    data = json.dumps({'@context': 'https://schema.org', '@graph': graph}, indent=1, ensure_ascii=False)
    return '<script type="application/ld+json">\n' + data.replace('</', '<\\/') + '\n</script>\n'


def guide(pages, home):
    """llms.txt / agents.md: the site in Markdown for AI agents (llmstxt.org layout)."""
    cards = re.findall(r'<a class="card" href="(services#[\w-]+)">.*?class="card-title">(.*?)</span>'
                       r'<span class="muted">(.*?)</span>', home, re.S)
    out = ['# Uplink Technology', '', '> ' + pages[0]['desc'], '',
           'This is a test build: Uplink Technology is a placeholder company and the copy is sample text.', '',
           '## Pages', '']
    out += [f"- [{p['name']}]({SITE_URL + '/index.md' if p['url'] == SITE_URL + '/' else p['url']}): {p['desc']}" for p in pages]
    out += ['', '## Services', '']
    out += [f'- [{html.unescape(t)}]({SITE_URL}/{href}): {html.unescape(d)}' for href, t, d in cards]
    return '\n'.join(out) + '\n'


# Page CSS another page also uses (found by tools/verify_css_split.py). These are shared blocks that live in
# a page folder; moving them to src/styles/ would retire this list.
BORROWS = {'services': ['home/1-hero.css'],                              # .hero
           'about': ['work/2-details.css', 'work/4-industries.css'],     # .facts, .industries
           'contact': ['home/2-services.css', 'work/2-details.css']}     # .svc-cards, .facts


def page_css(folder=None):
    """tokens.css and site.css minified; for a page folder, the other pages' own files are left out (BORROWS aside)."""
    own = lambda name: name.startswith(f'../pages/{folder}/') or name.removeprefix('../pages/') in BORROWS.get(folder, [])
    keep = lambda name: folder is None or not name.startswith('../pages/') or own(name)
    return minify_css(read(SITE / 'assets/css/tokens.css') + '\n' + expand(SRC / 'styles/site.css', keep=keep))


def outputs():
    out = {SITE / 'assets/css/site.css': page_css()}
    inline = lambda folder: '<style>' + page_css(folder).strip().replace("url('../", "url('/assets/") + '</style>'   # font paths from the page, at any depth
    out[SITE / HERO] = read(SRC / 'pages/home/1-hero-office.svg')
    pages, paths, info = {}, [], []
    order = {key: i for i, (key, _) in enumerate(TABS)}
    for folder in sorted((SRC / 'pages').iterdir(), key=lambda f: (order.get(f.name, len(TABS)), f.name)):
        if (folder / 'page.html').exists():
            text = build_page(folder).replace('{site}', SITE_URL).replace('{hero}', HERO)
            text = STYLESHEET.sub(lambda m: inline(folder.name), stamp_text(SITE, text))
            if folder.name != '404':   # served at any path, so no rule can name it
                path = '/' if folder.name == 'home' else '/' + folder.name
                paths.append(path)
                info.append(page_info(path, text))
                if folder.name in PAGE_TYPES:
                    text = text.replace('</head>', structured(folder.name, info[-1], text) + '</head>', 1)
            pages[SITE / ('index.html' if folder.name == 'home' else folder.name + '.html')] = text
    listed = [p for p in info if p['index']]
    out[SITE / '_headers'] = headers(sorted(paths))
    out[SITE / 'sitemap.xml'] = ('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                                 + ''.join(f"  <url><loc>{p['url']}</loc></url>\n" for p in listed) + '</urlset>\n')
    out[SITE / 'robots.txt'] = f'User-agent: *\nAllow: /\n\nSitemap: {SITE_URL}/sitemap.xml\n'
    out[SITE / 'llms.txt'] = guide(listed, pages[SITE / 'index.html'])
    for name in ('agents.md', 'index.md'):   # written by hand in src/; only the address is filled in
        out[SITE / name] = read(SRC / name).replace('{site}', SITE_URL)
    return out, pages


def headers(paths):
    """site/_headers with its Early Hints block rewritten."""
    link = '  Link: ' + ', '.join(HINTS)
    block = ''.join(f'{p}\n{link}\n' for p in paths)
    return HINTS_BLOCK.sub(lambda m: m.group(1) + block + m.group(2), read(SITE / '_headers'))


if __name__ == '__main__':
    check = '--check' in sys.argv
    if not check:   # the pages' stamps hash the hero file on disk, so it goes first
        hero = read(SRC / 'pages/home/1-hero-office.svg')
        if not (SITE / HERO).exists() or read(SITE / HERO) != hero:
            (SITE / HERO).write_text(hero, encoding='utf-8', newline='')
    files, pages = outputs()
    stale = []
    for f, text in {**files, **pages}.items():
        if not f.exists() or read(f) != text:
            stale.append(f.relative_to(SITE).as_posix())
            if not check:
                f.write_text(text, encoding='utf-8', newline='')
    if check:
        print('site/ out of date with src/: ' + ', '.join(stale) if stale else 'site/ matches src/')
        sys.exit(1 if stale else 0)
    print('built: ' + (', '.join(stale) or 'nothing changed'))
