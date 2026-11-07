"""Draws the footer's campus map (every page): one spot per footer section on a 16 x 16 platform.
Writes public/assets/img/campus.svg. footer.js fetches it when the footer comes near the screen and puts it in the
page, where src/styles/footer.css (.fc-w) colours and animates it. No phone cut: it is one drawing at every size.
Edit the numbers below and run again; don't hand-edit the SVG.
usage: python tools/gen_campus.py
World: screen = ((x - y) * cos30 * U, (x + y) * U / 2 - z * U); origin at the platform's back corner, x runs
right-down, y left-down, z up. Each spot (<g class="dist" data-k="...">) carries its camera: data-vb, the viewBox
that frames it (the whole map zoomed in by its zoom, kept inside the whole map), and data-mk, where the marker sits
over it. Its ring and its route (if any) carry the same data-k; footer.js lights the three (.on) and flies there.
The loops run out of step by --d, each shape's animation delay (footer.css reads var(--d)); the lit and blinking
windows come from a seeded random sequence, so a rerun draws the same campus.
The words for each spot are content, in src/data/footer.json (spots).
Keep the classes footer.css and footer.js use (plat, grid, edge, ring, ring2, route, flow, dist, b, tree, win, lit,
blink, led, w2, dot, mast, beacon, sig, bob, tk-n, mk-*) and the group order: back to front (painter.py).
"""
import math, pathlib
from decimal import Decimal, ROUND_HALF_UP
from isogen import hoist_styles, esc

C30, U = math.cos(math.pi / 6), 38
VB0 = (-600, -120, 1200, 860)       # the whole map; each spot's camera zooms into it
MARK_LIFT = 52                      # px from a spot's top to the marker's centre
TITLE = 'Map of the Uplink campus. The spot for the footer section you pick is lit up.'
BOXES = []                          # every box drawn, in order (rules_campus.py reads it for painter.py)


def fmt(v):
    """one decimal, a half rounded away from zero (iso.fmt rounds it to even), as the map was first drawn: footer.js
    built it in the browser with toFixed(1)"""
    return str(Decimal(v + 0.0).quantize(Decimal('0.1'), ROUND_HALF_UP)) if v else '0.0'


def pr(x, y, z=0):
    return ((x - y) * C30 * U, (x + y) * U / 2 - z * U)


def pts(a):
    return ' '.join(f'{fmt(X)},{fmt(Y)}' for X, Y in (pr(*p) for p in a))


def box(x, y, z, w, d, h, cls='b'):
    BOXES.append((x, x + w, y, y + d, z, z + h))
    return (f'<g class="{cls}">'
            f'<polygon class="f-l" points="{pts([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]])}"/>'
            f'<polygon class="f-r" points="{pts([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]])}"/>'
            f'<polygon class="f-t" points="{pts([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]])}"/></g>')


def circ(cx, cy, z, r, n=56):
    return pts([[cx + r * math.cos(i / n * math.pi * 2), cy + r * math.sin(i / n * math.pi * 2), z] for i in range(n + 1)])


def line(cls, a, b):
    (x1, y1), (x2, y2) = pr(*a), pr(*b)
    return f'<line{f" class=\"{cls}\"" if cls else ""} x1="{fmt(x1)}" y1="{fmt(y1)}" x2="{fmt(x2)}" y2="{fmt(y2)}"/>'


def delay(s):
    return f' style="--d:{s}s"'


seed = 7
def rnd():
    global seed
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280


def win(quad):
    lit = rnd() < 0.3
    blink = lit and rnd() < 0.5
    cls = 'win' + (' lit' if lit else '') + (' blink' if blink else '')
    return f'<polygon class="{cls}"{delay(f"-{rnd() * 4:.2f}") if blink else ""} points="{pts(quad)}"/>'


def wins_y(x0, x1, y, z0, z1, cols, rows):
    """windows on a front-left wall (y = const)"""
    s, cw, rh = '', (x1 - x0) / cols, (z1 - z0) / rows
    for c in range(cols):
        for r in range(rows):
            a = x0 + c * cw + cw * 0.22; b = a + cw * 0.56; lo = z0 + r * rh + rh * 0.25; hi = lo + rh * 0.5
            s += win([[a, y, lo], [b, y, lo], [b, y, hi], [a, y, hi]])
    return s


def wins_x(x, y0, y1, z0, z1, cols, rows):
    """windows on a front-right wall (x = const)"""
    s, cw, rh = '', (y1 - y0) / cols, (z1 - z0) / rows
    for c in range(cols):
        for r in range(rows):
            a = y0 + c * cw + cw * 0.22; b = a + cw * 0.56; lo = z0 + r * rh + rh * 0.25; hi = lo + rh * 0.5
            s += win([[x, a, lo], [x, b, lo], [x, b, hi], [x, a, hi]])
    return s


