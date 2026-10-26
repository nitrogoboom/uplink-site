"""Draws the growing tower (home page "grow" section) from a world-space description.
Writes the inline <svg class="tg"> in site/index.html and the reference copy site/assets/img/tower-grow.svg.
Edit the numbers below and run again; don't hand-edit either copy.
usage: python tools/gen_tower.py site
World: 1 unit = 24px, W(262, 283.2, 24). Origin = back corner of the ground slab's top. x runs right-down, y left-down, z up.
home.js only sets data-floors on the <svg>; the <style> inside hides upper floors and drops the roof.
Keep the classes (tg-ground, tg-floor + data-f, tg-roof, tg-front, tg-w/wl/wr/on, tg-tl/td/tb/tt) and group order.
"""
import pathlib, sys
from shapely.ops import unary_union
from shapely.geometry import Polygon
from iso import W, fmt
from isogen import FACES, HIGH, BLUE, ORANGE, INK, EDGE, FONT, silhouette, clip_out, seg_path
from svgfont import font_style

w = W(262, 283.2, 24)

GROUND = 11.7                         # ground slab is GROUND x GROUND, top at z = 0
GROUND_T = 0.8                        # slab thickness
GROUND_TOP = '#1E2938'
GRID = range(0, 12)                   # ground lines at x = k and y = k
LAWN_INSET = 0.4                      # faint green tint, inset from the slab edge
B0, B1 = 1.2, 9.2                     # building footprint, x and y
FLOOR = 3.2                           # storey height
FLOORS = 3
CORNICE = (0.25, 0.3)                 # overhang each side, depth below the storey top
WIN_SPANS = [(2.2, 3.6), (4.5, 5.9), (6.8, 8.2)]      # along each wall
WIN_Z = (0.95, 2.35)                  # sill and head, from the storey floor
WIN_ON = {1: {'r': [2]}, 2: {'l': [0, 2], 'r': [1]}, 3: {}}   # windows lit from the start (tg-on), by storey
DOOR = (4.55, 5.85, 2.1)              # on the front-left wall (y = B1): x from, x to, height
AWNING = (4.2, 6.2, 0.9, 2.2, 0.18)   # x from, x to, depth out from the wall, z, thickness
STEP = (4.25, 6.15, 0.6, 0.14)        # x from, x to, depth out from the wall, height
WALK = (4.4, 6.0)                     # path from the door to the slab edge, x from, x to
WALK_LINE = (10.05, 10.15)            # thin seam across the path, y from, y to
LABEL_DOT = (B1, 1.7, 1.85)           # leader dot on the front-right wall: x, y, z above the storey floor
LABEL_GAP = 48.4                      # px from dot to the label pill
PILL_PAD, PILL_H = 14, 30
LABELS = [('1–10 people', 117.7), ('11–50 people', 125.8), ('51–150 people', 133.9)]   # text, pill width (px)
ROOF = (1.7, 8.7, 0.35)               # roof slab: from, to (x and y), thickness
HVAC = (2.3, 4.7, 5.8, 7.6, 1.0)      # x0, x1, y0, y1, height (on the roof)
FAN = (2.7, 3.7, 6.1, 7.1, 0.25)      # on top of the HVAC unit
PLANTER = (5.6, 7.1, 2.5, 4.0, 0.5)   # on the roof
MAST = (7.4, 3.25)                    # at x = y = MAST[0], height above the roof
WIFI = [(9, 0.8), (16, 0.5)]          # signal arcs round the mast top: radius px, opacity
TREES = [(1.28, 10.63, 0.9), (10.675, 10.925, 0.75)]   # centre x, y, scale
TREE = [(0.5, 1.0), (1.4, 1.2), (0.9, 0.8)]          # trunk, canopy, top: width, height (x scale)
BUSHES = [(2.3, 9.65), (9.9, 3.2), (3.2, 10.3), (9.9, 4.2), (6.2, 9.6), (7.2, 10.3), (10.55, 7.8)]   # back corner x, y
BUSH = (0.9, 0.55)                    # width, height

GREEN = ('#4E9C78', '#3C7C60', '#6FD3A0')
GREEN_EDGE = 'stroke="#D9E4F0" stroke-width="1" stroke-opacity="0.22"'
AWNING_EDGE = 'stroke="#FFE6C4" stroke-width="1" stroke-opacity="0.55"'
WALL_LINE = 'fill="none" stroke="#D9E4F0" stroke-width="0.8" stroke-opacity="0.3"'
TITLE = 'Isometric office building that grows from one to three storeys as a company grows'

