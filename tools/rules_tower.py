"""painter.py rules for tower-grow.svg: each box's base height, looked up from gen_tower.py by its left face.
usage: python tools/painter.py public/assets/img/tower-grow.svg 262 283.2 24 tools/rules_tower.py
Window frames and their panes share points, so painter also pairs them up as fake boxes; those get None (skipped).
Painter sees all three storeys at once, which is the data-floors="3" picture."""
import math
import gen_tower
from iso import C30

gen_tower.build(False)
w = gen_tower.w


def _left(b):
    x0, x1, y0, y1, z0, z1 = b
    pts = [w.p(x0, y1, z0), w.p(x1, y1, z0), w.p(x1, y1, z1), w.p(x0, y1, z1)]
    return [((X - w.ox) / (C30 * w.u), (Y - w.oy) / (w.u / 2)) for X, Y in pts]


_known = [(_left(b), b) for b in gen_tower.BOXES]


def z0(b):
    for pts, box in _known:
        if all(math.dist(p, q) < 0.02 for p, q in zip(pts, b['A'])):
            return box[4]
    return None


def label(b): return f"box L{b['line']}"
