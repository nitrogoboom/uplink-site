"""Draws helpdesk.svg (Services, Work) from a world-space description.
Edit the numbers below and run again; don't hand-edit the SVG.
usage: python tools/gen_helpdesk.py site/assets/img/helpdesk.svg
World: 1 unit = 23px. x runs right-down, y left-down, z up. Desk's back-left corner is the origin.
"""
import math, sys
from shapely.geometry import Point, Polygon, box as box_shape
from shapely.ops import unary_union
from iso import W, fmt
from isogen import FACES, HIGH, FLOOR_LINE, ORANGE, BLUE, faces, iso_ellipse, clip_out, seg_path, label, doc, write

w = W(0, 0, 23)                       # inside the group's translate(265.7,200.9)

DESK = (0, 8, 0, 3.6, 0, 2.6)         # x0 x1 y0 y1 z0 z1
TOP = DESK[5]
MONITOR = (2, 6, 0.5, 0.8, TOP, TOP + 2.8)
SCREEN_INSET = 0.25                   # orange screen outline, in from the monitor's front edges
BUBBLES = [                           # chat bubbles on the screen (front face y = MONITOR y1): (x, z) corners
    (BLUE, [(2.6, 4.65), (4.3, 4.65), (4.3, 4.15), (2.9, 4.15)]),
    (ORANGE, [(3.6, 3.9), (5.4, 3.9), (5.4, 3.4), (3.6, 3.4)]),
]
KEYBOARD = (2.4, 5.6, 1.6, 2.7, TOP, TOP + 0.12)
MOUSE = (6.2, 7, 1.55, 2.75, TOP, TOP + 0.1)
SEAT = (3, 5, 4.6, 6.6, 0, 1.8)
BACK = (3, 5, 6.4, 6.6, 1.8, 3.8)

TICKET = (3.8, 2.4, 0.15)             # width (x), depth (y), thickness
TICKETS = [(9.6, -2.35, 7.5), (9.3, -2.05, 5.0), (9.0, -1.75, 2.5)]   # (x0, y0, z0): open, in progress, resolved
# (heights 2.5 apart; placed so no ticket corner lands a pixel off a floor line)
TICKET_LINES = [(0.85, 2.4), (1.55, 1.6)]     # text lines on open tickets: (y from back edge, length from x0 + 0.7)
CHECK = [(-9.7, 0.0), (-2.9, 6.8), (10.6, -7.7)]   # tick on the resolved ticket, screen offsets from its top centre

DISC = (5.5, 1.5, 7.65)               # floor disc centre x, y and radius; grid on whole units

# labels: dot in world, elbow and text in screen; title/sub widths are measured text widths (for the floor gap)
LABELS = [
    dict(dot=(4.0, MONITOR[3], 5.0), elbow=(43.7, -124.0), x=16.7, title='LIVE CHAT', sub='phone, email, chat', tw=70, sw=95, colour=ORANGE),
    dict(dot=(4.0, BACK[3], 2.8), elbow=(-82.8, 127.9), x=-109.8, title='REAL PERSON', sub='local help desk', tw=96, sw=79, colour=BLUE),
    dict(dot=(TICKETS[2][0] + TICKET[0] - 0.55, TICKETS[2][1] + TICKET[1] / 2, TICKETS[2][2] + TICKET[2]), elbow=(250.9, 145.1), x=223.9, title='TICKETS', sub='open, in progress, resolved', tw=61.3, sw=141.7, colour=ORANGE),
]
TITLE = 'Help desk workstation with support tickets moving from open to resolved'


def ticket_boxes():
    tw, td, th = TICKET
    return [(x0, x0 + tw, y0, y0 + td, z0, z0 + th) for x0, y0, z0 in TICKETS]


def objects():
    return [DESK, MONITOR, KEYBOARD, MOUSE, SEAT, BACK] + ticket_boxes()


def silhouette(b):
    return unary_union([Polygon([tuple(map(float, p.split(','))) for p in pts.split()]) for pts in w.box(*b)])


def label_gaps(L):
    """Floor lines stop around each label's title, subline and level tail (end-anchored text)."""
    ex, ey = L['elbow']; x = L['x']; ty, sy = ey + 4.5, ey + 19.5
    return [box_shape(x - L['tw'] - 5, ty - 18, ex + 4, ty - 1), box_shape(x - L['sw'] - 5, sy - 16, x + 5, sy + 8)]


def hidden():
    """Floor lines skip everything drawn over them: objects and labels."""
    return unary_union([silhouette(b) for b in objects()] + [g for L in LABELS for g in label_gaps(L)])


