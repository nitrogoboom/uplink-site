"""Draws cloud.svg (Services, Work) from a world-space description.
Edit the numbers below and run again; don't hand-edit the SVG.
usage: python tools/gen_cloud.py public/assets/img/cloud.svg
World: 1 unit = 16.31px (one floor-grid square). Origin = floor-disc centre. x runs right-down, y left-down, z up.
Everything sits on the isoprops grid (x, y in 0.25s, z in 0.125s). Flat details (server bays, screens, keys)
are drawn in 2D on their face and mapped onto it, so they sit exactly in the iso plane.
"""
import sys
from shapely.geometry import LineString, Polygon, box as box_shape
from shapely.ops import unary_union
from iso import W, C30, fmt
from isogen import FACES, HIGH, ORANGE, BLUE, faces, label, doc, write, silhouette, floor_grid, disc_arcs, badge, key_group
from isoprops import on_front, on_top, rect, screen_glass, app_window
import palette as pal

w = W(21.2, 36.7, 16.31)              # inside the group's translate(312.8,310.6)
GREEN, LINE = pal.GREEN, pal.EDGE

DISC_R = 9.085                        # floor disc; grid lines on whole x and half y

# the three devices spread across the disc (server back left, laptop front centre, phone right); each sync line
# rises straight up the screen into the slab
SERVER = (-4.5, -2.0, 0.5, 3.0, 0, 5.0)         # x0 x1 y0 y1 z0 z1: old tower server
BAYS = 4                                         # drive bays on its front (y1) face; the rest is a vented panel
LAPTOP = (-0.75, 2.75, 0.5, 2.75, 0, 0.25)       # laptop base
LID = (-0.75, 2.75, 0.25, 0.5, 0.125, 2.625)     # lid stands upright behind the base, screen on its front (y1) face
DOCK = (3.25, 4.75, -0.75, 0.25, 0, 0.25)        # phone stand
PHONE = (3.375, 4.625, -0.5, -0.25, 0.25, 3.0)   # phone upright in it, screen on its front (y1) face: a call

PLAT_X, PLAT_Y, PLAT_Z = 0.25, -0.25, 10         # cloud slab: centre and underside
TILE, TILE_GAP, PAD = 2.0, 0.5, 0.5              # 3 x 2 app tiles on the slab
SLAB_H, TILE_H = 0.5, 0.25
ICON = 1.5                            # icon size on a tile (24-unit icon grid)
LIT_TILE = 0                          # highlighted tile (mail)
ARROW = (5, 9, 3)                     # sync arrowheads: half-width, length, gap below the slab (px)

CARD = dict(w=202.9, h=70.8, top=-286.6, rx=9.8)   # screen space, centred over the slab
CARD_ROWS = ['MICROSOFT 365', 'GOOGLE WORKSPACE']
CARD_KEY = 'Microsoft 365 or Google Workspace'   # the card's line in the page key (phones)

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

LABELS = [  # dot (world), elbow (screen), text x, anchor, title, subline
    ((-3.25, 3.0, 2.5), (-96.6, 8.4), -123.6, 'end', 'OLD SERVER', 'migrated, then retired'),       # middle of the server's front
    ((4.625, -0.375, 1.625), (130.0, 86.0), 157.0, 'start', 'ANY DEVICE', 'same files everywhere'),   # the phone's right edge
]
LABEL_GAPS = [box_shape(-1e4, -5.1, -118.6, 35.9), box_shape(152.0, 72.5, 1e4, 113.5)]   # floor clears round the text
TAIL_PAD = 5                          # and round each leader's level tail
# compact phone cut (isogen.doc crop): framed close on the devices and slab, both labels at 1.81x with wrapped
# sublines; OLD SERVER moves into the empty space above-left of the server. The card is left out: at a readable
# size it would swamp the frame, and the slab of app tiles says "cloud workspace" on its own.
# Crop is in page coordinates (keep it 4:3); elbow and text are in group coordinates (page minus translate).
# tw/sw: unscaled title/subline widths (px) for the floor gaps.
COMPACT = dict(crop=(42, 46, 564, 423), scale=1.81, labels=[
    dict(dot=(-3.25, 3.0, 4.25), elbow=(-68.8, -110.6), x=-117.7, anchor='end', title='OLD SERVER', sub='migrated,\nthen retired', tw=80, sw=62),
    dict(dot=(4.625, -0.375, 1.625), elbow=(97.2, 17.4), x=146.1, anchor='start', title='ANY DEVICE', sub='same files\neverywhere', tw=77, sw=55),
])


