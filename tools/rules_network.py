"""painter.py rules for network.svg: boxes sit on the floor, on a desk (z 50), on the rack (z 104) or hang at z 108.
usage: python tools/painter.py site/assets/img/network.svg 312.5 185.4 1 tools/rules_network.py"""
def kind(b):
    h = round(b['h'], 1)
    return {104: 'rack', 9: 'firewall', 50: 'desk', 26: 'monitor', 1.6: 'keyboard', 5: 'ap'}.get(h, f'box h{h}')
def z0(b): return {'rack': 0, 'desk': 0, 'monitor': 50, 'keyboard': 50, 'firewall': 104, 'ap': 108}.get(kind(b))
def label(b): return kind(b)
