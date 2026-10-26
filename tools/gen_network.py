"""Draws network.svg (Services: network) from a world-space description.
Edit the numbers below and run again; don't hand-edit the SVG.
usage: python tools/gen_network.py site/assets/img/network.svg
World: 1 unit = 1px. x runs right-down, y left-down, z up. Floor is z = 0.
Grid: everything sits on x, y = multiples of 5 and z = multiples of 2.5 (the isoprops grid at S = 20), so edges
either meet exactly or sit clearly apart.
"""
import sys
from shapely.geometry import box as box_shape
from shapely.ops import unary_union
from iso import W, fmt
from isogen import HIGH, ORANGE, BLUE, faces, ellipse, clip_out, label, doc, write, silhouette, floor_grid, disc_arcs
from isoprops import chair, monitor, desk_phone, phone_face, screen_glass, app_window

w = W(0, 0, 1)                        # inside the group's translate(TX, TY)
TX, TY = 264.0, 209.0                 # centres the drawing: disc and rack top span about -170..282 x -155..218
S = 20                                # prop scale: 1 isoprops unit = 20px here

RACK = (0, 60, 0, 60, 0, 140)         # x0, x1, y0, y1, z0, z1 (about 2.7 desks tall, like a real rack)
FIREWALL = (-5, 65, -5, 65, 140, 150) # sits on the rack, 5 wider each side
PORT_X = (5, 55)                      # patch rows on the rack's left wall (y = 60)
PORT_STEP, PORTS = 12.5, 10           # rows at z = 12.5, 25 ... 125
LED_X = 50                            # status lights, between the rows
LEDS = [BLUE, '#F1F4F8', '#F1F4F8'] * 4   # repeats bottom to top

# two workstations in front of the rack, facing +x (towards the viewer's right), with open floor between them
DESK = (45, 85, 52.5)                 # depth (x), width (y), height: desk top = 0.78 x chair back, as at the help desk
DESK_X = 110                          # back edge of both desks
DESK_Y = [-40, 125]                   # left edge (y0) of each desk, back to front: 80px of floor between them
MON_PLANE = 15                        # screen face, in from the desk's back edge
MON_Y = 35                            # monitor, keyboard and chair centre line, from the desk's left edge
MON_W, MON_H = 2.5, 1.75              # monitor size in isoprops units
KEYBOARD = (25, 35, 15, 55, 2.5)      # x from, x to, y from, y to (from the desk corner), height
PHONE_AT = (30, 70)                   # VoIP phone centre on the desk (x, y from the desk corner): 5px clear of the keyboard and the edge
CHAIR_X = 30                          # chair centre, out from the desk's front edge: 15px of floor in front of the seat

# cabling: a floor port beside each desk, fed straight from the rack along the floor (one turn at most)
PORTS_AT = [(30, 40, 15, 25), (5, 15, 5, 15)]   # floor port per desk: x from, x to (from the desk's back edge), y from, y to (out from its left side)
PORT_H = 5
RUN_X = [50, 40]                      # each run leaves the rack's left wall at this x, then one turn along the floor to its port
AP_Z = 160                            # ceiling height: the access point hangs below it on a drop rod
AP = (130, 155, 80, 105, 95, 100)     # over the open floor between the desks, low enough to read clear of them
RINGS = [(25, 0.8), (45, 0.6), (65, 0.4)]   # halo radius, opacity

DISC = (120, 60, 185)                # floor disc centre x, y and radius; grid every 20
GRID = 20
MIN_STUB = 3                          # drop floor-line scraps shorter than this (px) left between the rim and a solid

# labels: dot in world, elbow and text x in screen; widths measured (Barlow 13/600 caps, 11/400) for the floor gap
LABELS = [
    dict(name='firewall', elbow=(-45, -170), x=-72, title='FIREWALL', sub='managed and patched', tw=66, sw=101, anchor='end', colour=ORANGE),
    dict(name='phone', elbow=(-100, 165), x=-127, title='VOIP PHONES', sub='calls over your network', tw=88, sw=119, anchor='end', colour=BLUE),
    dict(name='ap', elbow=(110, 140), x=137, title='ACCESS POINT', sub='coverage-planned Wi-Fi', tw=98, sw=115, anchor='start', colour=ORANGE),
]
TITLE = 'Server rack with firewall, two workstations with VoIP desk phones on the same network, and a Wi-Fi access point'


def workstation(y0):
    """Desk, monitor on a stand, VoIP phone, keyboard and chair for the desk whose left edge is y0, back to front."""
    dx, dw, dh = DESK
    x0 = DESK_X
    cy = y0 + MON_Y
    parts = [('desk', (x0, x0 + dx, y0, y0 + dw, 0, dh))]
    mon, scr = monitor(x0 + MON_PLANE, y0 + MON_Y, dh, '+x', s=S, width=MON_W, height=MON_H)
    phone, top = desk_phone(x0 + PHONE_AT[0], y0 + PHONE_AT[1], dh, '+x', s=S)
    kx0, kx1, ky0, ky1, kh = KEYBOARD
    parts += mon + phone + [('keyboard', (x0 + kx0, x0 + kx1, y0 + ky0, y0 + ky1, dh, dh + kh))]
    seat = chair(x0 + dx + CHAIR_X, cy, '-x', s=S)
    return parts, scr, top, seat


def solids():
    """Every box, in draw order."""
    out = [RACK, FIREWALL]
    for y0 in DESK_Y:
        parts, _s, _t, seat = workstation(y0)
        out += [b for _n, b in parts + seat] + [port(y0)]
    return out + [AP]