def led(x, y, z, cls=''):
    cx, cy = pr(x, y, z)
    return f'<circle class="led{cls}"{delay(f"-{rnd() * 3:.2f}")} cx="{fmt(cx)}" cy="{fmt(cy)}" r="1.7"/>'


def dot(x, y, z):
    cx, cy = pr(x, y, z)
    return f'<circle cx="{fmt(cx)}" cy="{fmt(cy)}" r="3.5" class="dot"/>'


def tree(x, y, s=0.5):
    return box(x, y, 0, s, s, s * 1.1, 'tree')


# ---- the spots: one per kind of footer section ----------------------------------------------------------------
# at: the ground point the ring circles (r units wide); top: where the marker hovers; zoom: the camera's zoom;
# route: the path from HQ, on the ground.
def hq():
    return (box(6, 6, 0, 4, 4, 0.55) + box(6.9, 6.9, 0.55, 2.2, 2.2, 5.3) +
            wins_y(6.9, 9.1, 9.1, 0.8, 5.6, 3, 6) + wins_x(9.1, 6.9, 9.1, 0.8, 5.6, 3, 6) +
            box(7.25, 7.25, 5.85, 1.5, 1.5, 0.35) + line('mast', (8, 8, 6.2), (8, 8, 7.2)) +
            f'<polyline class="beacon" points="{circ(8, 8, 7.2, 0.7)}"/><polyline class="beacon"{delay(-1.2)} points="{circ(8, 8, 7.2, 0.7)}"/>' +
            dot(8, 8, 7.2))


def services():
    s = ''
    for i in range(4):
        x = 10.9 + i * 0.95
        s += box(x, 2.6, 0, 0.7, 1.8, 2.4)
        for k in range(6):
            s += led(x + 0.35, 4.4, 0.4 + k * 0.33, ' w2' if k % 3 == 1 else '')
    return s


def resources():
    s = box(4.9, 1.6, 0, 0.8, 0.8, 0.4)   # 0.4 tall: at 0.5 its top corner ran 1px from the stack's first box (check.py)
    for z in (0, 0.58, 1.16):
        s += box(6.1, 1.1, z, 1.8, 1.8, 0.45)
        for k in range(3):
            s += led(6.5 + k * 0.4, 2.9, z + 0.22)
    return s


def follow():
    return (box(1.5, 6.5, 0, 1, 1, 0.4) + box(1.85, 6.85, 0.4, 0.3, 0.3, 2.6) +
            box(1.7, 6.7, 3.0, 0.6, 0.6, 0.12) + box(1.85, 6.85, 3.12, 0.3, 0.3, 1.88) +
            ''.join(f'<polyline class="sig"{delay(d)} points="{circ(2, 7, 5.0, 0.9)}"/>' for d in (0, -0.9, -1.8)) +
            dot(2, 7, 5.0))


def company():
    return (box(2.2, 11.4, 0, 2.8, 2, 1.6) + wins_y(2.2, 5, 13.4, 0.2, 1.5, 5, 2) + wins_x(5, 11.4, 13.4, 0.2, 1.5, 3, 2) +
            box(2.5, 11.7, 1.6, 0.55, 0.55, 0.55, 'tree') + box(3.4, 11.7, 1.6, 0.55, 0.55, 0.7, 'tree') +
            box(4.2, 12.5, 1.6, 0.5, 0.5, 0.5, 'tree'))


def support():
    return (box(12.7, 8.3, 0, 2, 1.9, 2.1) + wins_y(12.7, 14.7, 10.2, 0.2, 2.0, 3, 2) + wins_x(14.7, 8.3, 10.2, 0.2, 2.0, 3, 2) +
            ''.join(f'<g class="bob"{delay(d)}>{box(13.15, 8.75, z, 1.1, 1.0, 0.12, f"tk tk-{n}")}</g>'
                    for z, n, d in ((2.8, 1, 0), (3.35, 2, -0.6), (3.9, 3, -1.2))))


def industries():
    return (box(8.2, 12.6, 0, 1.2, 1.2, 1.8) + wins_y(8.2, 9.4, 13.8, 0.2, 1.7, 2, 3) +
            box(9.8, 12.4, 0, 1.3, 1.0, 2.6) + wins_x(11.1, 12.4, 13.4, 0.2, 2.5, 2, 4) +
            box(8.5, 14.1, 0, 1.6, 1.0, 1.2) + wins_y(8.5, 10.1, 15.1, 0.15, 1.0, 3, 2) +   # 1.2 tall, from x 8.5: clear of the windows behind (check.py)
            box(10.3, 13.7, 0, 1.0, 1.0, 1.4) + wins_x(11.3, 13.7, 14.7, 0.15, 1.3, 2, 2))


