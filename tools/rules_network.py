"""painter.py rules for network.svg: each box's base height, looked up from gen_network.py by its left face.
usage: python tools/painter.py public/assets/img/network.svg 264 209 1 tools/rules_network.py"""
import gen_network
from iso import C30, W

w = W(gen_network.TX, gen_network.TY, gen_network.w.u)   # painter measures in page coordinates, so include the translate


def _left(b):
    x0, x1, y0, y1, z0, z1 = b
    pts = [w.p(x0, y1, z0), w.p(x1, y1, z0), w.p(x1, y1, z1), w.p(x0, y1, z1)]
    return [((X - w.ox) / (C30 * w.u), (Y - w.oy) / (w.u / 2)) for X, Y in pts]


_known = [(_left(b), b) for b in gen_network.solids()]


def _find(b):
    for pts, box in _known:
        # compare in pixels: the file rounds to 0.1px, which is a lot of world units at u = 1
        if all(abs(p[0] - q[0]) * C30 * w.u < 0.12 and abs(p[1] - q[1]) * w.u / 2 < 0.12 for p, q in zip(pts, b['A'])):
            return box
    return None


def z0(b):
    box = _find(b)
    return None if box is None else box[4]


def label(b):
    box = _find(b)
    return 'unknown' if box is None else 'box x%g-%g y%g-%g z%g-%g' % box
