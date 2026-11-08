"""Light theme for the drawings (Settings, light or dark; docs/light-theme-2026-11-08.md).

    python tools/gen_light.py           write them
    python tools/gen_light.py --check   fail if a written file differs from what this script makes now

The dark drawings stay the source: a change to a gen_*.py reaches the light theme on the next run of this script
(tools/regen.py runs it last). Two outputs, one colour table:
  - Pictures (<img>, <picture>): NAME-light.svg beside each dark NAME.svg in public/assets/img/, the dark SVG with its
    colours swapped. Drawing.astro shows one or the other by theme.
  - Drawings inside the page (the Home hero, which home.js fetches in, its dashes, and the Grow world): no copies.
    src/styles/theme-drawings.css swaps their colours with CSS when <html data-theme="light">: an attribute
    selector per colour (author CSS beats an SVG's fill="" attribute), and a light copy of each colour rule in the
    drawings' own <style>. So the switch is instant, and home.js and grow.js keep one drawing.

How a colour is swapped (docs/palette.md, light columns of 5.1 and 5.4):
  1. Roles with a light value in the palette take it (box faces, blue and green boxes, ground, grid, edges).
  2. Text and the page colour flip: label ink becomes dark, halos and dot rims become the light page.
  3. Bright ink on a light ground darkens to its ink step (amber lines to amber 500, sky lines to the logo blue,
     green dots to green 600), so lines and dots keep their weight against the light faces.
  4. Any other navy shade (5.5) keeps its place between the box faces: its dark lightness is mapped onto the light
     box faces' lightness (right 0.295 -> 0.81, left 0.375 -> 0.88, top 0.455 -> 1.0) and redrawn with navy(L).
Screens stay dark (a monitor is dark in a lit room too), so what is drawn on them keeps its dark-mode colours.
"""
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import palette as pal  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
IMG = ROOT / 'public' / 'assets' / 'img'
HOME = ROOT / 'src' / 'components' / 'home'

CSS_OUT = ROOT / 'src' / 'styles' / 'theme-drawings.css'

# drawings that live inside the page, by the box that holds them (the CSS's scope); office: a gen_office.py drawing
INLINE = [
    ('.hero-art', True, [IMG / 'hero-office.svg', IMG / 'hero-office-tablet.svg', IMG / 'office-compact-build.svg',
                         IMG / 'office-compact-flows.svg', HOME / 'hero-flows.svg']),
    ('.grow-stage', False, [HOME / 'grow-world.svg']),
]
_INLINE_NAMES = {p.name for _, _, files in INLINE for p in files}


def picture_sources():
    """Every drawing shown as a picture: the SVGs in public/assets/img/ that aren't inlined, the footer map (styled
    by footer.css from the tokens) or a light copy."""
    return sorted(p for p in IMG.glob('*.svg')
                  if p.name not in _INLINE_NAMES and p.name != 'campus.svg' and not p.stem.endswith('-light'))


# 1-3: fixed swaps, any attribute. Keys and values upper case.
SWAP = {
    # plain box faces and their outline
    '#4D5863': '#FFFFFF', '#37424E': '#D2D8DE', '#222E3A': '#BBC2C9',
    # ground, grid, unlit window, drop shadow
    '#15212E': '#E6ECF2', '#2B3743': '#C5CCD3', '#182431': '#A1A9B1', '#05111D': '#BBC2C9',
    # page colour (halos, dot rims) and label ink
    '#0E1A27': '#EBF0F5', '#F2F7FC': '#0E1A27', '#BBC2C9': '#4D5863',   # EBF0F5: the light --c-bg
    # blue boxes: palette light column
    '#B7DDF8': '#97C8EA', '#73AFD9': '#005D8A',
    # amber box edge, lit window
    '#FFF5EC': '#7C4900',
    # green: darkest face, led and online dots
    '#198152': '#00683F', '#A9E9C3': '#198152',
    # alarm red, red dot
    '#FF897E': '#B24438', '#F57D6E': '#D66254',
    # lit glass, step outline: one step darker so they read on light faces
    '#264C64': '#97C8EA',
    # front step: the box faces' order
    '#535D68': '#D2D8DE', '#414C58': '#BBC2C9', '#656F78': '#FFFFFF',
    # unlit indicator dot, cable: mid grey on light faces
    '#5B6570': '#838C95', '#656E78': '#838C95',
}

