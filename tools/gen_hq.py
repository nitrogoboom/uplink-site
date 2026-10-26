"""Draws hq.svg (About page) from a world-space description.
Edit the numbers below and run again; don't hand-edit the SVG.
usage: python tools/gen_hq.py site/assets/img/hq.svg
World: 1 unit = 18px. Origin = floor centre. x runs right-down, y left-down, z up.
"""
import sys
from shapely.geometry import box as box_shape
from iso import W
from isogen import FACES, HIGH, ORANGE, BLUE, faces, ellipse, silhouette, floor_grid, disc_arcs, label, doc, write

w = W(0, 63, 18)                      # inside the group's translate(275.4,218.1)

HALF = 3.5                            # building is 7 x 7
FLOOR = 2.4                           # storey height
FLOORS = 3
LIT = 1                               # highlighted storey (0 = ground)
WIN_SPANS = [(-2.6, -1.6), (-0.5, 0.5), (1.6, 2.6)]   # along each wall
WIN_Z = (0.6, 1.8)                    # sill and head, from the storey floor
MAST = 2.6                            # antenna height above the roof
RINGS = [0.9, 1.6]                    # signal ring radii at the mast top
DISC_R = 9                            # floor disc radius; grid every 1 unit, offset 0.5
DOT = (HALF, 0, FLOOR * LIT + FLOOR / 2)   # leader dot, middle of the lit floor's right wall
TEXT_X, TITLE_Y = 137.6, 56.2
GAP = (124.0, 40.8, 79.0)             # floor lines stop at x >= GAP[0], GAP[1] <= y <= GAP[2] (label clearance)
TITLE = 'Three-storey office building with the help desk floor highlighted'


def label_gap():
    return box_shape(GAP[0], GAP[1], 10_000, GAP[2])


def hidden():
    """Screen areas floor lines skip: the label gap and the building."""
    return label_gap().union(silhouette(w, -HALF, HALF, -HALF, HALF, 0, FLOOR * FLOORS))


def windows(z0):
    lo, hi = z0 + WIN_Z[0], z0 + WIN_Z[1]
    out = []
    for a, b in WIN_SPANS:          # right wall (x = HALF), back to front
        out.append(w.pts((HALF, a, lo), (HALF, b, lo), (HALF, b, hi), (HALF, a, hi)))
    for a, b in WIN_SPANS:          # left wall (y = HALF), back to front
        out.append(w.pts((a, HALF, lo), (b, HALF, lo), (b, HALF, hi), (a, HALF, hi)))
    return [f'<polygon points="{p}" fill="none" stroke="{BLUE}" stroke-width="0.9" stroke-opacity="0.5"/>' for p in out]


def antenna():
    top = FLOOR * FLOORS
    out = [f'<polyline points="{w.pts((0, 0, top), (0, 0, top + MAST))}" fill="none" stroke="{ORANGE}" stroke-width="1.6"/>']
    for r in RINGS:
        out.append(ellipse(w, r, z=top + MAST, attrs=f'fill="none" stroke="{ORANGE}" stroke-width="1" stroke-opacity="0.7" stroke-dasharray="3 3"'))
    return out


def build():
    body = [floor_grid(w, (0, 0), DISC_R, hidden(), phase=(0.5, 0.5)) + disc_arcs(w, DISC_R, mask=label_gap())]
    for f in range(FLOORS):
        body += faces(w, -HALF, HALF, -HALF, HALF, f * FLOOR, (f + 1) * FLOOR, HIGH if f == LIT else FACES)
    for f in range(FLOORS):
        body += windows(f * FLOOR)
    body += antenna()
    body += label(w.p(*DOT), (TEXT_X - 27, TITLE_Y - 4.5), TEXT_X, 'HELP DESK FLOOR', 'your team\'s first call')
    return doc(TITLE, body, translate=(275.4, 218.1))


if __name__ == '__main__':
    write(sys.argv[1], build())
