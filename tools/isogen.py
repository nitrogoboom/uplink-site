"""Shared pieces for the gen_*.py drawing scripts: palette, faces, iso circles, labels, the SVG wrapper.
Colours match README "Drawing rules" and the drawing palette in site/assets/css/tokens.css."""
import math
from shapely.geometry import LineString
from iso import fmt
from svgfont import font_style

FACES = ('#313F54', '#283447', '#405169')      # left, right, top
HIGH = ('#E2953F', '#C98030', '#F7B868')
EDGE = 'stroke="#D9E4F0" stroke-width="1" stroke-opacity="0.3"'
FLOOR_LINE = '#2C3849'
ORANGE, BLUE, GREY, INK = '#F4A340', '#7DB9E8', '#A9B4C3', '#151E2C'
FONT = "Barlow, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"


def faces(w, x0, x1, y0, y1, z0, z1, cols=FACES, extra=''):
    """A box as its (left, right, top) face triple, the order painter.py/boxes.py expect."""
    return [f'<polygon points="{pts}" fill="{c}" {EDGE}{extra}/>'
            for pts, c in zip(w.box(x0, x1, y0, y1, z0, z1), cols)]


def iso_ellipse(w, r, x=0, y=0, z=0):
    """A true iso circle of world radius r centred on (x, y, z): (rx, ry, (cx, cy))."""
    return r * w.u * math.sqrt(1.5), r * w.u / math.sqrt(2), w.p(x, y, z)


def ellipse(w, r, x=0, y=0, z=0, attrs=''):
    rx, ry, (cx, cy) = iso_ellipse(w, r, x, y, z)
    return f'<ellipse cx="{fmt(cx)}" cy="{fmt(cy)}" rx="{fmt(rx)}" ry="{fmt(ry)}" {attrs}/>'


def clip_out(p, q, mask):
    """Parts of segment p-q (screen space) outside the shapely shape mask."""
    rest = LineString([p, q]).difference(mask)
    parts = getattr(rest, 'geoms', [rest])
    return [(g.coords[0], g.coords[-1]) for g in parts if not g.is_empty]


def seg_path(segs, attrs):
    d = ''.join(f'M{fmt(A[0])},{fmt(A[1])}L{fmt(B[0])},{fmt(B[1])}' for A, B in segs if math.dist(A, B) > 1)
    return f'<path d="{d}" {attrs}/>'


def label(dot, elbow, text_x, title, sub, colour=ORANGE, anchor='start', title_y=None, sub_y=None):
    """Leader dot + free-angle diagonal to elbow + 20px level tail, then caps title and grey subline.
    Leaders are annotation, not geometry, so the diagonal can take any angle.
    dot, elbow are screen points; the tail runs from elbow towards text_x and stops 7px short."""
    (dx, dy), (ex, ey) = dot, elbow
    tail = text_x - 7 if anchor == 'start' else text_x + 7
    ty = ey + 4.5 if title_y is None else title_y
    sy = ty + 15 if sub_y is None else sub_y
    out = [f'<g class="co"><polyline points="{fmt(dx)},{fmt(dy)} {fmt(ex)},{fmt(ey)} {fmt(tail)},{fmt(ey)}" '
           f'fill="none" stroke="{colour}" stroke-width="1.2" stroke-opacity="0.55"/>'
           f'<circle cx="{fmt(dx)}" cy="{fmt(dy)}" r="3" fill="{colour}" stroke="{INK}" stroke-width="1.5"/></g>',
           f'<text x="{fmt(text_x)}" y="{fmt(ty)}" font-size="13" font-weight="600" letter-spacing="0.78" fill="{colour}" text-anchor="{anchor}">{title}</text>']
    if sub:
        out.append(f'<text x="{fmt(text_x)}" y="{fmt(sy)}" font-size="11" font-weight="400" fill="{GREY}" text-anchor="{anchor}">{sub}</text>')
    return out


def doc(title, body, translate=None, view=(640, 480)):
    vw, vh = view
    g = f' transform="translate({translate[0]},{translate[1]})"' if translate else ''
    return '\n'.join([
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vw} {vh}" width="{vw}" height="{vh}" role="img" aria-label="{title}">',
        f'<title>{title}</title>',
        font_style('\n'.join(body)),     # <img> SVGs can't see the page's fonts, so carry the letters they use
        f'<g{g} font-family="{FONT}" stroke-linecap="round" stroke-linejoin="round">',
        *body, '</g>', '</svg>', ''])


def write(path, text):
    open(path, 'w', encoding='utf-8', newline='\n').write(text)
