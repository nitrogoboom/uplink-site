"""painter.py rules for strategy.svg: four bars standing on the floor.
usage: python tools/painter.py public/assets/img/strategy.svg 310.6 285.5 20 tools/rules_strategy.py
check: python tools/check.py public/assets/img/strategy.svg
check: python tools/check.py public/assets/img/strategy-compact.svg
check: python tools/check.py public/assets/img/strategy-card.svg"""
def z0(b): return 0.0
def label(b): return f"bar {b['idx'] // 3 + 1}"
