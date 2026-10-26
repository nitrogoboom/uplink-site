"""Draws strategy.svg (Services: strategy) from a world-space description.
Edit the numbers below and run again; don't hand-edit the SVG.
usage: python tools/gen_strategy.py site/assets/img/strategy.svg
World: 1 unit = 20px. Origin = floor disc centre. x runs right-down, y left-down, z up.
"""
import sys
from shapely.geometry import box as box_shape
from shapely.ops import unary_union
from iso import W, fmt
from isogen import FACES, HIGH, ORANGE, faces, label, doc, write, silhouette, floor_grid, disc_arcs, badge, key_group

w = W(43.3, 115, 20)                  # inside the group's translate(236.8,154)

DISC_R = 9.165                        # floor disc radius
GRID_X0, GRID_Y0 = 0, 0.5             # grid every 1 unit: x lines on whole numbers, y lines on halves

# budget bars, left to right: (x0, height); all 1.6 x 1.6, last one highlighted
BAR_W, BAR_Y = 1.6, (-4.5, -2.9)
BARS = [(-6.5, 2.0), (-4.1, 3.4), (-1.7, 4.6), (0.7, 6.4)]

# roadmap on the floor, through grid crossings; milestones sit on the marked corners
ROAD = [(-7, 2.5), (-3, 2.5), (-3, 0.5), (2, 0.5), (2, 3.5), (7, 3.5)]
# (corner index, text, anchor, text dx, text dy, text width) - text offsets in px from the marker
MILESTONES = [(0, 'Q1 AUDIT', 'end', -13, 4, 58),
              (2, 'Q2 UPGRADE', 'middle', 0, -15, 78),
              (3, 'Q3 SECURE', 'start', 13, 4, 68),
              (5, 'Q4 REVIEW', 'start', 13, 4, 67)]
PAD = 5                               # floor lines stop this far from milestone text

BUDGET_TEXT_X = 210.4
BUDGET_ELBOW = (183.4, -69.0)

WHITE = '#F1F4F8'
TITLE = 'Rising budget bars and a quarterly IT roadmap path'


def bar_boxes():
    for i, (x0, h) in enumerate(BARS):
        yield (x0, x0 + BAR_W, BAR_Y[0], BAR_Y[1], 0, h), HIGH if i == len(BARS) - 1 else FACES


def text_rect(i, txt, anchor, dx, dy, width):
    X, Y = w.p(*ROAD[i]); tx, base = X + dx, Y + dy
    left = {'start': tx, 'middle': tx - width / 2, 'end': tx - width}[anchor]
    return box_shape(left - PAD, base - 16, left + width + PAD, base + 8)


def hidden():
    """Screen areas floor lines skip: milestone text and the bars standing on the floor."""
    rects = [text_rect(*m) for m in MILESTONES]
    sil = [silhouette(w, *b) for b, _c in bar_boxes()]
    return unary_union(rects + sil)






def roadmap():
    return f'<polyline points="{w.pts(*[(x, y, 0) for x, y in ROAD])}" fill="none" stroke="{ORANGE}" stroke-width="1.8" stroke-opacity="0.9"/>'


def milestones():
    dots, texts = [], []
    for i, txt, anchor, dx, dy, _ in MILESTONES:
        X, Y = w.p(*ROAD[i])
        dots.append(f'<circle cx="{fmt(X)}" cy="{fmt(Y)}" r="6.5" fill="{FACES[2]}" stroke="{ORANGE}" stroke-width="2.5"/>')
        texts.append(key_group(txt) + f'<text class="lt" x="{fmt(X + dx)}" y="{fmt(Y + dy)}" font-size="11" font-weight="600" letter-spacing="0.66" '
                     f'fill="{WHITE}" text-anchor="{anchor}">{txt}</text>' + badge(X, Y, ORANGE) + '</g>')
    return dots + texts


def build():
    mask = hidden()
    body = [floor_grid(w, (0, 0), DISC_R, mask, phase=(GRID_X0, GRID_Y0)) + disc_arcs(w, DISC_R, mask=mask), roadmap()]
    for b, cols in bar_boxes():
        body += faces(w, *b, cols)
    body += milestones()
    x0, h = BARS[-1]
    top = w.p(x0 + BAR_W / 2, sum(BAR_Y) / 2, h)          # centre of the tallest bar's top
    body += label(top, BUDGET_ELBOW, BUDGET_TEXT_X, 'IT BUDGET', 'planned, not surprised')
    return doc(TITLE, body, translate=(236.8, 154.0))


if __name__ == '__main__':
    write(sys.argv[1], build())
