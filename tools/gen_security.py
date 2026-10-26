"""Draws security.svg (Services page) from a world-space description.
Edit the numbers below and run again; don't hand-edit the SVG.
usage: python tools/gen_security.py site/assets/img/security.svg
World: 1 unit = 58.4/3 px (the floor grid step). Origin = floor centre. x runs right-down, y left-down, z up.
"""
import math, sys
from shapely.geometry import Point, Polygon, box as box_shape
from iso import W, fmt
from isogen import FACES, FLOOR_LINE, ORANGE, BLUE, faces, ellipse, iso_ellipse, clip_out, seg_path, label, doc, write

w = W(0, 58.4, 58.4 / 3)              # inside the group's translate(272.5,247.3)

HALF = 3                              # building is 6 x 6
HEIGHT = 9
WIN_SPANS = [(-2.35, -1.25), (-0.55, 0.55), (1.25, 2.35)]   # along each wall
WIN_ROWS = [1.5, 3.5, 5.5, 7.5]       # sill heights; each window is 1.1 tall
WIN_H = 1.1
DISC_R = 9.5                          # floor disc radius; grid every 1 unit, offset 0.5
FENCE_R = 8.3                         # dashed blue perimeter
GUARD_R = 6.2                         # orange monitoring ring
THREATS = [-160, -110, -40, 0, 110, 151]   # degrees; each runs from r 9.3 in to r 6.7 and ends in a cross
                                      # (0 not 5: a floor line 5 degrees off an iso axis reads as a mistake;
                                      #  151 not 150: keeps the cross clear of a grid line;
                                      #  -160 and -110 fall behind the building and are skipped)
THREAT_R = (9.3, 6.7)
CROSS = 4.5                           # half-size of the blocked cross, px
RED = '#EE8A7C'

# 2D badge above the roof (not iso geometry), as drawn; y is screen px in the group
SHIELD = ('<path d="M0.0,-221.8 L29.2,-210.6 L29.2,-184.0 C29.2,-164.4 11.1,-156.7 0.0,-151.8 '
          'C-11.1,-156.7 -29.2,-164.4 -29.2,-184.0 L-29.2,-210.6 Z" fill="#405169" stroke="#F4A340" stroke-width="2.5"/>')
LOCK = ('<rect x="-5.8" y="-188.2" width="11.7" height="11.9" rx="2" fill="none" stroke="#F4A340" stroke-width="2"/>'
        '<path d="M-3.7,-188.2 v-6.3 a3.7,3.7 0 0 1 7.5,0 v6.3" fill="none" stroke="#F4A340" stroke-width="2"/>')

# labels: (dot world point, text x, title y, title, subline, colour, anchor)
MON_DOT = math.degrees(math.acos(3.5 / GUARD_R))   # round the orange ring, where it meets grid line x = 3.5
LABELS = [
    ((GUARD_R * math.cos(math.radians(MON_DOT)), GUARD_R * math.sin(math.radians(MON_DOT)), 0),
     63.3, 190.9, '24/7 MONITORING', 'threats stopped at the edge', ORANGE, 'start'),
    ((HALF, 0, 8.05), 161.3, -117.1, 'MFA + EDR', 'every login, every device', BLUE, 'start'),
    ((0, HALF, 8.05), -127.6, -128.1, 'EMAIL FILTER', 'phishing blocked', BLUE, 'end'),
]
GAP = (30.0, 175.5, 213.7)            # floor lines stop at x >= GAP[0], GAP[1] <= y <= GAP[2] (bottom label + leader elbow clearance)
TITLE = 'Office building inside a security perimeter with blocked threats and a shield'


def outline():
    return Polygon([w.p(-HALF, -HALF, HEIGHT), w.p(HALF, -HALF, HEIGHT), w.p(HALF, -HALF, 0),
                    w.p(HALF, HALF, 0), w.p(-HALF, HALF, 0), w.p(-HALF, HALF, HEIGHT)])


def gap():
    return box_shape(GAP[0], GAP[1], 10_000, GAP[2])


def floor_grid():
    mask = gap().union(outline())
    segs = []
    steps = [k + 0.5 for k in range(-10, 10) if abs(k + 0.5) < DISC_R]
    for axis in (0, 1):
        for c in steps:
            s = math.sqrt(DISC_R ** 2 - c ** 2)
            a, b = ((c, -s), (c, s)) if axis == 0 else ((-s, c), (s, c))
            segs += clip_out(w.p(*a), w.p(*b), mask)
    return seg_path(segs, f'fill="none" stroke="{FLOOR_LINE}" stroke-width="1" stroke-opacity="0.8"')


