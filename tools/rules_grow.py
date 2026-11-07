"""painter.py rules for the Grow drawings (gen_grow.py): each box's base height, looked up by its left face.
The drawing comes from the file name (grow-world.svg is the world; the mockups' scenes go by their own names).
usage: python tools/painter.py src/components/home/grow-world.svg 0 0 20 tools/rules_grow.py
check: python tools/check.py src/components/home/grow-world.svg"""
import pathlib, sys
import gen_grow
from iso import C30

_stem = pathlib.Path(sys.argv[1]).stem
gen_grow.build('world' if _stem == 'grow-world' else _stem)
w = gen_grow.w


def _left(b):
    x0, x1, y0, y1, z0, z1 = b
    pts = [w.p(x0, y1, z0), w.p(x1, y1, z0), w.p(x1, y1, z1), w.p(x0, y1, z1)]
    return [((X - w.ox) / (C30 * w.u), (Y - w.oy) / (w.u / 2)) for X, Y in pts]


_known = [(_left(b), b) for b in gen_grow.BOXES]


def _find(b):
    for pts, box in _known:
        if all(abs(p[0] - q[0]) < 0.02 and abs(p[1] - q[1]) < 0.02 for p, q in zip(pts, b['A'])):
            return box
    return None


def z0(b):
    box = _find(b)
    return None if box is None else box[4]


def label(b):
    box = _find(b)
    return 'unknown' if box is None else 'box x%.2f-%.2f y%.2f-%.2f z%.2f-%.2f' % box
