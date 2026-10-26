"""Draws network.svg (Services: network) from a world-space description.
Edit the numbers below and run again; don't hand-edit the SVG.
usage: python tools/gen_network.py site/assets/img/network.svg
World: 1 unit = 1px. x runs right-down, y left-down, z up. Floor is z = 0.
"""
import math, sys
from shapely.geometry import MultiPoint, Point, box as box_shape
from shapely.ops import unary_union
from iso import W, fmt
from isogen import FACES, HIGH, FLOOR_LINE, ORANGE, BLUE, faces, ellipse, clip_out, seg_path, label, doc, write

w = W(0, 0, 1)                        # inside the group's translate(312.5,185.4)

RACK = (0, 60, 0, 60, 0, 104)         # x0, x1, y0, y1, z0, z1
FIREWALL = (-4, 64, -4, 64, 104, 113) # sits on the rack, 4 wider each side
PORT_X = (4, 56)                      # patch rows on the rack's left wall (y = 60)
PORT_STEP, PORTS = 13, 7              # rows at z = 13, 26 ... 91
LED_X = 51                            # status lights, between the rows
LEDS = [BLUE, '#F1F4F8', '#F1F4F8'] * 3   # repeats bottom to top
DESKS = [(140, 40), (220, 40), (140, 140)]   # back-left corner of each desk, back to front
DESK = (68, 40, 50)                   # width (x), depth (y), height
MONITOR = (16, 52, 6, 10, 26)         # x from, x to, y from, y to (from desk corner), height above desk
SCREEN_INSET = 3
KEYBOARD = (18, 50, 24, 36, 1.6)
AP = (236, 260, 146, 170, 108, 113)   # Wi-Fi access point, hung at ceiling height
RINGS = [(40, 0.8), (70, 0.6), (100, 0.4)]   # halo radius, opacity
CEILING_RUN = [(45, 25, 113), (248, 25, 113), (248, 158, 113)]   # firewall top to the AP
FLOOR_RUNS = [[(60, 56), (140, 56)], [(60, 56), (220, 56)], [(43.4, 60), (43.4, 160), (140, 160)]]
DISC = (130, 100, 189)                # floor disc centre x, y and radius; grid every 20
GRID = 20
AP_TEXT_X = 122.9                     # moved 10px right so the leader clears the AP's front edge
GAPS = [(-10_000, 20.5, -127.0, 61.5), (AP_TEXT_X - 13, 194.5, 10_000, 235.5)]   # label clearance (screen x0, y0, x1, y1)
MIN_STUB = 3                          # drop floor-line scraps shorter than this (px) left between the rim and a solid
TITLE = 'Server rack with firewall, cabling to desks and a Wi-Fi access point'


def outline(x0, x1, y0, y1, z0, z1):
    return MultiPoint([w.p(x, y, z) for x in (x0, x1) for y in (y0, y1) for z in (z0, z1)]).convex_hull


def desk_parts(cx, cy):
    dw, dd, dh = DESK
    mx0, mx1, my0, my1, mh = MONITOR
    kx0, kx1, ky0, ky1, kh = KEYBOARD
    return [(cx, cx + dw, cy, cy + dd, 0, dh),
            (cx + mx0, cx + mx1, cy + my0, cy + my1, dh, dh + mh),
            (cx + kx0, cx + kx1, cy + ky0, cy + ky1, dh, dh + kh)]


def solids():
    """Every box, in draw order."""
    out = [RACK, FIREWALL]
    for c in DESKS: out += desk_parts(*c)
    return out + [AP]


def floor_mask():
    gaps = [box_shape(*g) for g in GAPS]
    return unary_union(gaps + [outline(*b) for b in solids()])


