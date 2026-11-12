"""Shared pieces for the gen_*.py drawing scripts: palette, faces, iso circles, labels, the SVG wrapper.
Colours match docs/drawing-tools.md "Drawing rules" and the drawing palette in src/styles/tokens.css."""
import hashlib, html, math, re
from shapely.geometry import LineString, MultiPoint, Point, box as box_shape
from iso import fmt
from svgfont import font_style
import palette as pal

FACES = (pal.LEFT, pal.RIGHT, pal.TOP)      # left, right, top
HIGH = (pal.HI_LEFT, pal.HI_RIGHT, pal.HI_TOP)
EDGE = f'stroke="{pal.EDGE}" stroke-width="1" stroke-opacity="0.3"'
FLOOR_LINE = pal.GRID
ORANGE, BLUE, GREY, INK = pal.AMBER, pal.SKY, pal.GREY, pal.PAGE
FONT = "Barlow, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"


def box(w, b, cols=FACES, edge=EDGE, classes=('', '', ''), tail='', log=None):
    """A box as its (left, right, top) face triple, the order painter.py expects. b = (x0, x1, y0, y1, z0, z1).
    classes: a class per face ('' for none); tail: attributes after the edge's; log: a list b is appended to (a
    generator's BOXES, which its rules_NAME.py reads). Every generator draws its boxes through this,
    except gen_campus.py, whose faces carry classes only (footer.css colours them)."""
    if log is not None:
        log.append(b)
    return [f'<polygon {f"class={chr(34)}{c}{chr(34)} " if c else ""}points="{pts}" fill="{col}" {edge}{tail}/>'
            for pts, col, c in zip(w.box(*b), cols, classes)]


def faces(w, x0, x1, y0, y1, z0, z1, cols=FACES, extra=''):
    """box() with the standard edge and extra attributes, for generators that don't keep a BOXES list."""
    return box(w, (x0, x1, y0, y1, z0, z1), cols, EDGE, tail=extra)


def esc(text):
    """Words for an SVG text node or a double-quoted attribute: &, <, > and " escaped, so a label like 'R&D' can't
    break the file (an apostrophe is left as it is)."""
    return html.escape(text, quote=False).replace('"', '&quot;')


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
    return seg_path(segs, f'class="floor" fill="none" stroke="{FLOOR_LINE}" stroke-width="1" stroke-opacity="0.8"')   # class: check.py


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


PLAIN_CSS = '<style>svg:target .lbl{display:none}</style>'   # drawing.svg#plain (cards) hides the labels


def number_badges(body):
    """Strips any numbered dot still drawn by hand (the hero's cloud piece); phones get the compact cut instead."""
    return re.sub(r'<g class="num">.*?</g>', '', body, flags=re.S)


def key_group(title, sub=''):
    """Opening tag for one label; data-t / data-s keep its words with it."""
    return f'<g class="lbl" data-t="{html.escape(title.replace(chr(10), " "))}" data-s="{html.escape((sub or "").replace(chr(10), " "))}">'


def key_css():
    """The #plain rule every drawing carries."""
    return PLAIN_CSS


def label(dot, elbow, text_x, title, sub, colour=ORANGE, anchor='start', title_y=None, sub_y=None, scale=1.0):
    """Leader dot + free-angle diagonal to elbow + 20px level tail, then caps title and grey subline.
    Leaders are annotation, not geometry, so the diagonal can take any angle.
    dot, elbow are screen points; the tail runs from elbow towards text_x and stops 7px short.
    scale enlarges text, dot and gaps together (the compact phone cut uses about 1.6).
    A '\n' in title or sub wraps it; the subline moves down to clear a wrapped title."""
    (dx, dy), (ex, ey) = dot, elbow
    k = scale
    tail = text_x - 7 * k if anchor == 'start' else text_x + 7 * k
    ty = ey + 4.5 * k if title_y is None else title_y
    titles = [esc(t) for t in title.split('\n')]
    sy = ty + 15 * k * len(titles) if sub_y is None else sub_y
    out = [key_group(title, sub) + f'<g class="co lt"><polyline points="{fmt(dx)},{fmt(dy)} {fmt(ex)},{fmt(ey)} {fmt(tail)},{fmt(ey)}" '
           f'fill="none" stroke="{colour}" stroke-width="{1.2 * k:.3g}" stroke-opacity="0.55"/>'
           f'<circle cx="{fmt(dx)}" cy="{fmt(dy)}" r="{3 * k:.3g}" fill="{colour}" stroke="{INK}" stroke-width="{1.5 * k:.3g}"/></g>',
           *(f'<text class="lt" x="{fmt(text_x)}" y="{fmt(ty + n * 15 * k)}" font-size="{13 * k:.3g}" font-weight="600" letter-spacing="{0.78 * k:.3g}" fill="{colour}" text-anchor="{anchor}">{line}</text>'
             for n, line in enumerate(titles))]
    for n, line in enumerate((sub or '').split('\n') if sub else []):   # a '\n' in sub wraps it (compact cuts)
        out.append(f'<text class="lt" x="{fmt(text_x)}" y="{fmt(sy + n * 13 * k)}" font-size="{11 * k:.3g}" font-weight="400" fill="{GREY}" text-anchor="{anchor}">{esc(line)}</text>')
    out.append('</g>')
    return out


