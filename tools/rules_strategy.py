"""painter.py rules for strategy.svg: four bars standing on the floor.
usage: python tools/painter.py site/assets/img/strategy.svg 280.1 269 20 tools/rules_strategy.py"""
def z0(b): return 0.0
def label(b): return f"bar {b['idx'] // 3 + 1}"