def floor_grid(mask):
    cx, cy, r = DISC
    segs = []
    for axis in (0, 1):
        c0 = (cx if axis == 0 else cy)
        for k in range(-r // GRID, r // GRID + 1):
            c = c0 + k * GRID
            off = c - c0
            if abs(off) >= r: continue
            s = math.sqrt(r * r - off * off)
            a, b = ((c, cy - s), (c, cy + s)) if axis == 0 else ((cx - s, c), (cx + s, c))
            segs += clip_out(w.p(*a), w.p(*b), mask)
    segs = [(A, B) for A, B in segs if math.dist(A, B) >= MIN_STUB]
    return seg_path(segs, f'fill="none" stroke="{FLOOR_LINE}" stroke-width="1" stroke-opacity="0.8"')


def floor_disc(mask):
    """The disc's rim as arcs, skipping the label gaps. Runs clockwise."""
    cx, cy, r = DISC
    rx, ry = r * math.sqrt(1.5), r / math.sqrt(2)
    (X, Y) = w.p(cx, cy)
    gaps = unary_union([box_shape(*g) for g in GAPS])
    at = lambda t: (X + rx * math.cos(t), Y + ry * math.sin(t))
    inside = lambda t: gaps.contains(Point(at(t)))
    n = 1440
    t0 = next(2 * math.pi * i / n for i in range(n) if inside(2 * math.pi * i / n))   # start inside a gap
    t = lambda i: t0 + 2 * math.pi * i / n
    d, i = '', 0
    while i <= n:
        if inside(t(i)): i += 1; continue
        j = i
        while not inside(t(j)): j += 1
        a, b = edge(inside, t(i - 1), t(i)), edge(inside, t(j - 1), t(j))
        (ax, ay), (bx, by) = at(a), at(b)
        d += f'M{fmt(ax)},{fmt(ay)}A{fmt(rx)},{fmt(ry)} 0 {int(b - a > math.pi)} 1 {fmt(bx)},{fmt(by)}'
        i = j
    return f'<path d="{d}" fill="none" stroke="{FLOOR_LINE}" stroke-width="1.2"/>'


def edge(inside, a, b):
    """Bisect between angles a and b for where the rim crosses a gap edge."""
    ia = inside(a)
    for _ in range(40):
        m = (a + b) / 2
        if inside(m) == ia: a = m
        else: b = m
    return (a + b) / 2


def floor_runs():
    mask = unary_union([outline(*b) for b in solids()])
    out = []
    for run in FLOOR_RUNS:
        pts = [w.p(x, y) for x, y in run]
        segs = [s for p, q in zip(pts, pts[1:]) for s in clip_out(p, q, mask)]
        for A, B in segs:
            out.append(f'<polyline points="{fmt(A[0])},{fmt(A[1])} {fmt(B[0])},{fmt(B[1])}" fill="none" stroke="{ORANGE}" stroke-width="1.5" stroke-opacity="0.9"/>')
    return out


def rack():
    out = faces(w, *RACK, cols=HIGH)
    y = RACK[3]
    for k in range(1, PORTS + 1):
        z = k * PORT_STEP
        out.append(f'<polyline points="{w.pts((PORT_X[0], y, z), (PORT_X[1], y, z))}" fill="none" stroke="{HIGH[1]}" stroke-width="1" stroke-opacity="0.9"/>')
    for k in range(PORTS + 1):
        X, Y = w.p(LED_X, y, PORT_STEP / 2 + k * PORT_STEP)
        out.append(f'<circle cx="{fmt(X)}" cy="{fmt(Y)}" r="1.6" fill="{LEDS[k % len(LEDS)]}"/>')
    return out + faces(w, *FIREWALL, cols=HIGH)


def desk(cx, cy):
    top, mon, kb = desk_parts(cx, cy)
    x0, x1, _, y1, z0, z1 = mon
    i = SCREEN_INSET
    screen = w.pts((x0 + i, y1, z0 + i), (x1 - i, y1, z0 + i), (x1 - i, y1, z1 - i), (x0 + i, y1, z1 - i))
    return (faces(w, *top) + faces(w, *mon)
            + [f'<polygon points="{screen}" fill="{BLUE}" fill-opacity="0.3" stroke="{BLUE}" stroke-width="0.8" stroke-opacity="0.6"/>']
            + faces(w, *kb))


def access_point():
    x0, x1, y0, y1, z0, z1 = AP
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    out = [ellipse(w, r, cx, cy, z0, f'fill="none" stroke="{ORANGE}" stroke-width="1" stroke-opacity="{o}" stroke-dasharray="4 5"') for r, o in RINGS]
    pts = [w.p(*p) for p in CEILING_RUN]
    ap = outline(*AP)
    segs = [s for p, q in zip(pts, pts[1:]) for s in clip_out(p, q, ap)]
    run = ' '.join(f'{fmt(x)},{fmt(y)}' for x, y in [segs[0][0]] + [s[1] for s in segs])
    out.append(f'<polyline points="{run}" fill="none" stroke="{ORANGE}" stroke-width="1.2" stroke-opacity="0.7" stroke-dasharray="2 4"/>')
    return out + faces(w, *AP, cols=HIGH)


def build():
    mask = floor_mask()
    body = [floor_grid(mask) + floor_disc(mask)]
    body += floor_runs() + rack()
    for c in DESKS: body += desk(*c)
    body += access_point()
    fx = (FIREWALL[0] + FIREWALL[1]) / 2
    ax, ay = (AP[0] + AP[1]) / 2, (AP[2] + AP[3]) / 2
    body += label(w.p(fx, fx, FIREWALL[5]), (-10.6, -135.0), -37.6, 'FIREWALL', 'managed and patched', anchor='end')
    body += label(w.p(8, RACK[3], 50), (-105.0, 34.0), -132.0, 'CORE SWITCH', 'every port mapped', anchor='end')
    body += label(w.p(ax, ay, AP[5]), (AP_TEXT_X - 27, 208.0), AP_TEXT_X, 'ACCESS POINT', 'coverage-planned Wi-Fi')
    return doc(TITLE, body, translate=(312.5, 185.4))


if __name__ == '__main__':
    write(sys.argv[1], build())
