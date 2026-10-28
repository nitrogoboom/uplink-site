"""painter.py rules for helpdesk.svg: the boxes in drawing order (painter calls z0 once per box, in order).
usage: python tools/painter.py public/assets/img/helpdesk.svg 265.7 200.9 23 tools/rules_helpdesk.py"""
BOXES = [('desk', 0), ('monitor foot', 2.625), ('monitor neck', 2.75), ('monitor', 3.125), ('phone', 2.625), ('handset', 2.875),
         ('keyboard', 2.625), ('mouse', 2.625),
         ('chair base', 0), ('chair post', 0.25), ('seat', 1.125), ('back support', 1.5), ('chair back', 1.875),
         ('ticket open', 7.75), ('ticket in progress', 5.0), ('ticket resolved', 2.5)]
_order = {}
def _k(b): return _order.setdefault(b['idx'], len(_order))
def z0(b): return BOXES[_k(b)][1]
def label(b): return BOXES[_k(b)][0]
