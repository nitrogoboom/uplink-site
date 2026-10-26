"""painter.py rules for hq.svg: three stacked storeys, 2.4 tall each.
usage: python tools/painter.py site/assets/img/hq.svg 275.4 281.1 18 tools/rules_hq.py"""
def z0(b): return b['idx'] // 3 * 2.4
def label(b): return f"storey {b['idx'] // 3}"