def slab_box():
    W_ = 3 * TILE + 2 * TILE_GAP + 2 * PAD
    D_ = 2 * TILE + TILE_GAP + 2 * PAD
    x0, y0 = PLAT_X - W_ / 2, PLAT_Y - D_ / 2
    return (x0, x0 + W_, y0, y0 + D_, PLAT_Z, PLAT_Z + SLAB_H)


def compact_gaps(L, k):
    """Floor lines stop around a compact label's (bigger, wrapped) text and its tail."""
    ex, ey = L['elbow']; x = L['x']; ty = ey + 4.5 * k; sy = ty + 15 * k
    lines = L['sub'].count('\n') + 1
    t0, t1 = (x - L['tw'] * k - 5, x + 5) if L['anchor'] == 'end' else (x - 5, x + L['tw'] * k + 5)
    s0, s1 = (x - L['sw'] * k - 5, x + 5) if L['anchor'] == 'end' else (x - 5, x + L['sw'] * k + 5)
    return [box_shape(min(t0, ex - 4), ty - 15 * k, max(t1, ex + 4), ty + 3),
            box_shape(s0, sy - 12 * k, s1, sy + (lines - 1) * 13 * k + 5)]


def mask(compact=False):
    if compact:
        k = COMPACT['scale']
        texts = [g for L in COMPACT['labels'] for g in compact_gaps(L, k)]
        texts += [LineString([w.p(*L['dot']), L['elbow']]).buffer(4) for L in COMPACT['labels']]   # and clear of each leader
    else:
        texts = list(LABEL_GAPS)
        for _, (ex, ey), tx, a, *_ in LABELS:
            end = tx + 7 if a == 'end' else tx - 7
            texts.append(LineString([(ex, ey), (end, ey)]).buffer(TAIL_PAD))
    solids = [silhouette(w, *b) for b in (SERVER, LAPTOP, LID, DOCK, PHONE)]
    heads = [Polygon(arrowhead(sx, tip)).buffer(6) for sx, _sy, tip in sync_paths()]    # floor lines stop around arrowheads too
    return unary_union(texts + solids + heads)


def server():
    """Tower with drive bays and a status light per bay (all dark but one: it's being retired), vents below."""
    x0, x1, _, y1, _, z1 = SERVER
    wd = x1 - x0
    out = []
    for k in range(BAYS):
        v = 0.375 + k * 0.625
        out.append(rect(0.25, v, wd - 0.5, 0.5, pal.WINDOW, 0.06, f' stroke="{pal.SKY}" stroke-opacity="0.45" stroke-width="1" vector-effect="non-scaling-stroke"'))
        out.append(rect(0.45, v + 0.2, wd - 1.3, 0.1, LINE, 0.05, ' fill-opacity="0.25"'))
        out.append(f'<circle cx="{wd - 0.55:.4g}" cy="{v + 0.25:.4g}" r="0.08" fill="{ORANGE if k == 0 else pal.DIM}"/>')
    for k in range(5):
        out.append(rect(0.25, 3.25 + k * 0.25, wd - 0.5, 0.08, pal.WINDOW, 0.04))
    return faces(w, *SERVER) + [f'<g transform="{on_front(w, x0, y1, z1)}">' + ''.join(out) + '</g>']


