"""painter.py rules for security.svg: the boxes in drawing order (painter calls z0 once per box, in order).
usage: python tools/painter.py public/assets/img/security.svg 320 310.4 19.4667 tools/rules_security.py
check: python tools/check.py public/assets/img/security.svg
check: python tools/check.py public/assets/img/security-compact.svg
check: python tools/check.py public/assets/img/security-card.svg"""
BOXES = [('building', 0), ('roof cap', 9.0), ('roof unit', 9.25), ('awning', 2.0), ('step', 0)]
_order = {}
def _k(b): return _order.setdefault(b['idx'], len(_order))
def z0(b): return BOXES[_k(b)][1] if _k(b) < len(BOXES) else None
def label(b): return BOXES[_k(b)][0] if _k(b) < len(BOXES) else 'extra'