STYLE = '''<style>.tg-floor,.tg-roof{transition:opacity .6s ease,transform .6s ease}
.tg-w{fill:#1F2A3B;transition:fill .6s ease,fill-opacity .6s ease}
.tg-w.tg-on{fill:#7DB9E8;fill-opacity:.6}
.tg-wr.tg-on{fill-opacity:.42}
.tg-tl{stroke:#7DB9E8;transition:stroke .6s ease}
.tg-td{fill:#7DB9E8;stroke:#151E2C;stroke-width:2;transition:fill .6s ease}
.tg-tb{fill:#1E2938;stroke:#7DB9E8;stroke-opacity:.4;stroke-width:1;transition:stroke .6s ease,stroke-opacity .6s ease}
.tg-tt{fill:#F1F4F8;text-transform:uppercase;transition:fill .6s ease}
.tg[data-floors="1"] .tg-floor[data-f="2"],.tg[data-floors="1"] .tg-floor[data-f="3"],.tg[data-floors="2"] .tg-floor[data-f="3"]{opacity:0;transform:translateY(-30px);pointer-events:none}
.tg[data-floors="2"] .tg-roof{transform:translateY(76.8px)}
.tg[data-floors="1"] .tg-roof{transform:translateY(153.6px)}
.tg[data-floors="1"] .tg-floor[data-f="1"] .tg-w,.tg[data-floors="2"] .tg-floor[data-f="2"] .tg-w,.tg[data-floors="3"] .tg-floor[data-f="3"] .tg-w,.tg:not([data-floors]) .tg-floor[data-f="3"] .tg-w{fill:#F7B868;fill-opacity:1}
.tg[data-floors="1"] .tg-floor[data-f="1"] .tg-wr,.tg[data-floors="2"] .tg-floor[data-f="2"] .tg-wr,.tg[data-floors="3"] .tg-floor[data-f="3"] .tg-wr,.tg:not([data-floors]) .tg-floor[data-f="3"] .tg-wr{fill:#E2953F}
.tg[data-floors="1"] .tg-floor[data-f="1"] .tg-tl,.tg[data-floors="2"] .tg-floor[data-f="2"] .tg-tl,.tg[data-floors="3"] .tg-floor[data-f="3"] .tg-tl,.tg:not([data-floors]) .tg-floor[data-f="3"] .tg-tl{stroke:#F4A340}
.tg[data-floors="1"] .tg-floor[data-f="1"] .tg-td,.tg[data-floors="2"] .tg-floor[data-f="2"] .tg-td,.tg[data-floors="3"] .tg-floor[data-f="3"] .tg-td,.tg:not([data-floors]) .tg-floor[data-f="3"] .tg-td{fill:#F4A340}
.tg[data-floors="1"] .tg-floor[data-f="1"] .tg-tb,.tg[data-floors="2"] .tg-floor[data-f="2"] .tg-tb,.tg[data-floors="3"] .tg-floor[data-f="3"] .tg-tb,.tg:not([data-floors]) .tg-floor[data-f="3"] .tg-tb{stroke:#F4A340;stroke-opacity:.9}
.tg[data-floors="1"] .tg-floor[data-f="1"] .tg-tt,.tg[data-floors="2"] .tg-floor[data-f="2"] .tg-tt,.tg[data-floors="3"] .tg-floor[data-f="3"] .tg-tt,.tg:not([data-floors]) .tg-floor[data-f="3"] .tg-tt{fill:#F4A340}
@media (prefers-reduced-motion:reduce){.tg-floor,.tg-roof,.tg-w,.tg-tl,.tg-td,.tg-tb,.tg-tt{transition:none!important}}</style>'''


def box(x0, x1, y0, y1, z0, z1, cols=FACES, edge=EDGE):
    """A box's (left, right, top) faces. Every box goes through here so painter rules can list them (BOXES)."""
    BOXES.append((x0, x1, y0, y1, z0, z1))
    return [f'<polygon points="{pts}" fill="{c}" {edge}/>' for pts, c in zip(w.box(x0, x1, y0, y1, z0, z1), cols)]


def flat(pts, attrs):
    return f'<polygon points="{w.pts(*pts)}" {attrs}/>'


def tree_boxes(cx, cy, s):
    out, z = [], 0
    for size, h in TREE:
        r = size * s / 2
        out.append((cx - r, cx + r, cy - r, cy + r, z, z + h * s))
        z += h * s
    return out