SPOTS = {
    'hq':         dict(at=(8, 8), top=(8, 8, 7.45), r=2.6, zoom=1.12, draw=hq),
    'services':   dict(at=(12.8, 3.5), top=(12.8, 3.5, 2.4), r=2.4, zoom=1.35, draw=services,
                       route=[(10, 7.6), (12.9, 7.6), (12.9, 4.4)]),
    'resources':  dict(at=(7, 2), top=(7, 2, 1.7), r=1.8, zoom=1.35, draw=resources, route=[(7.5, 6), (7.5, 2.9)]),
    'follow':     dict(at=(2, 7), top=(2, 7, 5.3), r=1.7, zoom=1.35, draw=follow, route=[(6, 7.2), (2.5, 7.2)]),
    'company':    dict(at=(3.6, 12.4), top=(3.6, 12.4, 2.3), r=2.3, zoom=1.35, draw=company,
                       route=[(7, 10), (7, 12.3), (5, 12.3)]),
    'support':    dict(at=(13.7, 9.3), top=(13.7, 9.3, 4.4), r=2.2, zoom=1.35, draw=support, route=[(10, 9.2), (12.7, 9.2)]),
    'industries': dict(at=(9.6, 13.6), top=(10.45, 12.9, 2.7), r=2.4, zoom=1.35, draw=industries, route=[(9, 10), (9, 12.6)]),
}
ORDER = ['resources', 'follow', 'services', 'company', 'hq', 'support', 'industries']   # back to front (painter.py)


def camera(d):
    """the viewBox that frames a spot, and where the marker sits over it"""
    top, ground = pr(*d['top']), pr(*d['at'])
    w, h = VB0[2] / d['zoom'], VB0[3] / d['zoom']
    x = min(max((top[0] + ground[0]) / 2 - w / 2, VB0[0]), VB0[0] + VB0[2] - w)
    y = min(max((top[1] + ground[1]) / 2 - h / 2, VB0[1]), VB0[1] + VB0[3] - h)
    return (x, y, w, h), (top[0], top[1] - MARK_LIFT)


def build():
    global seed
    seed = 7
    BOXES.clear()
    s = ['<defs><radialGradient id="fc-shade"><stop offset="0.45" class="shade"/><stop offset="1" class="shade" stop-opacity="0"/></radialGradient></defs>',
         f'<ellipse class="shadow" cx="0" cy="{fmt(pr(16, 16)[1] + 34)}" rx="466" ry="74"/>',   # the platform's soft shadow
         box(0, 0, -0.7, 16, 16, 0.7, 'plat') + '<g class="grid floor">' +   # floor: check.py skips the grid
         ''.join(line('', (k, 0), (k, 16)) + line('', (0, k), (16, k)) for k in range(1, 16)) + '</g>',
         f'<polyline class="edge" points="{pts([[0, 16, 0], [16, 16, 0], [16, 0, 0]])}"/>',
         f'<polyline class="ring2" points="{circ(8, 8, 0, 3.6)}"/>']
    for k in ORDER:
        if 'route' in SPOTS[k]:
            p = pts([[x, y, 0] for x, y in SPOTS[k]['route']])
            s.append(f'<polyline class="route mark" data-k="{k}" points="{p}"/><polyline class="flow mark" data-k="{k}" points="{p}"/>')   # mark: drawn over the ground, not part of it (check.py)
    s += [f'<polyline class="ring" data-k="{k}" points="{circ(*SPOTS[k]["at"], 0.02, SPOTS[k]["r"])}"/>' for k in ORDER]
    s.append(tree(1.4, 1.6) + tree(2.4, 1.2, 0.4) + tree(1.2, 2.8, 0.45) + tree(14.6, 14.4) + tree(13.6, 14.9, 0.4) +
             tree(6.2, 15, 0.45) + tree(14.8, 1.4, 0.45))
    for k in ORDER:
        vb, mk = camera(SPOTS[k])
        s.append(f'<g class="dist" data-k="{k}" data-vb="{" ".join(f"{v:g}" for v in vb)}" data-mk="{mk[0]:g} {mk[1]:g}">{SPOTS[k]["draw"]()}</g>')
    s.append('<g class="mk"><g class="mk-bob"><line class="mk-line" x1="0" y1="14" x2="0" y2="52"/>'
             '<polygon class="mk-d" points="0,-15 11,0 0,15 -11,0"/><polygon class="mk-i" points="0,-6 4.5,0 0,6 -4.5,0"/></g></g>')
    body, css = hoist_styles('\n'.join(s))
    return '\n'.join([
        f'<svg xmlns="http://www.w3.org/2000/svg" class="fc-w" viewBox="{" ".join(map(str, VB0))}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="{esc(TITLE)}">',
        f'<style>{css}</style>', body, '</svg>', ''])


if __name__ == '__main__':
    root = pathlib.Path(__file__).resolve().parent.parent
    open(root / 'public/assets/img/campus.svg', 'w', encoding='utf-8', newline='\n').write(build())
