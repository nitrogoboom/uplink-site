"""painter.py rules for office.svg: each box's base height, looked up from gen_office.py by its left face.
usage: python tools/painter.py src/assets/img/office.svg 616.4 240.2 28.127 tools/rules_office.py
check: python tools/check.py src/assets/img/office.svg --step 1.758   (the props' 0.0625 grid is 1.758px here)
check: python tools/check.py src/assets/img/office-card.svg --step 1.758
check: python tools/check.py src/components/home/hero/3-back.svg --step 1.758
check: python tools/check.py src/components/home/hero/4-front.svg --step 1.758
check: python tools/check.py src/components/home/hero/5-net.svg --step 1.758
The hero's layers and the card share the office's origin and unit (a crop changes only the viewBox), so the same rules
read them; each layer is checked on its own (a later layer is drawn over an earlier one by the page):
also: python tools/painter.py src/assets/img/office-card.svg 616.4 240.2 28.127 tools/rules_office.py
also: python tools/painter.py src/components/home/hero/2-walls.svg 616.4 240.2 28.127 tools/rules_office.py
also: python tools/painter.py src/components/home/hero/3-back.svg 616.4 240.2 28.127 tools/rules_office.py
also: python tools/painter.py src/components/home/hero/4-front.svg 616.4 240.2 28.127 tools/rules_office.py
also: python tools/painter.py src/components/home/hero/5-net.svg 616.4 240.2 28.127 tools/rules_office.py"""
import gen_office
from iso import C30

gen_office.render('office')
w = gen_office.w


def _left(b):
    x0, x1, y0, y1, z0, z1 = b
    pts = [w.p(x0, y1, z0), w.p(x1, y1, z0), w.p(x1, y1, z1), w.p(x0, y1, z1)]
    return [((X - w.ox) / (C30 * w.u), (Y - w.oy) / (w.u / 2)) for X, Y in pts]


_known = [(_left(b), b) for b in gen_office.BOXES]
gen_office.BOXES.clear()
gen_office.hero_layers()                       # the hero has its own layout; know its boxes too
_known += [(_left(b), b) for b in gen_office.BOXES]


def _find(b):
    for pts, box in _known:
        if all(abs(p[0] - q[0]) < 0.02 and abs(p[1] - q[1]) < 0.02 for p, q in zip(pts, b['A'])):
            return box
    return None


_TILE_Z = gen_office.tray_box()[5]             # the tray's tiles: in the hero each has a lit twin drawn on it, by design


def z0(b):
    box = _find(b)
    return None if box is None or box[4] == _TILE_Z else box[4]


def label(b):
    box = _find(b)
    return 'unknown' if box is None else 'box x%.3g-%.3g y%.3g-%.3g z%.3g-%.3g' % box