def bush_box(x0, y0):
    return (x0, x0 + BUSH[0], y0, y0 + BUSH[0], 0, BUSH[1])


def door_boxes():
    a0, a1, ad, az, at = AWNING
    s0, s1, sd, sh = STEP
    return (a0, a1, B1, B1 + ad, az, az + at), (s0, s1, B1, B1 + sd, 0, sh)


def door_front():
    """Door, awning and step on the ground storey."""
    d0, d1, dh = DOOR
    awning, step = door_boxes()
    return ([flat([(d0, B1, 0), (d1, B1, 0), (d1, B1, dh), (d0, B1, dh)], f'fill="#1F2A3B" stroke="{BLUE}" stroke-width="0.9" stroke-opacity="0.5"')]
            + box(*awning, HIGH, AWNING_EDGE) + box(*step))


def ground(mask):
    g = GROUND
    out = box(0, g, 0, g, -GROUND_T, 0, (FACES[0], FACES[1], GROUND_TOP))
    segs = []
    for k in GRID:
        segs += clip_out(w.p(k, 0), w.p(k, g), mask)
        segs += clip_out(w.p(0, k), w.p(g, k), mask)
    out.append(seg_path([s for s in segs if abs(s[0][0] - s[1][0]) + abs(s[0][1] - s[1][1]) >= 3],
                        'fill="none" stroke="#2C3849" stroke-width="0.8" stroke-opacity="0.5"'))
    i = LAWN_INSET
    out.append(flat([(i, i), (g - i, i), (g - i, g - i), (i, g - i)], 'fill="#6FD3A0" fill-opacity="0.13"'))
    out.append(flat([(WALK[0], B1), (WALK[1], B1), (WALK[1], g), (WALK[0], g)], f'fill="{FACES[2]}" fill-opacity="0.95"'))
    out.append(flat([(WALK[0], WALK_LINE[0]), (WALK[1], WALK_LINE[0]), (WALK[1], WALK_LINE[1]), (WALK[0], WALK_LINE[1])], f'fill="{FACES[0]}"'))
    return out


def windows(z0, lit):
    lo, hi = z0 + WIN_Z[0], z0 + WIN_Z[1]
    walls = [('l', lambda a, b: [(a, B1, lo), (b, B1, lo), (b, B1, hi), (a, B1, hi)]),
             ('r', lambda a, b: [(B1, a, lo), (B1, b, lo), (B1, b, hi), (B1, a, hi)])]
    spans = {'l': WIN_SPANS if z0 else [WIN_SPANS[0], WIN_SPANS[2]], 'r': WIN_SPANS}   # ground storey: door in the middle
    frames, panes = [], []
    for side, quad in walls:
        for i, (a, b) in enumerate(spans[side]):
            pts = w.pts(*quad(a, b))
            frames.append(f'<polygon points="{pts}" {WALL_LINE}/>')
            on = ' tg-on' if i in lit.get(side, []) else ''
            panes.append(f'<polygon class="tg-w tg-w{side}{on}" points="{pts}"/>')
    return frames + panes


def storey(f):
    z0 = (f - 1) * FLOOR
    o, d = CORNICE
    out = box(B0, B1, B0, B1, z0, z0 + FLOOR)
    out += box(B0 - o, B1 + o, B0 - o, B1 + o, z0 + FLOOR - d, z0 + FLOOR)
    out += windows(z0, WIN_ON[f])
    if f == 1:
        out += door_front()
    text, width = LABELS[f - 1]
    x, y, z = LABEL_DOT
    dx, dy = w.p(x, y, z0 + z)
    rx = dx + LABEL_GAP
    out += [f'<line class="tg-tl" x1="{fmt(dx)}" y1="{fmt(dy)}" x2="{fmt(rx)}" y2="{fmt(dy)}" stroke-width="1.2" stroke-opacity="0.7"/>',
            f'<circle class="tg-td" cx="{fmt(dx)}" cy="{fmt(dy)}" r="4"/>',
            f'<rect class="tg-tb" x="{fmt(rx)}" y="{fmt(dy - PILL_H / 2)}" width="{fmt(width)}" height="{PILL_H}" rx="8"/>',
            f'<text class="tg-tt" x="{fmt(rx + PILL_PAD)}" y="{fmt(dy + 4.5)}" font-size="13" font-weight="600" letter-spacing="0.06em">{text}</text>']
    return out


