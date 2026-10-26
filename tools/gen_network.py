"""Draws network.svg (Services: network) from a world-space description.
Edit the numbers below and run again; don't hand-edit the SVG.
usage: python tools/gen_network.py site/assets/img/network.svg
World: 1 unit = 1px. x runs right-down, y left-down, z up. Floor is z = 0.
"""
import sys
from shapely.geometry import box as box_shape
from shapely.ops import unary_union
from iso import W, fmt
from isogen import HIGH, ORANGE, BLUE, faces, ellipse, clip_out, label, doc, write, silhouette, floor_grid, disc_arcs

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
    return unary_union(gaps + [silhouette(w, *b) for b in solids()])








def floor_runs():
    mask = unary_union([silhouette(w, *b) for b in solids()])
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
    ap = silhouette(w, *AP)
    segs = [s for p, q in zip(pts, pts[1:]) for s in clip_out(p, q, ap)]
    run = ' '.join(f'{fmt(x)},{fmt(y)}' for x, y in [segs[0][0]] + [s[1] for s in segs])
    out.append(f'<polyline points="{run}" fill="none" stroke="{ORANGE}" stroke-width="1.2" stroke-opacity="0.7" stroke-dasharray="2 4"/>')
    return out + faces(w, *AP, cols=HIGH)


def build():
    mask = floor_mask()
    body = [floor_grid(w, DISC[:2], DISC[2], mask, step=GRID, phase=DISC[:2], min_seg=MIN_STUB)
            + disc_arcs(w, DISC[2], *DISC[:2], mask=unary_union([box_shape(*g) for g in GAPS]))]
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
