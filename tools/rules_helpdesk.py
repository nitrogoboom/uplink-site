"""painter.py rules for helpdesk.svg: the boxes in drawing order (painter calls z0 once per box, in order).
usage: python tools/painter.py site/assets/img/helpdesk.svg 265.7 200.9 23 tools/rules_helpdesk.py"""
BOXES = [('desk', 0), ('monitor foot', 2.6), ('monitor neck', 2.72), ('monitor', 3.05), ('keyboard', 2.6), ('mouse', 2.6),
         ('chair base', 0), ('chair post', 0.18), ('seat', 1.1), ('back support', 1.45), ('chair back', 1.8),
         ('ticket open', 7.5), ('ticket in progress', 5.0), ('ticket resolved', 2.5)]
_order = {}
def _k(b): return _order.setdefault(b['idx'], len(_order))
def z0(b): return BOXES[_k(b)][1]
def label(b): return BOXES[_k(b)][0]