# colours that depend on where they are used: (colour, kind) -> light colour. kind: 'fill', 'stroke' or 'text'.
BY_USE = {
    # face outline: dark lines on light faces (palette box-edge light)
    ('#E6ECF2', 'stroke'): '#37424E',
    # the sky blue: a box's left face as a fill, the logo blue as a line, link blue as words
    ('#97C8EA', 'fill'): '#4A93C1', ('#97C8EA', 'stroke'): '#1F75A6', ('#97C8EA', 'text'): '#005D8A',
    # amber: fills stay (the palette keeps the lit box), lines go one step down, words take action-ink
    ('#FFAD51', 'stroke'): '#C37600', ('#FFAD51', 'text'): '#88520A',
    ('#198152', 'text'): '#004F2E', ('#A9E9C3', 'text'): '#004F2E',
}

# the office drawings (gen_office.py) floor their room with the window colour: a light floor there, not a grey slab
OFFICE = {'#182431': '#DCE2E8'}

# shades drawn on a screen stay as they are (the screen stays dark)
SCREEN = {'#182430': '#222E3A'}   # screen glass: one step darker than the old box right face, still a screen


def _box_l(L):
    """Map a dark navy shade's lightness onto the light box faces (right 0.295 -> 0.81, top 0.455 -> 1.0)."""
    return max(0.70, min(0.99, 0.81 + (L - 0.295) * 1.19))


def neutral(hex_):
    """A navy shade with no swap of its own: same place between the faces, light."""
    L, C = pal._oklch(hex_)
    if C > 0.045 or L > 0.62:
        return hex_                       # a colour, or already light (mug, paper): leave it
    return pal.navy(_box_l(L))


def swap(hex_, kind, office=False):
    h = hex_.upper()
    if len(h) == 4:
        h = '#' + ''.join(c * 2 for c in h[1:])
    if office and h in OFFICE:
        return OFFICE[h]
    if h in SCREEN:
        return SCREEN[h]
    if (h, kind) in BY_USE:
        return BY_USE[(h, kind)]
    if h in SWAP:
        return SWAP[h]
    return neutral(h)


ATTR = re.compile(r'\b(fill|stroke|stop-color|flood-color|color)="(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3})"')
CSS = re.compile(r'\b(fill|stroke|stop-color|color|background)\s*:\s*(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3})\b')
TAG = re.compile(r'<(\w+)\b[^>]*>')


def kind_of(attr, tag):
    if tag in ('text', 'tspan') and attr == 'fill':
        return 'text'
    return 'stroke' if attr == 'stroke' else 'fill'


def lighten(svg, office=False):
    """The SVG text with every colour swapped for its light value. office: a gen_office.py drawing."""
    def tag_sub(m):
        tag = m.group(1)
        return ATTR.sub(lambda a: f'{a.group(1)}="{swap(a.group(2), kind_of(a.group(1), tag), office)}"', m.group(0))
    out = TAG.sub(tag_sub, svg)
    # the phone cut's caption list (data-items, JSON): home.js writes each title in its "c" colour, as words
    out = re.sub(r'(&quot;c&quot;:&quot;)(#[0-9A-Fa-f]{6})(&quot;)',
                 lambda m: m.group(1) + swap(m.group(2), 'text', office) + m.group(3), out)
    out = re.sub(r'(<style[^>]*>)(.*?)(</style>)',
                 lambda m: m.group(1) + CSS.sub(lambda c: f'{c.group(1)}:{swap(c.group(2), kind_of(c.group(1), "style"), office)}',
                                                m.group(2)) + m.group(3), out, flags=re.S)
    return out


