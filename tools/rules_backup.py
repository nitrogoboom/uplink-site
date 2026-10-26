"""painter.py rules for backup.svg: the offsite building, then three appliances (1.375 tall, 0.125 apart).
usage: python tools/painter.py site/assets/img/backup.svg 268.6 214.6 16.46 tools/rules_backup.py"""
BOXES = [('offsite building', 0), ('appliance 0', 0), ('appliance 1', 1.5), ('appliance 2', 3.0)]
_order = {}
def _k(b): return _order.setdefault(b['idx'], len(_order))
def z0(b): return BOXES[_k(b)][1]
def label(b): return BOXES[_k(b)][0]
