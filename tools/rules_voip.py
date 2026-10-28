"""painter.py rules for voip.svg: each box's base height, looked up from gen_voip.py by its left face.
usage: python tools/painter.py public/assets/img/voip.svg 288 228 23 tools/rules_voip.py"""
import gen_voip
from iso import C30, W

w = W(gen_voip.TX, gen_voip.TY, gen_voip.w.u)   # painter measures in page coordinates, so include the translate


def _left(b):
    x0, x1, y0, y1, z0, z1 = b
    pts = [w.p(x0, y1, z0), w.p(x1, y1, z0), w.p(x1, y1, z1), w.p(x0, y1, z1)]
    return [((X - w.ox) / (C30 * w.u), (Y - w.oy) / (w.u / 2)) for X, Y in pts]


_known = [(_left(b), b) for b in gen_voip.objects()]


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
    return 'unknown' if box is None else 'box x%g-%g y%g-%g z%g-%g' % box
