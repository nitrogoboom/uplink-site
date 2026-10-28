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
import palette as pal

w = W(43.3, 115, 20)                  # inside the group's translate(267.3,170.5)

DISC_R = 9                            # floor disc radius
GRID_X0, GRID_Y0 = 0.5, 0.5           # grid every 1 unit, lines on the halves (symmetric round the centre)

# budget bars, left to right: 1.5 x 1.5, 0.75 apart, rising in even 1.5 steps; the last one highlighted
BAR_W, BAR_GAP, BAR_Y = 1.5, 0.75, (-4.5, -3.0)
BAR_X0, BAR_H0, BAR_STEP = -7.5, 2.0, 1.5
BARS = [(BAR_X0 + i * (BAR_W + BAR_GAP), BAR_H0 + i * BAR_STEP) for i in range(4)]
TREND = 0.6                           # dashed trend line through the bar tops: opacity

# roadmap on the floor in front of the bars: an even staircase (4 along +x, 2 along -y) that reads left to
# right on screen, one milestone every second corner
ROAD = [(-4, 6), (0, 6), (0, 4), (4, 4), (4, 2), (8, 2), (8, 0)]
# (corner index, text, text width): every label centred above its marker, same height
MILESTONES = [(0, 'Q1 AUDIT', 58), (2, 'Q2 UPGRADE', 78), (4, 'Q3 SECURE', 68), (6, 'Q4 REVIEW', 67)]
TEXT_RISE = 15                        # px: text baseline above the marker centre
PAD = 5                               # floor lines stop this far from milestone text

BUDGET_ELBOW = (150.0, -96.0)         # IT BUDGET leader: elbow (screen); text starts 27px past it

# compact phone cut (isogen.doc crop): the same scene framed close, labels at 1.55x. Crop is in page coordinates,
# kept 4:3; elbows are in the drawing's group coordinates. Each quarter becomes two short lines (Q1 over AUDIT)
# so the four still fit side by side at the bigger size.
COMPACT = dict(crop=(88, 50, 473, 354.75), scale=1.55, budget_sub='planned,\nnot surprised',
               budget_elbow=(136.0, -96.0))    # IT BUDGET a little left of the full one, clear of the frame
GREY = pal.GREY

WHITE = pal.WHITE
TITLE = 'Rising budget bars and a quarterly IT roadmap path'


def bar_boxes():
    for i, (x0, h) in enumerate(BARS):
        yield (x0, x0 + BAR_W, BAR_Y[0], BAR_Y[1], 0, h), HIGH if i == len(BARS) - 1 else FACES


def text_rect(i, txt, width):
    X, Y = w.p(*ROAD[i]); base = Y - TEXT_RISE
    return box_shape(X - width / 2 - PAD, base - 16, X + width / 2 + PAD, base + 8)


def compact_rects():
    """Floor lines stop around the compact cut's two-line quarters and the IT BUDGET text."""
    k = COMPACT['scale']
    out = []
    for i, txt, width in MILESTONES:
        X, Y = w.p(*ROAD[i]); half = (width - 17) * k / 2 + PAD     # the word line is the wider one
        out.append(box_shape(X - half, Y - TEXT_RISE * k - 26 * k, X + half, Y - TEXT_RISE * k + 4 * k))
    ex, ey = COMPACT['budget_elbow']; tx = ex + 27 * k; ty = ey + 4.5 * k
    out.append(box_shape(ex - 4, ty - 15 * k, tx + 70 * k + 5, ty + 15 * k + 13 * k + 5 * k))
    return out


def hidden(compact=False):
    """Screen areas floor lines skip: milestone text and the bars standing on the floor."""
    rects = compact_rects() if compact else [text_rect(*m) for m in MILESTONES]
    sil = [silhouette(w, *b) for b, _c in bar_boxes()]
    return unary_union(rects + sil)






def roadmap():
    return f'<polyline points="{w.pts(*[(x, y, 0) for x, y in ROAD])}" fill="none" stroke="{ORANGE}" stroke-width="1.8" stroke-opacity="0.9"/>'


def trend():
    """Dashed line through the centres of the bar tops: the steady rise, at a glance."""
    pts = [w.p(x0 + BAR_W / 2, sum(BAR_Y) / 2, h) for x0, h in BARS]
    line = ' '.join(f'{fmt(X)},{fmt(Y)}' for X, Y in pts)
    dots = ''.join(f'<circle cx="{fmt(X)}" cy="{fmt(Y)}" r="2.5" fill="{ORANGE}"/>' for X, Y in pts[:-1])
    return (f'<polyline class="mark" points="{line}" fill="none" stroke="{ORANGE}" stroke-width="1.4" stroke-opacity="{TREND}" '
            f'stroke-dasharray="4 4"/>' + dots)


def milestones(compact=False):
    dots, texts = [], []
    k = COMPACT['scale']
    for i, txt, _ in MILESTONES:
        X, Y = w.p(*ROAD[i])
        dots.append(f'<circle cx="{fmt(X)}" cy="{fmt(Y)}" r="6.5" fill="{FACES[2]}" stroke="{ORANGE}" stroke-width="2.5"/>')
        if compact:                    # "Q1" in title size over its word in subline size
            q, word = txt.split(' ', 1)
            base = Y - TEXT_RISE * k
            texts.append(key_group(txt) + f'<text class="lt" x="{fmt(X)}" y="{fmt(base - 18 * k)}" font-size="{13 * k:.3g}" font-weight="600" '
                         f'letter-spacing="{0.78 * k:.3g}" fill="{ORANGE}" text-anchor="middle">{q}</text>'
                         f'<text class="lt" x="{fmt(X)}" y="{fmt(base)}" font-size="{11 * k:.3g}" font-weight="600" letter-spacing="{0.66 * k:.3g}" '
                         f'fill="{WHITE}" text-anchor="middle">{word}</text>' + badge(X, Y, ORANGE) + '</g>')
            continue
        texts.append(key_group(txt) + f'<text class="lt" x="{fmt(X)}" y="{fmt(Y - TEXT_RISE)}" font-size="11" font-weight="600" letter-spacing="0.66" '
                     f'fill="{WHITE}" text-anchor="middle">{txt}</text>' + badge(X, Y, ORANGE) + '</g>')
    return dots + texts


def build(compact=False):
    mask = hidden(compact)
    body = [floor_grid(w, (0, 0), DISC_R, mask, phase=(GRID_X0, GRID_Y0)) + disc_arcs(w, DISC_R, mask=mask), roadmap()]
    for b, cols in bar_boxes():
        body += faces(w, *b, cols)
    body.append(trend())
    body += milestones(compact)
    x0, h = BARS[-1]
    top = w.p(x0 + BAR_W / 2, sum(BAR_Y) / 2, h)          # centre of the tallest bar's top
    if compact:
        k = COMPACT['scale']
        ex, ey = COMPACT['budget_elbow']
        body += label(top, (ex, ey), ex + 27 * k, 'IT BUDGET', COMPACT['budget_sub'], scale=k)
        return doc(TITLE, body, translate=(267.3, 170.5), crop=COMPACT['crop'])
    body += label(top, BUDGET_ELBOW, BUDGET_ELBOW[0] + 27, 'IT BUDGET', 'planned, not surprised')
    return doc(TITLE, body, translate=(267.3, 170.5))   # content centred in the 640 x 480 frame


if __name__ == '__main__':
    write(sys.argv[1], build())
    write(sys.argv[1].replace('.svg', '-compact.svg'), build(compact=True))     # phone cut, served by <picture> on small screens