TEXT_PAD = ((15, 3), (12, 5))   # label_text_gaps: px kept clear above and below the title, then the subline (above scales)
ROOMY_PAD = ((18, -1), (16, 8))  # the same for the full cuts of helpdesk and network, which keep more room round their words


def label_text_gaps(L, k=1.0, pad=TEXT_PAD):
    """Where floor lines stop around one label drawn by label(): its (maybe wrapped) title, its (maybe wrapped)
    subline and its level tail. L is a label dict (elbow, x, anchor, sub, the measured widths tw and sw, and title if
    it wraps); k is its scale; pad is ((above, below) the title, (above, below) the subline) in px."""
    ex, ey = L['elbow']; x = L['x']
    titles = L.get('title', '').count('\n') + 1
    ty = ey + 4.5 * k; sy = ty + 15 * k * titles          # where label() puts them
    lines = L['sub'].count('\n') + 1
    t0, t1 = (x - L['tw'] * k - 5, x + 5) if L['anchor'] == 'end' else (x - 5, x + L['tw'] * k + 5)
    s0, s1 = (x - L['sw'] * k - 5, x + 5) if L['anchor'] == 'end' else (x - 5, x + L['sw'] * k + 5)
    (ta, tb), (sa, sb) = pad
    return [box_shape(min(t0, ex - 4), ty - ta * k, max(t1, ex + 4), ty + (titles - 1) * 15 * k + tb),
            box_shape(s0, sy - sa * k, s1, sy + (lines - 1) * 13 * k + sb)]


def doc(title, body, translate=None, view=(640, 480), crop=None):
    """The SVG wrapper. crop = (x, y, w, h) makes the compact phone cut: the same drawing framed closer
    (keep it 4:3 so it swaps in for the full one without moving the layout)."""
    vw, vh = view
    g = f' transform="translate({translate[0]},{translate[1]})"' if translate else ''
    body = '\n'.join(body)
    view_box, css = (' '.join(f'{v:g}' for v in crop) if crop else f'0 0 {vw} {vh}'), PLAIN_CSS
    return '\n'.join([
        f'<svg xmlns="http://www.w3.org/2000/svg" id="plain" viewBox="{view_box}" width="{vw}" height="{vh}" role="img" aria-label="{esc(title)}">',
        f'<title>{esc(title)}</title>',
        font_style(body),     # <img> SVGs can't see the page's fonts, so carry the letters they use
        css,
        f'<g{g} font-family="{FONT}" stroke-linecap="round" stroke-linejoin="round">',
        body, '</g>', '</svg>', ''])


def card(svg):
    """The card cut (NAME-card.svg): the compact cut with its labels taken out, and so the letters they needed.
    Cards show a drawing small and wordless; NAME-compact.svg#plain only hid the labels and still carried the font."""
    parts, pos = [], 0
    while m := re.compile(r'<g class="(?:[^"]* )?lbl[ "]').search(svg, pos):   # "lbl", or "co lbl" (gen_office)
        start = m.start()
        parts.append(svg[pos:start])
        depth = 0
        for t in re.finditer(r'<g[\s>]|</g>', svg[start:]):
            depth += -1 if t.group() == '</g>' else 1
            if depth == 0:
                pos = start + t.end()
                break
        else:                                  # no closing </g>: stop, rather than find this label again forever
            raise ValueError(f'card(): the label group at character {start} has no closing </g>')
    svg = ''.join(parts) + svg[pos:]
    svg = svg.replace(PLAIN_CSS + '\n', '').replace(PLAIN_CSS, '')
    return re.sub(r'<style>@font-face.*?</style>', lambda _m: font_style(svg), svg, count=1, flags=re.S)


def hoist_styles(text):
    """Every style="" attribute becomes a class named after its declarations (s-<hash>) with one rule, so the CSP can
    drop 'unsafe-inline' (a hash covers a <style> block, never an attribute). The rule doubles the class so it
    outranks the page CSS's one-class rules whatever order the <style> blocks land in on the page, as the attribute
    did. The same declarations get the same class in every file, so the hero and its flow layer agree."""
    rules = {}

    def tag(m):
        t = m.group(0)
        st = re.search(r' style="([^"]*)"', t)
        if not st:
            return t
        name = 's-' + hashlib.sha1(st.group(1).encode()).hexdigest()[:6]
        rules[name] = st.group(1)
        t = t[:st.start()] + t[st.end():]
        if ' class="' in t:
            return t.replace(' class="', f' class="{name} ', 1)
        return re.sub(r'^(<[\w:-]+)', rf'\1 class="{name}"', t)
    out = re.sub(r'<[A-Za-z][^>]*>', tag, text)
    return out, ''.join(f'.{n}.{n}{{{d}}}' for n, d in sorted(rules.items()))


def write(path, text, card_cut=True):
    """Writes a drawing; a compact cut also gets its card cut next to it, unless no card shows it (card_cut=False)."""
    open(path, 'w', encoding='utf-8', newline='\n').write(text)
    if card_cut and str(path).endswith('-compact.svg'):
        write(str(path).replace('-compact.svg', '-card.svg'), card(text))