def laptop():
    """Base with keys and a trackpad on top; upright lid with an app on screen."""
    x0, x1, y0, y1, _, z1 = LAPTOP
    wd = x1 - x0
    keys = [rect(0.25, 0.25, wd - 0.5, 1.0, pal.APP_BAR, 0.06)]
    keys += [rect(0.35 + c * ((wd - 0.7) / 8), 0.35 + r * 0.27, (wd - 0.7) / 8 - 0.06, 0.2, LINE, 0.03, ' fill-opacity="0.18"')
             for r in range(3) for c in range(8)]
    keys.append(rect(wd / 2 - 0.55, 1.45, 1.1, 0.6, pal.APP_BAR, 0.08))
    lx0, lx1, _, ly1, lz0, lz1 = LID
    inset = 0.125
    scr = ('+y', (lx0 + inset, ly1, lz1 - inset), lx1 - lx0 - 2 * inset, lz1 - lz0 - 2 * inset - 0.125)
    out = faces(w, *LID) + [screen_glass(w, scr, app_window(scr[2], scr[3]))]     # lid first: it stands behind the base
    return out + faces(w, *LAPTOP) + [f'<g transform="{on_top(w, x0, y0, z1)}">' + ''.join(keys) + '</g>']


def phone():
    """Stand, then the phone in it showing a call: caller, name, and the green answer button."""
    out = faces(w, *DOCK) + faces(w, *PHONE)
    x0, x1, _, y1, z0, z1 = PHONE
    inset = 0.0625
    wd, ht = x1 - x0 - 2 * inset, z1 - z0 - 2 * inset
    ui = [f'<circle cx="{wd / 2:.4g}" cy="0.6" r="0.24" fill="{BLUE}" fill-opacity="0.8"/>',
          rect(wd / 2 - 0.3, 0.98, 0.6, 0.09, LINE, 0.045, ' fill-opacity="0.6"'),
          rect(wd / 2 - 0.2, 1.15, 0.4, 0.07, LINE, 0.035, ' fill-opacity="0.3"'),
          f'<circle cx="{wd * 0.3:.4g}" cy="{ht - 0.32:.4g}" r="0.13" fill="{pal.RED_DOT}"/>',
          f'<circle cx="{wd * 0.7:.4g}" cy="{ht - 0.32:.4g}" r="0.13" fill="{GREEN}"/>']
    scr = ('+y', (x0 + inset, y1, z1 - inset), wd, ht)
    out.append(screen_glass(w, scr, ''.join(ui), glow=GREEN))
    return out


def sync_paths():
    """(x, start y, tip y) on screen for each straight sync line: up from a device to just below the slab."""
    gap = ARROW[2]
    slab_sil = silhouette(w, *slab_box())
    out = []
    starts = [((SERVER[0] + SERVER[1]) / 2, (SERVER[2] + SERVER[3]) / 2, SERVER[5]),
              ((LID[0] + LID[1]) / 2, (LID[2] + LID[3]) / 2, LID[5]),
              ((PHONE[0] + PHONE[1]) / 2, (PHONE[2] + PHONE[3]) / 2, PHONE[5])]
    for p in starts:
        sx, sy = w.p(*p)
        hit = LineString([(sx, sy), (sx, sy - 1000)]).intersection(slab_sil.boundary)
        enter = max(pt.y for pt in getattr(hit, 'geoms', [hit]))      # lowest point of the slab above (screen y grows down)
        out.append((sx, sy, enter + gap))
    return out


def arrowhead(sx, tip):
    hw, ln, _ = ARROW
    return [(sx, tip), (sx - hw, tip + ln), (sx + hw, tip + ln)]


def sync():
    """Straight dashed lines up from each device into the slab, an arrowhead just below where each enters it."""
    ln = ARROW[1]
    lines, heads = [], []
    for sx, sy, tip in sync_paths():
        lines.append(f'<polyline points="{fmt(sx)},{fmt(sy)} {fmt(sx)},{fmt(tip + ln)}" fill="none" stroke="{ORANGE}" stroke-width="1.4" stroke-dasharray="5 5"/>')
        heads.append(f'<polygon class="mark" points="{" ".join(f"{fmt(x)},{fmt(y)}" for x, y in arrowhead(sx, tip))}" '
                     f'fill="{ORANGE}" stroke="{ORANGE}" stroke-width="1"/>')
    return lines + heads