def floor_grid(mask):
    cx, cy, r = DISC
    segs = []
    for axis in (0, 1):
        c0 = cx if axis == 0 else cy
        for c in range(math.ceil(c0 - r), math.floor(c0 + r) + 1):
            s = math.sqrt(max(r * r - (c - c0) ** 2, 0))
            o = cy if axis == 0 else cx
            a, b = ((c, o - s), (c, o + s)) if axis == 0 else ((o - s, c), (o + s, c))
            if s > 0: segs += clip_out(w.p(*a), w.p(*b), mask)
    return seg_path(segs, f'fill="none" stroke="{FLOOR_LINE}" stroke-width="1" stroke-opacity="0.8"')


def floor_disc(mask):
    """The disc edge as exact arcs, skipping the parts under objects and labels.
    (local helper: isogen has no masked-ellipse yet)"""
    rx, ry, (cx, cy) = iso_ellipse(w, DISC[2], DISC[0], DISC[1])
    pt = lambda t: (cx + rx * math.cos(t), cy + ry * math.sin(t))
    out = lambda t: not mask.contains(Point(pt(t)))
    n = 1440; ts = [2 * math.pi * k / n for k in range(n)]
    def edge(a, b):
        for _ in range(40):
            m = (a + b) / 2
            if out(m) == out(a): a = m
            else: b = m
        return (a + b) / 2
    flips = [(edge(ts[k], ts[k] + 2 * math.pi / n), out(ts[(k + 1) % n])) for k in range(n) if out(ts[k]) != out(ts[(k + 1) % n])]
    if not flips: return f'<ellipse cx="{fmt(cx)}" cy="{fmt(cy)}" rx="{fmt(rx)}" ry="{fmt(ry)}" fill="none" stroke="{FLOOR_LINE}" stroke-width="1.2"/>'
    while not flips[0][1]:                      # start where the edge comes out from under something
        flips = flips[1:] + [(flips[0][0] + 2 * math.pi, flips[0][1])]
    flips = [t for t, _ in flips]
    d = ''
    for a, b in zip(flips[0::2], flips[1::2]):
        (x0, y0), (x1, y1) = pt(a), pt(b)
        d += f'M{fmt(x0)},{fmt(y0)}A{fmt(rx)},{fmt(ry)} 0 {int(b - a > math.pi)} 1 {fmt(x1)},{fmt(y1)}'
    return f'<path d="{d}" fill="none" stroke="{FLOOR_LINE}" stroke-width="1.2"/>'


def outline(pts, colour, width, opacity):
    return f'<polygon points="{w.pts(*pts)}" fill="none" stroke="{colour}" stroke-width="{width}" stroke-opacity="{opacity}"/>'


def monitor_face():
    x0, x1, _, y, z0, z1 = MONITOR; i = SCREEN_INSET
    out = [outline([(x0 + i, y, z0 + i), (x1 - i, y, z0 + i), (x1 - i, y, z1 - i), (x0 + i, y, z1 - i)], ORANGE, 1, 0.8)]
    for colour, corners in BUBBLES:
        out.append(outline([(x, y, z) for x, z in corners], colour, 1.1, 0.9))
    return out


def ticket_marks():
    out = []
    for (x0, x1, y0, y1, z0, z1) in ticket_boxes()[:2]:
        for dy, ln in TICKET_LINES:
            out.append(f'<polyline points="{w.pts((x0 + 0.7, y0 + dy, z1), (x0 + 0.7 + ln, y0 + dy, z1))}" fill="none" stroke="{BLUE}" stroke-width="1.4" stroke-opacity="0.7"/>')
    x0, x1, y0, y1, z0, z1 = ticket_boxes()[2]
    cx, cy = w.p((x0 + x1) / 2, (y0 + y1) / 2, z1)
    pts = ' '.join(f'{fmt(cx + dx)},{fmt(cy + dy)}' for dx, dy in CHECK)
    out.append(f'<polyline points="{pts}" fill="none" stroke="{FACES[1]}" stroke-width="2.5"/>')
    return out


def build():
    mask = hidden()
    body = [floor_grid(mask) + floor_disc(mask)]
    body += faces(w, *DESK) + faces(w, *MONITOR) + monitor_face()
    body += faces(w, *KEYBOARD) + faces(w, *MOUSE) + faces(w, *SEAT) + faces(w, *BACK)
    for k, b in enumerate(ticket_boxes()):
        body += faces(w, *b, cols=HIGH if k == 2 else FACES)
    body += ticket_marks()
    for L in LABELS:
        body += label(w.p(*L['dot']), L['elbow'], L['x'], L['title'], L['sub'], colour=L['colour'], anchor='end')
    return doc(TITLE, body, translate=(265.7, 200.9))


if __name__ == '__main__':
    write(sys.argv[1], build())
