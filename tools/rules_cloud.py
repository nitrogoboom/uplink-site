"""painter.py rules for cloud.svg: the boxes in drawing order (painter calls z0 once per box, in order).
usage: python tools/painter.py public/assets/img/cloud.svg 334 347.3 16.31 tools/rules_cloud.py
check: python tools/check.py public/assets/img/cloud.svg
check: python tools/check.py public/assets/img/cloud-compact.svg
check: python tools/check.py public/assets/img/cloud-card.svg"""
BOXES = ([('server', 0), ('laptop lid', 0.125), ('laptop base', 0), ('phone stand', 0), ('phone', 0.25), ('slab', 10)]
         + [(f'tile {n + 1}', 10.5) for n in range(6)])
_order = {}
def _k(b): return _order.setdefault(b['idx'], len(_order))
def z0(b): return BOXES[_k(b)][1]
def label(b): return BOXES[_k(b)][0]
