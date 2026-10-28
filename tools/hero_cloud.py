"""The hero's 3D cloud: a flat cloud face pushed back into a slab, drawn in true isometric.
Used by gen_office.py (it fills {{CLOUD_SHAPES}} in tools/office_parts/hero_cloud.svg). Edit the numbers and rerun
gen_office.py; don't hand-edit the SVG.

The face is a union of circles on a plane that runs along the room's x axis (u across, v up). Screen = origin +
u * (cos30, 0.5) + v * (0, -1). The slab runs back along -y, which on screen is DEPTH * (cos30, -0.5).
Each outline segment sweeps one strip of the side wall; strips are shaded by their normal and merged when the shade
repeats, so the wall is one smooth ramp with no seams, and the face carries its own soft gradient.
"""
import math
from shapely.geometry import Point, Polygon, box
from shapely.geometry.polygon import orient
from shapely.ops import unary_union
import palette as pal

C30 = math.cos(math.pi / 6)
ORIGIN = (899.6, 8.8)                 # screen point of u = 0, v = 0 (bottom-left of the face)
DEPTH = 56.0                          # slab thickness, in plane units (48.5 px across, 28 px up on screen)

# bumps: centre u, centre v, radius (plane units). Fitted to the earlier hand-drawn outline.
CIRCLES = [
    (10.2, 29.4, 29.4),               # left end
    (61.4, 58.8, 51.2),               # small left bump
    (143.3, 84.5, 69.1),              # big bump
    (220.2, 53.8, 40.9),              # small right bump
    (258.5, 29.4, 29.4),              # right end
]
BASE_TOP = 29.4                       # the body under the bumps: flat bottom at v = 0, from the left end to the right end
FILLET = 3.5                          # rounds the notches where two bumps meet
SEG = 24                              # segments per quarter circle: 2px or less along the outline, a hair off true at every zoom

RIM, RIM_OP, RIM_W = pal.SKY, 0.75, 1.4
SIDE_DARK, SIDE_LIGHT = (tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) for c in (pal.CLOUD_SIDE_DARK, pal.CLOUD_SIDE_LIGHT))
FACE_TOP, FACE_BOT = pal.CLOUD_TOP, pal.CLOUD_BOT
SHADES = 56                           # steps in the side-wall ramp (finer than the 8-bit colour can show)
GID = 'hc'                            # id prefix for the gradients


def screen(u, v):
    return (ORIGIN[0] + u * C30, ORIGIN[1] + u * 0.5 - v)


DX, DY = DEPTH * C30, -DEPTH * 0.5      # slab direction on screen: (+48.5, -28)


def face():
    parts = [Point(cx, cy).buffer(r, SEG) for cx, cy, r in CIRCLES]
    parts.append(box(CIRCLES[0][0], 0, CIRCLES[-1][0], BASE_TOP))
    shape = unary_union(parts).intersection(box(-100, 0, 400, 300))
    shape = shape.buffer(FILLET, SEG).buffer(-FILLET, SEG)
    return orient(shape.simplify(0.02), 1.0)


def hexc(c):
    return '#%02X%02X%02X' % tuple(round(x) for x in c)


def shade(n):
    """0 = dark (faces right), 1 = light (faces up); a smooth ramp over the normal."""
    t = 0.5 + 0.5 * (n[1] - 0.45 * n[0])
    t = max(0.0, min(1.0, t))
    t = t * t * (3 - 2 * t)                           # smoothstep: no kink where the ramp starts and ends
    return round(t * SHADES) / SHADES


def pts(seq):
    return ' '.join(f'{x:.2f},{y:.2f}' for x, y in seq)


def path(coords):
    c = list(coords)
    return 'M' + 'L'.join(f'{x:.2f},{y:.2f}' for x, y in c[:-1]) + 'Z'


def cloud_shapes():
    f = face()
    ring = list(f.exterior.coords)
    # side wall: one strip per outline segment, kept when its outward normal faces the viewer (right or up)
    strips = []                                       # (key, shade, quad in screen space)
    for (u0, v0), (u1, v1) in zip(ring, ring[1:]):
        du, dv = u1 - u0, v1 - v0
        ln = math.hypot(du, dv)
        if ln < 1e-9:
            continue
        n = (dv / ln, -du / ln)                       # outward normal of a counter-clockwise outline
        if n[0] + n[1] <= 0.02:
            continue
        a, b = screen(u0, v0), screen(u1, v1)
        quad = Polygon([a, b, (b[0] + DX, b[1] + DY), (a[0] + DX, a[1] + DY)])
        strips.append(((u0 + u1 + v0 + v1) / 4, shade(n), quad))
    # far to near, then merge neighbours of the same shade into one shape
    strips.sort(key=lambda s: s[0])
    runs = []
    for key, sh, quad in strips:
        if runs and runs[-1][0] == sh and abs(runs[-1][2] - key) < 6:
            runs[-1][1].append(quad); runs[-1][2] = key
        else:
            runs.append([sh, [quad], key])
    out = []
    for sh, quads, _ in runs:
        col = hexc(tuple(d + (l - d) * sh for d, l in zip(SIDE_DARK, SIDE_LIGHT)))
        poly = unary_union(quads).buffer(0.05, join_style=2).simplify(0.04)
        for g in (poly.geoms if hasattr(poly, 'geoms') else [poly]):
            out.append(f'<path d="{path(g.exterior.coords)}" fill="{col}" stroke="{col}" stroke-width="0.7" stroke-linejoin="round"/>')
    face_s = Polygon([screen(u, v) for u, v in ring])
    sil = unary_union([face_s] + [q for _, _, q in strips]).buffer(0.05, join_style=2).simplify(0.04)
    ys = [y for _, y in face_s.exterior.coords]
    top, bot = min(ys), max(ys)
    defs = (f'<defs><linearGradient id="{GID}-f" gradientUnits="userSpaceOnUse" x1="0" y1="{top:.1f}" x2="0" y2="{bot:.1f}">'
            f'<stop offset="0" stop-color="{FACE_TOP}"/><stop offset="1" stop-color="{FACE_BOT}"/></linearGradient></defs>')
    rim = f'fill="none" stroke="{RIM}" stroke-width="{RIM_W}" stroke-opacity="{RIM_OP}" stroke-linejoin="round"'
    return '\n'.join([
        defs, *out,
        f'<path d="{path(face_s.exterior.coords)}" fill="url(#{GID}-f)"/>',
        f'<path d="{path(sil.exterior.coords)}" {rim}/>',
        f'<path d="{path(face_s.exterior.coords)}" {rim}/>',
    ])


if __name__ == '__main__':
    s = cloud_shapes()
    print(len(s), 'bytes', s.count('<path'), 'paths')
