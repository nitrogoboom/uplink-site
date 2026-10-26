"""painter.py rules for helpdesk.svg, boxes in drawing order.
usage: python tools/painter.py site/assets/img/helpdesk.svg 265.7 200.9 23 tools/rules_helpdesk.py"""
NAMES = ['desk', 'monitor', 'keyboard', 'mouse', 'seat', 'chair back', 'ticket open', 'ticket in progress', 'ticket resolved']
Z0 = [0, 2.6, 2.6, 2.6, 0, 1.8, 7.5, 5.0, 2.5]
def _k(b): return b['idx'] // 3 if b['idx'] < 6 else (b['idx'] - 3) // 3   # 3 outline polygons sit after the monitor
def z0(b): return Z0[_k(b)]
def label(b): return NAMES[_k(b)]