def target(src):
    return src.with_name(src.stem + '-light.svg')


def is_office(src):
    return src.name.startswith(('office', 'hero-office'))


def _css(hex_):
    """A colour as the site's CSS writes it (stylelint): lower case, short where it can be."""
    return _forms(hex_)[-1]


def _forms(hex_):
    """The colour as an attribute selector value. SVGO writes colours in lower case, and short where it can."""
    h = hex_.lower()
    short = '#' + h[1] + h[3] + h[5] if h[1] == h[2] and h[3] == h[4] and h[5] == h[6] else None
    return [h] + ([short] if short else [])


def inline_css():
    """theme-drawings.css: the light colours for the drawings inside the page."""
    out = ['/* Written by tools/gen_light.py: do not edit by hand. The light theme colours for the drawings inside',
           '   the page (the Home hero and the Grow world); src/styles/global.css imports it. Attribute rules sit in',
           '   :where(), so the class rules from the drawings and their light copies (at the end of each block) win. */']
    for scope, office, files in INLINE:
        uses = set()      # (attribute, colour, kind)
        rules = []        # (selector, property, colour) from the drawings' own <style>
        for src in files:
            svg = src.read_text(encoding='utf-8')
            for m in TAG.finditer(svg):
                for a in ATTR.finditer(m.group(0)):
                    uses.add((a.group(1), a.group(2).upper(), kind_of(a.group(1), m.group(1))))
            # home.js writes the phone captions' colours (data-items) as a title's fill and its line's stroke
            for c in re.findall(r'&quot;c&quot;:&quot;(#[0-9A-Fa-f]{6})&quot;', svg):
                uses |= {('fill', c.upper(), 'text'), ('fill', c.upper(), 'fill'), ('stroke', c.upper(), 'stroke')}
            for s in re.findall(r'<style[^>]*>(.*?)</style>', svg, flags=re.S):
                for sel, body in re.findall(r'([^{}@]+)\{([^{}]*)\}', s):
                    for prop, col in CSS.findall(body):
                        rules.append((sel.strip(), prop, col.upper()))
        root = f":where(:root[data-theme='light'] {scope})"
        out.append(f'\n/* {scope}: {", ".join(p.name for p in files)} */')
        for attr, col, kind in sorted(uses, key=lambda u: (u[2] == 'text', u)):
            new = swap(col, kind, office)
            if new.upper() == col:
                continue
            tag = ':is(text, tspan)' if kind == 'text' else ''
            sels = ',\n'.join(f"{root} {tag}[{attr}='{f}' i]" for f in _forms(col))
            out.append(f'{sels} {{\n  {attr}: {_css(new)};\n}}')
        seen = set()
        for sel, prop, col in rules:
            new = swap(col, 'stroke' if prop == 'stroke' else 'fill', office)
            key = (sel, prop)
            if new.upper() == col or key in seen:
                continue
            seen.add(key)
            scoped = ',\n'.join(f":root[data-theme='light'] {scope} {s.strip()}" for s in sel.split(','))
            out.append(f'{scoped} {{\n  {prop}: {_css(new)};\n}}')
    return '\n'.join(out) + '\n'


def main(check=False):
    files = {target(src): lighten(src.read_text(encoding='utf-8'), office=is_office(src)) for src in picture_sources()}
    files[CSS_OUT] = inline_css()
    bad = []
    for dst, out in files.items():
        if check:
            if not dst.exists() or dst.read_text(encoding='utf-8') != out:
                bad.append(str(dst.relative_to(ROOT)))
        else:
            dst.write_text(out, encoding='utf-8')
            print('wrote', dst.relative_to(ROOT))
    if bad:
        sys.exit('out of date (run python tools/gen_light.py): ' + ', '.join(bad))


if __name__ == '__main__':
    main(check='--check' in sys.argv)
