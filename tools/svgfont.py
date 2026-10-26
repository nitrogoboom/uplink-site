"""Embeds just the Barlow letters a drawing uses, so its labels look right when the SVG is loaded with <img>
(an <img> SVG can't see the page's web fonts). Fonts: tools/fonts/ (SIL OFL, see OFL.txt).
Needs: pip install fonttools brotli"""
import base64, io, pathlib, re, html
from fontTools import subset
from fontTools.ttLib import TTFont

FONTS = pathlib.Path(__file__).parent / 'fonts'
FILES = {'400': 'Barlow-Regular.ttf', '600': 'Barlow-SemiBold.ttf'}


def _woff2(path, text):
    f = TTFont(path)
    o = subset.Options(); o.flavor = 'woff2'; o.layout_features = ['kern']; o.name_IDs = []; o.hinting = False
    s = subset.Subsetter(o); s.populate(text=text); s.subset(f)
    b = io.BytesIO(); f.flavor = 'woff2'; f.save(b)
    return base64.b64encode(b.getvalue()).decode()


def font_style(svg_text):
    """<style> block with @font-face rules for the weights and letters used by <text> in svg_text ('' if none)."""
    used = {}
    for attrs, body in re.findall(r'<text([^>]*)>(.*?)</text>', svg_text, re.S):
        m = re.search(r'font-weight="(\d+)"', attrs)
        weight = m.group(1) if m else '400'
        used[weight] = used.get(weight, '') + html.unescape(re.sub(r'<[^>]+>', '', body))
    rules = [f"@font-face{{font-family:Barlow;font-weight:{w};src:url(data:font/woff2;base64,{_woff2(FONTS / FILES[w], t)}) format('woff2')}}"
             for w, t in sorted(used.items()) if w in FILES]
    return f'<style>{"".join(rules)}</style>' if rules else ''