def slab():
    x0, x1, y0, y1, _z0, z1 = slab_box()
    W_, D_ = x1 - x0, y1 - y0
    out = faces(w, *slab_box())
    top = w.pts((x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1))
    out.append(f'<polygon points="{top}" fill="none" stroke="{BLUE}" stroke-width="1.4" stroke-opacity="0.7"/>')
    k = ICON / 24                                    # world units per icon unit
    m = (fmt(C30 * w.u * k), fmt(w.u / 2 * k), fmt(-C30 * w.u * k), fmt(w.u / 2 * k))
    for n, icon in enumerate(ICONS):
        tx, ty = x0 + PAD + (n % 3) * (TILE + TILE_GAP), y0 + PAD + (n // 3) * (TILE + TILE_GAP)
        out += faces(w, tx, tx + TILE, ty, ty + TILE, z1, z1 + TILE_H, HIGH if n == LIT_TILE else FACES)
        o = (TILE - ICON) / 2
        ox, oy = w.p(tx + o, ty + o, z1 + TILE_H)
        ink = pal.ON_AMBER if n == LIT_TILE else pal.WHITE
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
    out = [key_group('CLOUD WORKSPACE', CARD_KEY),
           f'<polyline class="lt" points="{fmt(cx)},{fmt(bottom)} {fmt(cx)},{fmt(by)}" fill="none" stroke="{BLUE}" stroke-width="1.3" '
           f'stroke-opacity="0.55" stroke-dasharray="3 5"/>',
           f'<rect class="lt" x="{fmt(left)}" y="{fmt(CARD["top"])}" width="{fmt(CARD["w"])}" height="{fmt(CARD["h"])}" rx="{fmt(CARD["rx"])}" '
           f'fill="{pal.SOLID}" stroke="{BLUE}" stroke-width="1.3" stroke-opacity="0.6"/>',
           f'<text class="lt" x="{fmt(left + 12.6)}" y="{fmt(CARD["top"] + 17.5)}" font-size="10" font-weight="600" letter-spacing="0.12em" fill="{pal.GREY}">CLOUD WORKSPACE</text>']
    for n, row in enumerate(CARD_ROWS):
        y = CARD['top'] + 37 + n * 19.6
        out.append(f'<g class="lt"><circle cx="{fmt(left + 16.5)}" cy="{fmt(y)}" r="3.6" fill="{pal.GREEN}"/><text x="{fmt(left + 24.5)}" y="{fmt(y + 5.1)}" '
                   f'font-size="14" font-weight="600" letter-spacing="0.06em" fill="{pal.WHITE}">{row}</text></g>')
    out.append(badge(cx, by, BLUE) + '</g>')            # small: the card hides, its number sits where the riser meets the slab
    return out


def build(compact=False):
    m = mask(compact)
    disc_gaps = unary_union([g for L in COMPACT['labels'] for g in compact_gaps(L, COMPACT['scale'])] if compact else LABEL_GAPS)
    body = [floor_grid(w, (0, 0), DISC_R, m, phase=(0, 0.5)) + disc_arcs(w, DISC_R, mask=disc_gaps)]
    body += server() + laptop() + phone()
    body += sync()                                      # drawn before the slab, so each line disappears into it
    plat_body, plat = slab()
    if compact:
        body += plat_body
        for L in COMPACT['labels']:
            body += label(w.p(*L['dot']), L['elbow'], L['x'], L['title'], L['sub'], colour=BLUE, anchor=L['anchor'], scale=COMPACT['scale'])
        return doc(TITLE, body, translate=(312.8, 310.6), crop=COMPACT['crop'])
    body += plat_body + card(plat)
    for dot, elbow, tx, anchor, title, sub in LABELS:
        body += label(w.p(*dot), elbow, tx, title, sub, colour=BLUE, anchor=anchor)
    return doc(TITLE, body, translate=(312.8, 310.6))


if __name__ == '__main__':
    write(sys.argv[1], build())
    write(sys.argv[1].replace('.svg', '-compact.svg'), build(compact=True))     # phone cut, served by <picture> on small screens