def roof():
    top = FLOORS * FLOOR
    r0, r1, rt = ROOF
    z = top + rt
    out = box(r0, r1, r0, r1, top, z)
    x0, x1, y0, y1, h = HVAC
    out += box(x0, x1, y0, y1, z, z + h)
    fx0, fx1, fy0, fy1, fh = FAN
    out += box(fx0, fx1, fy0, fy1, z + h, z + h + fh)
    px0, px1, py0, py1, ph = PLANTER
    out += box(px0, px1, py0, py1, z, z + ph, GREEN, GREEN_EDGE)
    m, mh = MAST
    (bx, by), (tx, ty) = w.p(m, m, z), w.p(m, m, z + mh)
    out.append(f'<polyline points="{fmt(bx)},{fmt(by)} {fmt(tx)},{fmt(ty)}" fill="none" stroke="#D9E4F0" stroke-width="1.6" stroke-opacity="0.8"/>')
    out.append(f'<circle cx="{fmt(tx)}" cy="{fmt(ty)}" r="4" fill="{ORANGE}" stroke="{INK}" stroke-width="2"/>')
    for r, o in WIFI:
        k = r / 2 ** 0.5
        out.append(f'<path d="M{fmt(tx - k)},{fmt(ty - k)} A{r},{r} 0 0 1 {fmt(tx + k)},{fmt(ty - k)}" fill="none" stroke="{BLUE}" stroke-width="1.4" stroke-opacity="{o}"/>')
    return out


def front():
    """Trees and bushes, in the original draw order: each tree's trunk and canopy, the bush behind it, then its top."""
    t1, t2 = (tree_boxes(*t) for t in TREES)
    b = [bush_box(*p) for p in BUSHES]
    trunk, leaf = [t1[0], t2[0]], [t1[1], t1[2], t2[1], t2[2]] + b
    order = [t1[0], t1[1], b[0], t1[2], *b[1:], t2[0], t2[1], t2[2]]
    out = []
    for bx in order:
        out += box(*bx) if bx in trunk else box(*bx, GREEN, GREEN_EDGE)
    assert all(bx in trunk or bx in leaf for bx in order)
    return out


def floor_mask():
    """What always stands on the ground in front of it: the ground storey, its door bits, trees, bushes and the path.
    Upper storeys come and go with data-floors, so they don't hide floor lines."""
    o = CORNICE[0]
    shapes = [silhouette(w, B0, B1, B0, B1, 0, FLOOR), silhouette(w, B0 - o, B1 + o, B0 - o, B1 + o, FLOOR - CORNICE[1], FLOOR)]
    shapes += [silhouette(w, *b) for b in door_boxes()]
    shapes += [silhouette(w, *bx) for t in TREES for bx in tree_boxes(*t)]
    shapes += [silhouette(w, *bush_box(*p)) for p in BUSHES]
    shapes.append(Polygon([w.p(WALK[0], B1), w.p(WALK[1], B1), w.p(WALK[1], GROUND), w.p(WALK[0], GROUND)]))
    return unary_union(shapes)


def build(embed_font):
    BOXES.clear()
    body = ['<g class="tg-ground">', *ground(floor_mask()), '</g>']
    for f in range(1, FLOORS + 1):
        body += [f'<g class="tg-floor" data-f="{f}">', *storey(f), '</g>']
    body += ['<g class="tg-roof">', *roof(), '</g>', '<g class="tg-front">', *front(), '</g>']
    text = '\n'.join(body)
    return '\n'.join([
        f'<svg xmlns="http://www.w3.org/2000/svg" class="tg" data-floors="3" viewBox="0 0 640 640" width="640" height="640" role="img" aria-label="{TITLE}">',
        f'<title>{TITLE}</title>',
        STYLE + (font_style(text) if embed_font else ''),
        f'<g font-family="{FONT}" stroke-linecap="round" stroke-linejoin="round">',
        text, '</g>', '</svg>'])


BOXES = []


if __name__ == '__main__':
    site = pathlib.Path(sys.argv[1])
    open(site / 'assets/img/tower-grow.svg', 'w', encoding='utf-8', newline='\n').write(build(True) + '\n')
    page = site / 'index.html'
    html = open(page, encoding='utf-8', newline='').read()        # read fresh: other tools edit this file too
    start = html.index('<svg xmlns="http://www.w3.org/2000/svg" class="tg"')
    end = html.index('</svg>', start) + len('</svg>')
    nl = '\r\n' if '\r\n' in html[:2000] else '\n'
    html = html[:start] + build(False).replace('\n', nl) + html[end:]
    open(page, 'w', encoding='utf-8', newline='').write(html)
