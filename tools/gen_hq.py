"""Draws hq.svg (About page) from a world-space description.
Edit the numbers below and run again; don't hand-edit the SVG.
usage: python tools/gen_hq.py site/assets/img/hq.svg
World: 1 unit = 18px. Origin = floor centre. x runs right-down, y left-down, z up.
Everything sits on the isoprops grid (x, y in 0.25s, z in 0.125s), so no two edges can nearly touch.
"""
import sys
from shapely.geometry import box as box_shape, Polygon
from iso import W, fmt
from isogen import FACES, HIGH, ORANGE, INK, EDGE, silhouette, floor_grid, disc_arcs, label, doc, write

w = W(0, 63, 18)                      # inside the group's translate(275.4,218.1)

HALF = 3.5                            # walls are 7 x 7
STOREY = 2.5                          # floor to floor
FLOORS = 3
LIT = 1                               # highlighted storey (0 = ground): the help desk floor
WALL = 2.25                           # wall height in each storey; the rest is the cornice slab
CORNICE = 0.25                        # slab overhang past the walls
WIN_SPANS = [(-2.75, -1.25), (-0.75, 0.75), (1.25, 2.75)]   # along each wall: three windows, even gaps
WIN_Z = (0.625, 1.75)                 # sill and head, from the storey floor
LIT_WINDOWS = {(0, 'r', 2), (0, 'l', 0), (2, 'r', 0), (2, 'l', 2), (2, 'r', 1)}   # (storey, wall, window): lights on
DOOR = (-0.75, 0.75, 1.75)            # ground floor, middle of the front-left wall (y = HALF): x from, x to, height
AWNING = (-1.0, 1.0, 0.5, 2.0, 0.125)      # x from, x to, depth out from the wall, z, thickness (shallow and high: the door shows under it)
STEP = (-1.0, 1.0, 0.75, 0.125)       # x from, x to, depth, height
PATH = (-0.75, 0.75, 8.25)            # walk from the step to near the disc edge: x from, x to, y end
PARAPET = (0.375, 0.25)               # roof rim: height, thickness
HVAC = (-2.5, -0.75, -2.5, -0.75, 0.75)    # roof unit: x0, x1, y0, y1, height
FAN = (-2.25, -1.0, -2.25, -1.0, 0.125)    # grille on top of it
MAST = (1.5, -1.5, 0.5, 2.5)          # x, y, base size, pole height above the roof
WIFI = [(8, 0.85), (14, 0.55), (20, 0.3)]   # signal arcs round the mast top: radius px, opacity
TREES = [(7.0, 3.0, 1.0), (-3.0, 6.25, 1.0)]      # centre x, y, scale: front-right on open ground, left of the path (tower drawing's tree)
TREE = [(0.5, 1.0), (1.5, 1.25), (1.0, 0.75)]   # trunk, canopy, top: width, height
GREEN = ('#4E9C78', '#3C7C60', '#6FD3A0')
GREEN_EDGE = 'stroke="#D9E4F0" stroke-width="1" stroke-opacity="0.22"'
AWNING_EDGE = 'stroke="#FFE6C4" stroke-width="1" stroke-opacity="0.55"'
GLASS, GLASS_ON, PATH_FILL = '#1F2A3B', '#7DB9E8', '#24303F'
DOOR_LIT, STEP_FACES = '#F7B868', ('#4A5D78', '#3B4C63', '#5A6F8C')   # warm lit door; step a shade lighter than the walls
DISC_R = 9                            # floor disc radius; grid every 1 unit, offset 0.5
DOT = (HALF, -1.0, STOREY * LIT + 1.125)   # leader dot: lit floor's right wall, between two windows
TEXT_X, TITLE_Y = 137.6, 56.2
GAP = (124.0, 40.8, 79.0)             # floor lines stop at x >= GAP[0], GAP[1] <= y <= GAP[2] (label clearance)
TITLE = 'Three-storey office building with the help desk floor highlighted'

BOXES = []                            # every box drawn, in order (rules_hq.py reads it for painter.py)


def box(x0, x1, y0, y1, z0, z1, cols=FACES, edge=EDGE):
    BOXES.append((x0, x1, y0, y1, z0, z1))
    return [f'<polygon points="{pts}" fill="{c}" {edge}/>' for pts, c in zip(w.box(x0, x1, y0, y1, z0, z1), cols)]


def flat(pts, fill, extra=''):
    return f'<polygon points="{w.pts(*pts)}" fill="{fill}"{extra}/>'


def label_gap():
    return box_shape(GAP[0], GAP[1], 10_000, GAP[2])


def path_shape():
    x0, x1, y1 = PATH
    return [(x0, HALF + STEP[2], 0), (x1, HALF + STEP[2], 0), (x1, y1, 0), (x0, y1, 0)]


def tree_boxes(cx, cy, s):
    out, z = [], 0
    for size, h in TREE:
        r = size * s / 2
        out.append((cx - r, cx + r, cy - r, cy + r, z, z + h * s))
        z += h * s
    return out


