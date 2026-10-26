"""Draws cloud.svg (Services, Work) from a world-space description.
Edit the numbers below and run again; don't hand-edit the SVG.
usage: python tools/gen_cloud.py site/assets/img/cloud.svg
World: 1 unit = 16.31px (one floor-grid square). Origin = floor-disc centre. x runs right-down, y left-down, z up.
"""
import sys
from shapely.geometry import LineString, Polygon, box as box_shape
from shapely.ops import unary_union
from iso import W, C30, fmt
from isogen import FACES, HIGH, ORANGE, BLUE, faces, label, doc, write, silhouette, floor_grid, disc_arcs

w = W(21.2, 36.7, 16.31)              # inside the group's translate(312.8,310.6)

DISC_R = 9.085                        # floor disc; grid lines on whole x and half y

SERVER = (-6, -3.4, -2.5, 0.1, 0, 5)  # x0 x1 y0 y1 z0 z1
STRIPE_INSET = 0.2                    # drive-bay lines on the server's left wall, at z = 1, 2, 3, 4
LAPTOP = (-1, 2.6, -0.5, 1.9, 0, 0.2)
LID_BACK, LID_UP = 0.4, 2.4               # lid's top edge sits this far behind and above the hinge (leans ~9.5 deg);
                                      # puts both top corners exactly on floor-grid lines, so no line ends a hair from a corner
SCREEN_INSET = 0.3
PHONE = (4.6, 5.8, 1.5, 1.8, 0, 2.2)  # x was 4.5: its corner sat 1.6px from the laptop's

PLAT_X, PLAT_Y, PLAT_Z = 0, -0.905, 10  # cloud slab: centre and underside
TILE, TILE_GAP, PAD = 2.04, 0.42, 0.48  # 3 x 2 app tiles on the slab
SLAB_H, TILE_H = 0.48, 0.24
ICON = 1.5                            # icon size on a tile (24-unit icon grid)
LIT_TILE = 0                          # highlighted tile (mail)

CARD = dict(w=202.9, h=70.8, top=-286.6, rx=9.8)   # screen space, centred over the slab
CARD_ROWS = ['MICROSOFT 365', 'GOOGLE WORKSPACE']

# sync arrows: start (top centre of that box, or the lid's top edge), screen end (arrow tip is 8px further), screen y of both curve handles
SYNC = [('server', (-36.0, -119.6), -113.2),            # server top
        ('lid', (20.0, -87.3), -55.7),                 # laptop lid, top edge centre
        ('phone', (93.7, -93.7), -31.9)]                # phone top

TITLE = ('Server, laptop and phone syncing to a cloud workspace of mail, files, meetings, chat, calendar and sign-in, '
         'run on Microsoft 365 or Google Workspace')

# 24x24 line icons, row by row (x first)
ICONS = [
    '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M4 7l8 6 8-6"/>',                        # mail
    '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 17h4"/>',                                      # files
    '<rect x="3" y="7" width="12" height="10" rx="2"/><path d="M15 11l6-3v8l-6-3z"/>',                     # meetings
    '<path d="M4 5h16v11H10l-6 4z"/><path d="M8 10h8"/>',                                                  # chat
    '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',                # calendar
    '<path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',                    # sign-in
]

LABELS = [  # dot (middle of that box's left wall), elbow (screen), text x, anchor, title, subline
    ('server', (-96.6, 8.4), -123.6, 'end', 'OLD SERVER', 'migrated, then retired'),
    ('phone', (117.8, 113.4), 144.8, 'start', 'ANY DEVICE', 'same files everywhere'),
]
LABEL_GAPS = [box_shape(-1e4, -5.1, -118.6, 35.9), box_shape(139.8, 99.9, 1e4, 1e4)]   # floor clears round the text
TAIL_PAD = 5                          # and round each leader's level tail


def top_centre(b):
    x0, x1, y0, y1, _, z1 = b
    return ((x0 + x1) / 2, (y0 + y1) / 2, z1)