def label_gaps(L):
    ex, ey = L['elbow']; x = L['x']; ty, sy = ey + 4.5, ey + 19.5
    if L['anchor'] == 'end':
        return [box_shape(x - L['tw'] - 5, ty - 18, ex + 4, ty - 1), box_shape(x - L['sw'] - 5, sy - 16, x + 5, sy + 8)]
    return [box_shape(ex - 4, ty - 18, x + L['tw'] + 5, ty - 1), box_shape(x - 5, sy - 16, x + L['sw'] + 5, sy + 8)]


def floor_mask():
    return unary_union([silhouette(w, *b) for b in solids()] + [g for L in LABELS for g in label_gaps(L)])


def port(y0):
    px0, px1, py0, py1 = PORTS_AT[DESK_Y.index(y0)]
    y1 = y0 + DESK[1]
    return (DESK_X + px0, DESK_X + px1, y1 + py0, y1 + py1, 0, PORT_H)


def floor_runs():
    """Rack to each desk's floor port: out of the rack's left wall, one turn, along the floor."""
    mask = unary_union([silhouette(w, *b) for b in solids()])
    runs = []
    for y0, rx in zip(DESK_Y, RUN_X):
        p = port(y0); py = (p[2] + p[3]) / 2
        runs.append([(rx, RACK[3]), (rx, py), (p[0], py)])
    out = []
    for run in runs:
        pts = [w.p(x, y) for x, y in run]
        for p, q in zip(pts, pts[1:]):
            for A, B in clip_out(p, q, mask):
                out.append(f'<polyline points="{fmt(A[0])},{fmt(A[1])} {fmt(B[0])},{fmt(B[1])}" fill="none" stroke="{ORANGE}" stroke-width="1.5" stroke-opacity="0.9"/>')
    return out


def ap_run():
    """Firewall top -> up -> along the ceiling (away from the rack) -> down the drop rod to the access point."""
    cx = (RACK[0] + RACK[1]) / 2
    ax, ay = (AP[0] + AP[1]) / 2, (AP[2] + AP[3]) / 2
    pts = [(cx, cx, FIREWALL[5]), (cx, cx, AP_Z), (ax, cx, AP_Z), (ax, ay, AP_Z), (ax, ay, AP[5])]
    return f'<polyline points="{w.pts(*pts)}" fill="none" stroke="{ORANGE}" stroke-width="1.2" stroke-opacity="0.7" stroke-dasharray="2 4"/>'


def rack():
    out = faces(w, *RACK, cols=HIGH)
    y = RACK[3]
    for k in range(1, PORTS + 1):
        z = k * PORT_STEP
        out.append(f'<polyline points="{w.pts((PORT_X[0], y, z), (PORT_X[1], y, z))}" fill="none" stroke="{HIGH[1]}" stroke-width="1" stroke-opacity="0.9"/>')
    for k in range(PORTS):
        X, Y = w.p(LED_X, y, PORT_STEP / 2 + k * PORT_STEP + PORT_STEP / 2)
        out.append(f'<circle cx="{fmt(X)}" cy="{fmt(Y)}" r="1.6" fill="{LEDS[k % len(LEDS)]}"/>')
    return out + faces(w, *FIREWALL, cols=HIGH)


def desk(y0):
    parts, scr, top, seat = workstation(y0)
    out = faces(w, *port(y0), cols=HIGH)
    for name, b in parts:
        out += faces(w, *b)
        if name == 'panel':
            out.append(screen_glass(w, scr, f'<g transform="scale({S})">{app_window(scr[2] / S, scr[3] / S)}</g>'))
        if name == 'handset':
            out.append(phone_face(w, top))
    for _n, b in seat:
        out += faces(w, *b)
    return out


def access_point():
    x0, x1, y0, y1, z0, z1 = AP
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    out = [ellipse(w, r, cx, cy, z0, f'fill="none" stroke="{ORANGE}" stroke-width="1" stroke-opacity="{o}" stroke-dasharray="4 5"') for r, o in RINGS]
    return out + faces(w, *AP, cols=HIGH)


def dots():
    fx = (FIREWALL[0] + FIREWALL[1]) / 2
    _p, _s, top, _c = workstation(DESK_Y[-1])
    px0, py0, pz, pw, pd, *_ = top
    ax, ay = (AP[0] + AP[1]) / 2, (AP[2] + AP[3]) / 2
    return {'firewall': (fx, fx, FIREWALL[5]), 'phone': (px0 + pw / 2, py0 + pd / 2, pz), 'ap': (ax, ay, AP[5])}


def build():
    mask = floor_mask()
    body = [floor_grid(w, DISC[:2], DISC[2], mask, step=GRID, phase=DISC[:2], min_seg=MIN_STUB)
            + disc_arcs(w, DISC[2], *DISC[:2], mask=unary_union([g for L in LABELS for g in label_gaps(L)]))]
    body += floor_runs() + rack() + [ap_run()]
    for y0 in DESK_Y:
        body += desk(y0)
    body += access_point()
    d = dots()
    for L in LABELS:
        body += label(w.p(*d[L['name']]), L['elbow'], L['x'], L['title'], L['sub'], colour=L['colour'], anchor=L['anchor'])
    return doc(TITLE, body, translate=(TX, TY))


if __name__ == '__main__':
    write(sys.argv[1], build())