def hidden():
    """Screen areas floor lines skip: the label gap, the building, the path and the trees."""
    c = HALF + CORNICE
    out = label_gap().union(silhouette(w, -c, c, -c, c, 0, STOREY * FLOORS + PARAPET[0]))
    out = out.union(Polygon([w.p(*p) for p in path_shape()]))
    for t in TREES:
        for b in tree_boxes(*t):
            out = out.union(silhouette(w, *b))
    return out


def windows(f):
    lo, hi = f * STOREY + WIN_Z[0], f * STOREY + WIN_Z[1]
    out = []
    for wall in ('r', 'l'):                         # right wall (x = HALF), then left (y = HALF); back to front
        for k, (a, b) in enumerate(WIN_SPANS):
            if wall == 'l' and f == 0 and k == 1:
                continue                            # the entrance takes the middle bay
            pts = ([(HALF, a, lo), (HALF, b, lo), (HALF, b, hi), (HALF, a, hi)] if wall == 'r'
                   else [(a, HALF, lo), (b, HALF, lo), (b, HALF, hi), (a, HALF, hi)])
            on = (f, wall, k) in LIT_WINDOWS
            out.append(flat(pts, GLASS_ON, ' fill-opacity="0.6"') if on else flat(pts, GLASS))
    return out


def storey(f):
    z0 = f * STOREY
    out = box(-HALF, HALF, -HALF, HALF, z0, z0 + WALL, HIGH if f == LIT else FACES)
    out += windows(f)
    if f == 0:
        out += entrance()                           # under the slab above it, so drawn before it
    c = HALF + CORNICE
    out += box(-c, c, -c, c, z0 + WALL, z0 + STOREY)
    return out


def entrance():
    x0, x1, h = DOOR
    door = [(x0, HALF, 0), (x1, HALF, 0), (x1, HALF, h), (x0, HALF, h)]
    out = [flat(door, DOOR_LIT, ' fill-opacity="0.55" stroke="#FFE6C4" stroke-width="1.2" stroke-opacity="0.8"')]
    out.append(f'<polyline points="{w.pts((0, HALF, 0), (0, HALF, h))}" fill="none" stroke="#FFE6C4" stroke-width="1" stroke-opacity="0.7"/>')
    a0, a1, ad, az, at = AWNING
    out += box(a0, a1, HALF, HALF + ad, az, az + at, HIGH, AWNING_EDGE)
    s0, s1, sd, sh = STEP
    out += box(s0, s1, HALF, HALF + sd, 0, sh, STEP_FACES)
    return out


def roof():
    top = STOREY * FLOORS
    ph, pt = PARAPET
    h = HALF
    out = box(-h, h, -h, -h + pt, top, top + ph)                 # back rim (y = -h), full width
    out += box(-h, -h + pt, -h + pt, h - pt, top, top + ph)      # back rim (x = -h)
    x0, x1, y0, y1, hh = HVAC
    out += box(x0, x1, y0, y1, top, top + hh)
    fx0, fx1, fy0, fy1, fh = FAN
    out += box(fx0, fx1, fy0, fy1, top + hh, top + hh + fh)
    mx, my, ms, mh = MAST
    out += box(mx - ms / 2, mx + ms / 2, my - ms / 2, my + ms / 2, top, top + 0.25)
    (bx, by), (tx, ty) = w.p(mx, my, top + 0.25), w.p(mx, my, top + mh)
    out.append(f'<polyline points="{fmt(bx)},{fmt(by)} {fmt(tx)},{fmt(ty)}" fill="none" stroke="#D9E4F0" stroke-width="1.6" stroke-opacity="0.8"/>')
    out.append(f'<circle cx="{fmt(tx)}" cy="{fmt(ty)}" r="3.5" fill="{ORANGE}" stroke="{INK}" stroke-width="1.5"/>')
    for r, o in WIFI:
        k = r / 2 ** 0.5
        out.append(f'<path d="M{fmt(tx - k)},{fmt(ty - k)} A{r},{r} 0 0 1 {fmt(tx + k)},{fmt(ty - k)}" fill="none" stroke="{ORANGE}" stroke-width="1.4" stroke-opacity="{o}"/>')
    out += box(-h + pt, h - pt, h - pt, h, top, top + ph)        # front rim (y = h)
    out += box(h - pt, h, -h + pt, h, top, top + ph)             # front rim (x = h), corner included
    return out


def trees():
    out = []
    for t in TREES:
        for k, b in enumerate(tree_boxes(*t)):
            out += box(*b) if k == 0 else box(*b, GREEN, GREEN_EDGE)
    return out


def build():
    BOXES.clear()
    body = [floor_grid(w, (0, 0), DISC_R, hidden(), phase=(0.5, 0.5)) + disc_arcs(w, DISC_R, mask=label_gap())]
    body.append(flat(path_shape(), PATH_FILL, ' stroke="#D9E4F0" stroke-width="1" stroke-opacity="0.15"'))
    for f in range(FLOORS):
        body += storey(f)
    body += roof()
    body += trees()
    body += label(w.p(*DOT), (TEXT_X - 27, TITLE_Y - 4.5), TEXT_X, 'HELP DESK FLOOR', 'your team\'s first call')
    return doc(TITLE, body, translate=(275.4, 218.1))


if __name__ == '__main__':
    write(sys.argv[1], build())