def wall_centre(b):
    """Middle of the box's left (front-left, y = y1) wall."""
    x0, x1, _, y1, z0, z1 = b
    return ((x0 + x1) / 2, y1, (z0 + z1) / 2)


ANCHORS = {'server': SERVER, 'phone': PHONE}


def lid():
    """Hinge on the base's back top edge; returns (hinge-left, hinge-right, top-right, top-left) world points."""
    x0, x1, y0, _, _, z1 = LAPTOP
    return [(x0, y0, z1), (x1, y0, z1), (x1, y0 - LID_BACK, z1 + LID_UP), (x0, y0 - LID_BACK, z1 + LID_UP)]


def on_lid(s, f):
    """Point at fraction s along the hinge, f up the lid."""
    a, b, _, d = lid()
    return tuple(a[k] + (b[k] - a[k]) * s + (d[k] - a[k]) * f for k in range(3))


def mask():
    tails = []
    for _, (ex, ey), tx, a, *_ in LABELS:
        end = tx + 7 if a == 'end' else tx - 7
        tails.append(LineString([(ex, ey), (end, ey)]).buffer(TAIL_PAD))
    solids = [silhouette(w, *SERVER), silhouette(w, *LAPTOP), Polygon([w.p(*p) for p in lid()]), silhouette(w, *PHONE)]
    # solids grow by a hair so a floor line that runs exactly along an edge is dropped, not left as a sliver
    return unary_union(LABEL_GAPS + tails + [p.buffer(0.05) for p in solids])






def server():
    x0, x1, y0, y1, z0, z1 = SERVER
    out = faces(w, *SERVER)
    for z in range(1, int(z1 - z0)):
        out.append(f'<polyline points="{w.pts((x0 + STRIPE_INSET, y1, z), (x1 - STRIPE_INSET, y1, z))}" '
                   f'fill="none" stroke="{BLUE}" stroke-width="1" stroke-opacity="0.6"/>')
    return out


def laptop():
    out = faces(w, *LAPTOP)
    out.append(f'<polygon class="free" points="{w.pts(*lid())}" fill="{FACES[0]}" stroke="#D9E4F0" stroke-width="1" stroke-opacity="0.3"/>')
    i = SCREEN_INSET
    s0, s1 = i / (LAPTOP[1] - LAPTOP[0]), 1 - i / (LAPTOP[1] - LAPTOP[0])
    f0, f1 = i / LID_UP, 1 - i / LID_UP
    out.append(f'<polygon class="free" points="{w.pts(on_lid(s0, f0), on_lid(s1, f0), on_lid(s1, f1), on_lid(s0, f1))}" '
               f'fill="none" stroke="{ORANGE}" stroke-width="1" stroke-opacity="0.8"/>')
    return out


def sync():
    curves, arrows = [], []
    for start, (ex, ey), hy in SYNC:
        sx, sy = w.p(*(on_lid(0.5, 1) if start == 'lid' else top_centre(ANCHORS[start])))
        curves.append(f'<path d="M{fmt(sx)},{fmt(sy)} C{fmt(sx)},{fmt(hy)} {fmt(ex)},{fmt(hy)} {fmt(ex)},{fmt(ey)}" '
                      f'fill="none" stroke="{ORANGE}" stroke-width="1.4" stroke-dasharray="5 5"/>')
        arrows.append(f'<polygon class="mark" points="{fmt(ex)},{fmt(ey - 8)} {fmt(ex - 5)},{fmt(ey + 1)} {fmt(ex + 5)},{fmt(ey + 1)}" '
                      f'fill="{ORANGE}" stroke="{ORANGE}" stroke-width="1"/>')
    return curves + arrows


