"""painter.py rules for hq.svg: each box's base height, looked up from gen_hq.py by its left face.
usage: python tools/painter.py public/assets/img/hq.svg 275.4 281.1 18 tools/rules_hq.py"""
import gen_hq
from iso import C30

gen_hq.build()
w = gen_hq.w


def _left(b):
    x0, x1, y0, y1, z0, z1 = b
    pts = [w.p(x0, y1, z0), w.p(x1, y1, z0), w.p(x1, y1, z1), w.p(x0, y1, z1)]
    return [((X - w.ox) / (C30 * w.u), (Y - w.oy) / (w.u / 2)) for X, Y in pts]


_known = [(_left(b), b) for b in gen_hq.BOXES]


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
