"""Shared pieces for the gen_*.py drawing scripts: palette, faces, iso circles, labels, the SVG wrapper.
Colours match README "Drawing rules" and the drawing palette in site/assets/css/tokens.css."""
import math
from shapely.geometry import LineString, MultiPoint, Point
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


def silhouette(w, x0, x1, y0, y1, z0, z1):
    """A box's outline on screen (shapely), for masking floor lines drawn under it."""
    return MultiPoint([w.p(x, y, z) for x in (x0, x1) for y in (y0, y1) for z in (z0, z1)]).convex_hull


def floor_grid(w, centre, r, mask, step=1, phase=(0, 0), min_seg=0):
    """Floor lines inside an iso disc of radius r, cut by mask.
    Lines sit at x = phase[0] + k*step and y = phase[1] + k*step (world units).
    Pieces shorter than min_seg px are dropped (slivers peeking out beside a box)."""
    cx, cy = centre
    segs = []
    for axis in (0, 1):
        c0, ph = (cx, phase[0]) if axis == 0 else (cy, phase[1])
        k0, k1 = math.floor((c0 - r - ph) / step), math.ceil((c0 + r - ph) / step)
        for k in range(k0, k1 + 1):
            c = ph + k * step
            if abs(c - c0) >= r: continue
            s = math.sqrt(r * r - (c - c0) ** 2)
            a, b = ((c, cy - s), (c, cy + s)) if axis == 0 else ((cx - s, c), (cx + s, c))
            segs += clip_out(w.p(*a), w.p(*b), mask)
    segs = [(a, b) for a, b in segs if math.dist(a, b) >= min_seg]
    return seg_path(segs, f'fill="none" stroke="{FLOOR_LINE}" stroke-width="1" stroke-opacity="0.8"')


def disc_arcs(w, r, x=0, y=0, z=0, mask=None, attrs=f'fill="none" stroke="{FLOOR_LINE}" stroke-width="1.2"'):
    """An iso circle as exact SVG arcs, leaving out the parts inside mask (labels, objects in front)."""
    rx, ry, (cx, cy) = iso_ellipse(w, r, x, y, z)
    at = lambda t: (cx + rx * math.cos(t), cy + ry * math.sin(t))
    inside = lambda t: mask is not None and mask.contains(Point(at(t)))
    n = 3600
    ts = [2 * math.pi * k / n for k in range(n)]
    hits = [inside(t) for t in ts]
    if not any(hits):
        return f'<ellipse cx="{fmt(cx)}" cy="{fmt(cy)}" rx="{fmt(rx)}" ry="{fmt(ry)}" {attrs}/>'
    if all(hits):
        return ''
    def edge(a, b):                          # bisect where the rim crosses the mask's edge
        ia = inside(a)
        for _ in range(40):
            m = (a + b) / 2
            if inside(m) == ia: a = m
            else: b = m
        return (a + b) / 2
    start = hits.index(True)                 # walk from inside the mask so runs don't wrap
    d, t0 = '', None
    for i in range(1, n + 1):
        j, k = (start + i) % n, (start + i - 1) % n
        a, b = start + i - 1, start + i      # unwrapped sample numbers
        if hits[k] and not hits[j]: t0 = edge(2 * math.pi * a / n, 2 * math.pi * b / n)
        if not hits[k] and hits[j]:
            t1 = edge(2 * math.pi * a / n, 2 * math.pi * b / n)
            span = t1 - t0
            if span * rx >= 1:
                (x0, y0), (x1, y1) = at(t0), at(t1)
                d += f'M{fmt(x0)},{fmt(y0)}A{fmt(rx)},{fmt(ry)} 0 {int(span > math.pi)} 1 {fmt(x1)},{fmt(y1)}'
    return f'<path d="{d}" {attrs}/>'


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
