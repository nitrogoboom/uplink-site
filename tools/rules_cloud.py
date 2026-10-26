"""painter.py rules for cloud.svg: server, laptop base and phone on the floor; slab at z=10, tiles on it.
usage: python tools/painter.py site/assets/img/cloud.svg 334 347.3 16.31 tools/rules_cloud.py"""
def z0(b):
    if abs(b['h'] - 0.48) < 0.02: return 10
    if abs(b['h'] - 0.24) < 0.02: return 10.48
    return 0.0
def label(b): return {0.48: 'slab', 0.24: 'tile'}.get(round(b['h'], 2), f"box h={b['h']:.2f}")