def ellipse_arcs(r, mask, attrs):
    """An iso circle drawn as SVG arcs, leaving out the parts inside mask."""
    rx, ry, (cx, cy) = iso_ellipse(w, r)
    at = lambda t: (cx + rx * math.cos(t), cy + ry * math.sin(t))
    n = 3600
    inside = [mask.contains(Point(at(2 * math.pi * k / n))) for k in range(n)]
    if not any(inside):
        return ellipse(w, r, attrs=attrs)
    def edge(k):                       # refine the crossing between sample k and k+1
        a, b = 2 * math.pi * k / n, 2 * math.pi * (k + 1) / n
        ia = inside[k]
        for _ in range(40):
            m = (a + b) / 2
            if mask.contains(Point(at(m))) == ia: a = m
            else: b = m
        return (a + b) / 2
    start = inside.index(True)
    runs, k = [], start
    for step in range(1, n + 1):
        j = (start + step) % n
        if inside[j - 1] and not inside[j]: t0 = edge((j - 1) % n)
        if not inside[j - 1] and inside[j]: runs.append((t0, edge((j - 1) % n)))
    d = ''
    for t0, t1 in runs:
        span = (t1 - t0) % (2 * math.pi)
        (x0, y0), (x1, y1) = at(t0), at(t1)
        d += f'M{fmt(x0)},{fmt(y0)}A{fmt(rx)},{fmt(ry)} 0 {int(span > math.pi)} 1 {fmt(x1)},{fmt(y1)}'
    return f'<path d="{d}" {attrs}/>'


def threats():
    lines, crosses = [], []
    hide = outline()
    for deg in THREATS:
        c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))
        p, q = (w.p(r * c, r * s) for r in THREAT_R)
        if hide.contains(Point(q)):    # behind the building: drawn under it, never seen
            continue
        lines.append(f'<polyline points="{fmt(p[0])},{fmt(p[1])} {fmt(q[0])},{fmt(q[1])}" fill="none" stroke="{RED}" '
                     f'stroke-width="1.2" stroke-opacity="0.85" stroke-dasharray="3 4"/>')
        x, y = q
        crosses.append(f'<path d="M{fmt(x - CROSS)},{fmt(y - CROSS)} L{fmt(x + CROSS)},{fmt(y + CROSS)} '
                       f'M{fmt(x + CROSS)},{fmt(y - CROSS)} L{fmt(x - CROSS)},{fmt(y + CROSS)}" fill="none" stroke="{RED}" stroke-width="2"/>')
    return lines + crosses


def windows():
    out = []
    for lo in WIN_ROWS:
        hi = lo + WIN_H
        for a, b in WIN_SPANS:      # right wall (x = HALF), back to front
            out.append(w.pts((HALF, a, lo), (HALF, b, lo), (HALF, b, hi), (HALF, a, hi)))
        for a, b in WIN_SPANS:      # left wall (y = HALF), back to front
            out.append(w.pts((a, HALF, lo), (b, HALF, lo), (b, HALF, hi), (a, HALF, hi)))
    return [f'<polygon points="{p}" fill="none" stroke="{BLUE}" stroke-width="0.9" stroke-opacity="0.5"/>' for p in out]


def build():
    body = [floor_grid() + ellipse_arcs(DISC_R, gap(), f'fill="none" stroke="{FLOOR_LINE}" stroke-width="1.2"')]
    body.append(ellipse(w, FENCE_R, attrs=f'fill="none" stroke="{BLUE}" stroke-width="1" stroke-opacity="0.55" stroke-dasharray="5 6"'))
    body.append(ellipse(w, GUARD_R, attrs=f'fill="none" stroke="{ORANGE}" stroke-width="1.4" stroke-opacity="0.9"'))
    body += threats()
    body += faces(w, -HALF, HALF, -HALF, HALF, 0, HEIGHT, FACES)
    body += windows()
    body += [SHIELD, LOCK]
    for dot, tx, ty, title, sub, colour, anchor in LABELS:
        side = 27 if anchor == 'end' else -27
        body += label(w.p(*dot), (tx + side, ty - 4.5), tx, title, sub, colour, anchor)
    return doc(TITLE, body, translate=(272.5, 247.3))


if __name__ == '__main__':
    write(sys.argv[1], build())
