"""painter.py rules for campus.svg (the footer map): each box's base height, looked up from gen_campus.py by its left face.
usage: python tools/painter.py public/assets/img/campus.svg 0 0 38 tools/rules_campus.py
Windows sit on the walls and share no box's left face, so if painter ever groups some into a fake box, it gets None (skipped)."""
import math
import gen_campus
from iso import C30

gen_campus.build()


def _left(b):
    x0, x1, y0, y1, z0, z1 = b
    pts = [gen_campus.pr(x0, y1, z0), gen_campus.pr(x1, y1, z0), gen_campus.pr(x1, y1, z1), gen_campus.pr(x0, y1, z1)]
    return [(X / (C30 * gen_campus.U), Y / (gen_campus.U / 2)) for X, Y in pts]


_known = [(_left(b), b) for b in gen_campus.BOXES]


def z0(b):
    for pts, box in _known:
        if all(math.dist(p, q) < 0.02 for p, q in zip(pts, b['A'])):
            return box[4]
    return None


def label(b): return f"box L{b['line']}"