def slab():
    W_ = 3 * TILE + 2 * TILE_GAP + 2 * PAD
    D_ = 2 * TILE + TILE_GAP + 2 * PAD
    x0, y0 = PLAT_X - W_ / 2, PLAT_Y - D_ / 2
    z1 = PLAT_Z + SLAB_H
    out = faces(w, x0, x0 + W_, y0, y0 + D_, PLAT_Z, z1)
    top = w.pts((x0, y0, z1), (x0 + W_, y0, z1), (x0 + W_, y0 + D_, z1), (x0, y0 + D_, z1))
    out.append(f'<polygon points="{top}" fill="none" stroke="{BLUE}" stroke-width="1.4" stroke-opacity="0.7"/>')
    k = ICON / 24                                    # world units per icon unit
    m = (fmt(C30 * w.u * k), fmt(w.u / 2 * k), fmt(-C30 * w.u * k), fmt(w.u / 2 * k))
    for n, icon in enumerate(ICONS):
        tx, ty = x0 + PAD + (n % 3) * (TILE + TILE_GAP), y0 + PAD + (n // 3) * (TILE + TILE_GAP)
        out += faces(w, tx, tx + TILE, ty, ty + TILE, z1, z1 + TILE_H, HIGH if n == LIT_TILE else FACES)
        o = (TILE - ICON) / 2
        ox, oy = w.p(tx + o, ty + o, z1 + TILE_H)
        ink = '#1B2130' if n == LIT_TILE else '#F1F4F8'
        out.append(f'<g transform="matrix({m[0]} {m[1]} {m[2]} {m[3]} {fmt(ox)} {fmt(oy)})" fill="none" stroke="{ink}" '
                   f'stroke-width="1.6" vector-effect="non-scaling-stroke">{icon}</g>')
    return out, (x0, y0, W_, D_, z1)


def card(plat):
    x0, y0, W_, D_, z1 = plat
    cx, _ = w.p(PLAT_X, PLAT_Y, z1)
    # the riser leaves the slab where the centre line crosses its back edge
    bx = PLAT_X - PLAT_Y + y0                        # point on y = y0 with the same screen x as the centre
    _, by = w.p(bx, y0, z1)
    bottom = CARD['top'] + CARD['h']
    left = cx - CARD['w'] / 2
    out = [f'<polyline points="{fmt(cx)},{fmt(bottom)} {fmt(cx)},{fmt(by)}" fill="none" stroke="{BLUE}" stroke-width="1.3" '
           f'stroke-opacity="0.55" stroke-dasharray="3 5"/>',
           f'<rect x="{fmt(left)}" y="{fmt(CARD["top"])}" width="{fmt(CARD["w"])}" height="{fmt(CARD["h"])}" rx="{fmt(CARD["rx"])}" '
           f'fill="#212D40" stroke="{BLUE}" stroke-width="1.3" stroke-opacity="0.6"/>',
           f'<text x="{fmt(left + 12.6)}" y="{fmt(CARD["top"] + 17.5)}" font-size="10" font-weight="600" letter-spacing="0.12em" fill="#A9B4C3">CLOUD WORKSPACE</text>']
    for n, row in enumerate(CARD_ROWS):
        y = CARD['top'] + 37 + n * 19.6
        out.append(f'<g><circle cx="{fmt(left + 16.5)}" cy="{fmt(y)}" r="3.6" fill="#6FD3A0"/><text x="{fmt(left + 24.5)}" y="{fmt(y + 5.1)}" '
                   f'font-size="14" font-weight="600" letter-spacing="0.06em" fill="#F1F4F8">{row}</text></g>')
    return out


def build():
    m = mask()
    body = [floor_grid(w, (0, 0), DISC_R, m, phase=(0, 0.5)) + disc_arcs(w, DISC_R, mask=unary_union(LABEL_GAPS))]
    body += server() + laptop() + faces(w, *PHONE) + sync()
    plat_body, plat = slab()
    body += plat_body + card(plat)
    for dot, elbow, tx, anchor, title, sub in LABELS:
        body += label(w.p(*wall_centre(ANCHORS[dot])), elbow, tx, title, sub, colour=BLUE, anchor=anchor)
    return doc(TITLE, body, translate=(312.8, 310.6))


if __name__ == '__main__':
    write(sys.argv[1], build())
