"""Writes the numbered keys that sit under the drawings on small screens.
On a phone each drawing swaps its labels for numbered dots (see isogen.key_css); the page lists what
the numbers mean. Each list comes from the drawing's own labels (data-t / data-s on every .lbl group),
so it can't drift out of step with the picture.
usage: python tools/build_keys.py site       (run after any gen_*.py that changes a label)
In a page, a key is <ol class="fig-key" data-key="NAME"></ol>: NAME is the drawing file (hq, cloud...)
or "hero" for the inline drawing at the top of index.html. Its contents are replaced on every run.
"""
import html, pathlib, re, sys

LBL = re.compile(r'<g class="[^"]*\blbl\b[^"]*" data-t="([^"]*)" data-s="([^"]*)"')
NUM = re.compile(r'<g class="num"><circle [^>]*fill="(#[0-9A-Fa-f]{6})"')
SKY = '#7DB9E8'
KEY = re.compile(r'(<ol class="fig-key[^"]*" data-key="([\w-]+)"[^>]*>)(.*?)(</ol>)', re.S)


def items(svg):
    labels, colours = LBL.findall(svg), NUM.findall(svg)
    assert len(labels) == len(colours), 'every label needs one numbered dot'
    out = []
    for (t, s), c in zip(labels, colours):
        t, s = html.unescape(t), html.unescape(s)
        cls = ' class="k-sky"' if c.upper() == SKY else ''
        sub = f' {html.escape(s, quote=False)}' if s else ''
        out.append(f'<li{cls}><span><b>{html.escape(t, quote=False)}</b>{sub}</span></li>')   # one span: title and words wrap as one line
    return out


def source(site, name, page_text):
    if name == 'hero':
        start = page_text.index('<svg xmlns="http://www.w3.org/2000/svg" class="ob"')
        return page_text[start:page_text.index('</svg>', start)]
    return (site / 'assets/img' / f'{name}.svg').read_text(encoding='utf-8')


def main(site):
    for page in sorted(site.glob('*.html')):
        text = page.read_text(encoding='utf-8')
        if 'class="fig-key' not in text:
            continue
        nl = '\r\n' if '\r\n' in text[:2000] else '\n'

        def fill(m):
            indent = re.search(r'[ \t]*$', text[:m.start()]).group(0)
            lis = items(source(site, m.group(2), text))
            return m.group(1) + nl + nl.join(indent + '  ' + li for li in lis) + nl + indent + m.group(4)
        new = KEY.sub(fill, text)
        if new != text:
            page.write_text(new, encoding='utf-8', newline='')
            print('keys written:', page.name)


if __name__ == '__main__':
    main(pathlib.Path(sys.argv[1]))
