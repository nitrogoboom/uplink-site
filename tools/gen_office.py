"""Draws the office floor plan from one world-space description, in three versions that share every shape:
  site/assets/img/office.svg        static, loaded with <img> on the Work page (carries its Barlow letters)
  site/assets/img/office-build.svg  animated reference copy of the hero (not linked; carries its Barlow letters)
  site/index.html                   the hero: the <svg class="ob"> block only, spliced in place (page fonts apply)
usage: python tools/gen_office.py site
Edit the numbers below and run again; don't hand-edit any of the three.
World: 1 unit = 28.127px, W(616.4, 240.2). Floor x 0..22, y 0..15; x runs right-down, y left-down, z up.
Chairs, monitors and desk phones are the shared kit (isoprops) at PROP_S; furniture sits on that kit's grid scaled
to this drawing (x, y in 0.125s, z in 0.0625s) so parts meet exactly or stay a clear pixel apart.
The hero's animation (classes, --d delays, data-tile) and its 3D cloud are kept as the page's JS and CSS expect:
  tools/office_parts/build.css, hero.css   the animation CSS inside the two animated versions
  tools/office_parts/hero_cloud.svg        hero only: sync lines, 3D cloud and its label (hand-drawn, fixed screen points)
"""
import math, pathlib, sys
from shapely.ops import unary_union
from iso import W, fmt
from isogen import silhouette, clip_out, seg_path, badge, key_group, key_css, number_badges
from isoprops import chair, monitor, desk_phone, phone_face, screen_glass, rect
from svgfont import font_style

w = W(616.4, 240.2, 28.127)
PARTS = pathlib.Path(__file__).parent / 'office_parts'

# ---- the room ---------------------------------------------------------------
FLOOR = (22, 15)                       # floor size; grid every 1 unit
SLAB = 0.45                            # floor thickness
WALL_T, WALL_H = 0.25, 4.5             # back wall (y 0..0.25, full width) and left wall (x 0..0.25, from the back wall's face)
WIN = (1, 2.5, 3.25, 1.5, 3.75)        # windows: first edge, width, pitch, sill, head (mullion in the middle)
BACK_WINDOWS, LEFT_WINDOWS = 5, 3
TV = (11.75, 13.75, 1.5, 3.0)          # Teams room screen on the left wall: y0, y1, z0, z1
ZONE = [(0.25, 10.5), (6, 10.5), (6, 15)]   # dashed outline round the Teams room
CABINET = (0.25, 1.25, 1.0, 3.5, 0, 1.375)   # filing cabinet against the left wall, under its first window
DRAWERS = 3                                  # drawer lines on its front face

# ---- furniture --------------------------------------------------------------
PROP_S = 0.5                           # shared kit scale: a chair back tops out at desk height + 0.4
DESK = (2.5, 1.25, 1.25)               # w, d, h; desks sit at these corners (in draw order, with their drop-in delay)
DESKS = {(6, 5.5): 1000, (9, 5.5): 1150, (6, 9): 850, (12, 5.5): 1300, (9, 9): 925,
         (15, 5.5): 1375, (12, 9): 1075, (15, 9): 1225}
MON = (1.25, 0.375, 2.0, 1.25)         # monitor: centre x and screen face y (from the desk corner), kit width and height
KEYBOARD = (0.75, 1.75, 0.625, 0.875, 0.0625)   # x0 x1 y0 y1 (from the desk corner), thickness
PHONE = (2.125, 0.5)                   # VoIP desk phone centre (from the desk corner), back right of the desk
CHAIR_AT = (1.25, 1.75)                # chair centre (from the desk corner): in front of the desk, facing it
TABLE = (1.375, 4.875, 12.0, 13.5, 1.25)   # Teams room table, centred in its zone
TABLE_CHAIRS = [(2.25, 11.5, '+y'), (4.0, 11.5, '+y'), (2.25, 14.0, '-y'), (4.0, 14.0, '-y')]   # centre x, y, facing the table

# ---- server room --------------------------------------------------------------
GLASS = (17, 4.5, 4)                   # partition: along x = 17 from the back wall to y = 4.5, then along y = 4.5 to the right edge; height
RACKS = [(18.5, 2300), (20.1, 2400)]   # x0 and LED pattern id; racks are 1.1 x 1.3 x 3.6 at y 1..2.3
RACK = (1.1, 1.0, 2.3, 3.6)            # w, y0, y1, h
RACK_SLOTS = 10                        # vent lines between slots; one LED per slot
VENT = (0.1, 1.0)                      # vent line runs from x0 + 0.1 to x0 + 1.0
LED_X = 0.875
LEDS = {18.5: 'GWWGWWGWWG', 20.1: 'WWGWWGWWGW'}   # bottom to top: G green, W white
LED_ANIM = {18.5: {0: (2800, 0), 2: (3840, -1060), 4: (3580, -2120), 6: (3320, -3180), 8: (3060, -1180)},
            20.1: {1: (3320, -1440), 3: (3060, -2500), 5: (2800, -760), 7: (3840, -780), 9: (3580, -2100)}}

# ---- Wi-Fi --------------------------------------------------------------------
CABLE_Z = 4.3125                       # cable trays run just under the ceiling (a height that clears every window and chair edge on screen)
APS = [(11.75, 8.25), (19.5, 12.75), (3.125, 12.75)]   # access point centres (desk block, front right, Teams room); 0.625 square, hung from the ceiling
AP = (0.625, 0.125, 4.5)               # size, thickness, bottom z
RINGS = [(3.25, 0.36), (2.25, 0.58), (1.25, 0.8)]   # Wi-Fi halo radius and opacity, at the AP's bottom
RING_D = [[2420, 2490, 2560], [2360, 2430, 2500], [2300, 2370, 2440]]   # drop-in delay per ring size, per AP
RING_PULSE = [[-1800, -1300, -800], [-2100, -1600, -1100], [-2400, -1900, -1400]]

# ---- cloud tray ---------------------------------------------------------------
TRAY_Z = 10                            # tray floats above rack 1; the uplink runs straight up to it
TRAY_T, TILE_T, TILE, TILE_GAP, TRAY_M = 0.4, 0.2, 1.7, 0.35, 0.4
ICON = 1.25                            # icon size on a tile (24-unit icon grid)
TILES = ['mail', 'files', 'meet', 'chat', 'cal', 'secure']   # 3 x 2, back row first; mail is lit
ICONS = {
    'mail': '<rect x="3" y="5" width="18" height="14" rx="2.5" vector-effect="non-scaling-stroke"/><path d="M4 7l8 6 8-6" vector-effect="non-scaling-stroke"/>',
    'files': '<path d="M6 3h8l4 4v14H6z" vector-effect="non-scaling-stroke"/><path d="M14 3v4h4M9 13h6M9 17h4" vector-effect="non-scaling-stroke"/>',
    'meet': '<rect x="3" y="7" width="12" height="10" rx="2" vector-effect="non-scaling-stroke"/><path d="M15 11l6-3v8l-6-3z" vector-effect="non-scaling-stroke"/>',
    'chat': '<path d="M4 5h16v11H10l-6 4z" vector-effect="non-scaling-stroke"/><path d="M8 10h8" vector-effect="non-scaling-stroke"/>',
    'cal': '<rect x="3" y="5" width="18" height="16" rx="2.5" vector-effect="non-scaling-stroke"/><path d="M3 10h18M8 3v4M16 3v4" vector-effect="non-scaling-stroke"/>',
    'secure': '<path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z" vector-effect="non-scaling-stroke"/><path d="M9 12l2 2 4-4" vector-effect="non-scaling-stroke"/>',
}
CARD_LINK = (851.6, 86.4, 878.0)       # office/build: dashed line from the card (start, bend x) to the tray's top-left corner

# ---- labels (annotation: fixed screen elbow and text, dot on the object) -------
LABELS = [  # dot (world), elbow (screen), colour, title, subline, delay[, side: text 'left' (default) or 'right' of the elbow]
    ((18.95, 2.3, 0.54), (944.0, 712.0), '#F4A340', 'FIREWALL RACK', 'core switch + backups', 2800, 'right'),   # outside the room's front edge
    ((APS[2][0], APS[2][1], 4.625), (361.1, 208.7), '#F4A340', 'WI-FI ACCESS POINT', 'Wi-Fi 6E, no dead spots', 2880),
    ((13.25, 9.25, 1.25), (634.1, 695.7), '#7DB9E8', 'WORKSTATIONS', 'managed + patched', 2960),
    ((WALL_T, (TV[0] + TV[1]) / 2, (TV[2] + TV[3]) / 2), (290.0, 523.7), '#7DB9E8', 'TEAMS ROOM', 'one-touch meeting join', 3040),
]
BADGE = dict(r=30, size=42)            # numbered dot for small screens; see isogen.badge
KEY_WIDTH = 425                        # below this rendered width the 24px titles fall under 8.5px (isogen.KEY_PX): numbers instead
TAIL = 40                              # level tail, px; text starts 12px past it

FACES = ('#313F54', '#283447', '#405169')
HIGH = ('#E2953F', '#C98030', '#F7B868')
EDGE = 'stroke="#D9E4F0" stroke-width="1" stroke-opacity="0.3"'
HIGH_EDGE = 'stroke="#FFE6C4" stroke-width="1" stroke-opacity="0.55"'
TRAY_FACES = ('#2C3A4F', '#243043', '#3A4A61')
TRAY_EDGE = 'stroke="#7DB9E8" stroke-width="1.4" stroke-opacity="0.75"'
FONT = "Barlow, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
ROUND = 'stroke-linecap="round" stroke-linejoin="round"'
TITLES = {'office': 'Isometric office floor plan with desks, server racks, Wi-Fi and a cloud workspace hub for Microsoft 365 and Google Workspace',
          'build': 'Animated isometric office floor plan assembling itself: desks, server racks, Wi-Fi and a cloud workspace hub for Microsoft 365 and Google Workspace'}
TITLES['hero'] = TITLES['build']


# ---- small builders -------------------------------------------------------------
def poly(pts, attrs, cls=''):
    c = f'class="{cls}" ' if cls else ''
    return f'<polygon {c}points="{w.pts(*pts)}" {attrs} stroke-linejoin="round"/>'


def line(pts, attrs, pre=''):
    return f'<polyline {pre}points="{w.pts(*pts)}" fill="none" {attrs}/>'


BOXES = []                             # every box drawn, in order (rules_office.py reads it for painter.py)


def box(b, cols=FACES, edge=EDGE, classes=('', '', '')):
    BOXES.append(b)
    x0, x1, y0, y1, z0, z1 = b
    return [f'<polygon {f"class={chr(34)}{c}{chr(34)} " if c else ""}points="{pts}" fill="{col}" {edge} stroke-linejoin="round"/>'
            for pts, col, c in zip(w.box(x0, x1, y0, y1, z0, z1), cols, classes)]


def wall_x(x, y0, y1, z0, z1):        # rectangle on the plane x = const, back to front
    return [(x, y0, z0), (x, y1, z0), (x, y1, z1), (x, y0, z1)]


def wall_y(y, x0, x1, z0, z1):        # rectangle on the plane y = const
    return [(x0, y, z0), (x1, y, z0), (x1, y, z1), (x0, y, z1)]


def ellipse(r, x, y, z, attrs):
    rx, ry = r * w.u * math.sqrt(1.5), r * w.u / math.sqrt(2)
    cx, cy = w.p(x, y, z)
    return f'<ellipse cx="{fmt(cx)}" cy="{fmt(cy)}" rx="{fmt(rx)}" ry="{fmt(ry)}" fill="none" {attrs}/>'


# ---- the parts, each returns its shapes ---------------------------------------
def desk_box(cx, cy):
    return (cx, cx + DESK[0], cy, cy + DESK[1], 0, DESK[2])


def desk_parts(cx, cy):
    """(monitor parts, screen, phone parts, phone top, keyboard box, chair parts) for the desk at corner (cx, cy)."""
    top = DESK[2]
    mon, scr = monitor(cx + MON[0], cy + MON[1], top, '+y', s=PROP_S, width=MON[2], height=MON[3])
    ph, ph_top = desk_phone(cx + PHONE[0], cy + PHONE[1], top, '+y', s=PROP_S)
    kx0, kx1, ky0, ky1, kh = KEYBOARD
    kb = (cx + kx0, cx + kx1, cy + ky0, cy + ky1, top, top + kh)
    ch = chair(cx + CHAIR_AT[0], cy + CHAIR_AT[1], '-y', s=PROP_S)
    return mon, scr, ph, ph_top, kb, ch


def screen_ui(scr, accent='#7DB9E8'):
    """A small app on a desk monitor: a lit header bar and two text lines, sized to the glass."""
    _f, _xyz, wd, ht = scr
    return (rect(0.06, 0.06, wd - 0.12, ht * 0.2, accent, 0.03, ' fill-opacity="0.55"')
            + rect(0.06, ht * 0.42, wd * 0.62, ht * 0.11, '#D9E4F0', 0.03, ' fill-opacity="0.35"')
            + rect(0.06, ht * 0.64, wd * 0.42, ht * 0.11, '#D9E4F0', 0.03, ' fill-opacity="0.25"'))


def solids():
    """Everything that stands on the floor (for cutting hidden floor lines in the static version)."""
    out = [(0, FLOOR[0], 0, WALL_T, 0, WALL_H), (0, WALL_T, WALL_T, FLOOR[1], 0, WALL_H), CABINET]
    for (cx, cy) in DESKS:
        mon, _scr, ph, _pt, kb, ch = desk_parts(cx, cy)
        out += [desk_box(cx, cy), kb] + [b for _n, b in mon + ph + ch]
    x0, x1, y0, y1, h = TABLE
    out.append((x0, x1, y0, y1, 0, h))
    for x, y, f in TABLE_CHAIRS:
        out += [b for _n, b in chair(x, y, f, s=PROP_S)]
    out += [(x, x + RACK[0], RACK[1], RACK[2], 0, RACK[3]) for x, _ in RACKS]
    s, t, z = AP
    out += [(x - s / 2, x + s / 2, y - s / 2, y + s / 2, z, z + t) for x, y in APS]   # hung high, but they hide the floor behind them
    return out


def floor(v):
    X, Y = FLOOR
    out = box((0, X, 0, Y, -SLAB, 0), ('#313F54', '#283447', '#1E2938'))
    segs = [(w.p(k, 0), w.p(k, Y)) for k in range(X + 1)] + [(w.p(0, k), w.p(X, k)) for k in range(Y + 1)]
    if v == 'office':   # static: floor lines stop where something stands on them (animated versions keep them: things drop in)
        mask = unary_union([silhouette(w, *b) for b in solids()])
        segs = [s for p, q in segs for s in clip_out(p, q, mask)]
    out.append(seg_path(segs, f'fill="none" stroke="#2C3849" stroke-width="0.8" stroke-opacity="0.55" {ROUND}'))
    out.append(line(ZONE, f'stroke="#7DB9E8" stroke-width="1" stroke-opacity="0.4" {ROUND} stroke-dasharray="6 4"'))
    return out


def windows(n, plane):
    first, width, pitch, sill, head = WIN
    out, mullions = [], []
    for i in range(n):
        a = first + i * pitch
        out.append(poly(plane(a, a + width, sill, head), 'fill="#1E2938" fill-opacity="0.55" stroke="#7DB9E8" stroke-width="0.9" stroke-opacity="0.5"'))
        m = plane(a + width / 2, a + width / 2, sill, head)
        mullions.append(line([m[0], m[3]], f'stroke="#7DB9E8" stroke-width="0.7" stroke-opacity="0.4" {ROUND}'))
    return out + mullions


def back_wall():
    return box((0, FLOOR[0], 0, WALL_T, 0, WALL_H)) + windows(BACK_WINDOWS, lambda a, b, z0, z1: wall_y(WALL_T, a, b, z0, z1))


def left_wall():
    out = box((0, WALL_T, WALL_T, FLOOR[1], 0, WALL_H)) + windows(LEFT_WINDOWS, lambda a, b, z0, z1: wall_x(WALL_T, a, b, z0, z1))
    y0, y1, z0, z1 = TV
    return out + [poly(wall_x(WALL_T, y0, y1, z0, z1), 'fill="#F4A340" fill-opacity="0.14" stroke="#F4A340" stroke-width="1.4" stroke-opacity="0.95"')]


def desk(cx, cy):
    mon, scr, ph, ph_top, kb, ch = desk_parts(cx, cy)
    out = box(desk_box(cx, cy))
    for _n, b in mon:
        out += box(b)
    out.append(screen_glass(w, scr, screen_ui(scr)))
    for _n, b in ph:
        out += box(b)
    out.append(phone_face(w, ph_top))
    out += box(kb)
    for _n, b in ch:
        out += box(b)
    return out


def meeting():
    x0, x1, y0, y1, h = TABLE
    out = []
    for x, y, f in TABLE_CHAIRS[:2]:          # far side first, then the table, then the near side
        for _n, b in chair(x, y, f, s=PROP_S):
            out += box(b)
    out += box((x0, x1, y0, y1, 0, h))
    for x, y, f in TABLE_CHAIRS[2:]:
        for _n, b in chair(x, y, f, s=PROP_S):
            out += box(b)
    return out


def cabinet():
    """Filing cabinet with drawer lines on its front (x1) face."""
    x0, x1, y0, y1, z0, z1 = CABINET
    out = box(CABINET)
    step = (z1 - z0) / DRAWERS
    for k in range(1, DRAWERS):
        out.append(line([(x1, y1 - 0.25, z0 + k * step), (x1, y0 + 0.25, z0 + k * step)], f'stroke="#D9E4F0" stroke-width="0.8" stroke-opacity="0.35" {ROUND}'))
    for k in range(DRAWERS):
        out.append(line([(x1, (y0 + y1) / 2 + 0.25, z0 + (k + 0.55) * step), (x1, (y0 + y1) / 2 - 0.25, z0 + (k + 0.55) * step)],
                        f'stroke="#D9E4F0" stroke-width="1.2" stroke-opacity="0.5" {ROUND}'))
    return out


def glass_back():
    x, y, h = GLASS
    return [poly(wall_x(x, WALL_T, y, 0, h), 'fill="#7DB9E8" fill-opacity="0.09" stroke="#7DB9E8" stroke-width="1" stroke-opacity="0.5"')]


def glass_front():
    x, y, h = GLASS
    return [poly(wall_y(y, x, FLOOR[0], 0, h), 'fill="#7DB9E8" fill-opacity="0.09" stroke="#7DB9E8" stroke-width="1" stroke-opacity="0.5"'),
            line([(x, y, 0), (x, y, h)], f'stroke="#7DB9E8" stroke-width="1.6" stroke-opacity="0.7" {ROUND}')]


def rack(x0, v):
    rw, y0, y1, h = RACK
    slot = h / RACK_SLOTS
    out = box((x0, x0 + rw, y0, y1, 0, h), HIGH, HIGH_EDGE)
    for k in range(1, RACK_SLOTS):             # vents between slots, bottom up
        z = k * slot
        out.append(line([(x0 + VENT[0], y1, z), (x0 + VENT[1], y1, z)], f'stroke="#8A561C" stroke-width="0.9" stroke-opacity="0.45" {ROUND}'))
    for k, c in enumerate(LEDS[x0]):
        X, Y = w.p(x0 + LED_X, y1, slot * (k + 0.5))
        anim = LED_ANIM[x0].get(k)
        pre = f'class="ob-led" style="animation-duration:{anim[0]}ms;animation-delay:{anim[1]}ms" ' if anim and v != 'office' else ''
        out.append(f'<circle {pre}cx="{fmt(X)}" cy="{fmt(Y)}" r="1.8" fill="{"#6FD3A0" if c == "G" else "#FFF3DF"}"/>')
    return out


def rack_top(i=0):
    x0 = RACKS[i][0]
    return (x0 + RACK[0] / 2, (RACK[1] + RACK[2]) / 2, RACK[3])


def cable_pair(pts, v, base_style='', flow_style='', join=True):
    j = ' stroke-linejoin="round"' if join else ''
    base = f'stroke="#F4A340" stroke-width="1.4" stroke-opacity="0.5" stroke-linecap="round"{j}'
    flow = f'stroke="#F4A340" stroke-width="2" stroke-opacity="0.95" stroke-linecap="round"{j}'
    if v == 'office':
        return [line(pts, base), line(pts, flow + ' stroke-dasharray="2 7"')]
    bs = f'style="{base_style}" ' if base_style else ''
    fs = f'style="{flow_style}" ' if flow_style else ''
    return [line(pts, base, f'class="ob-cable" {bs}pathLength="100" '), line(pts, flow, f'class="ob-flow" {fs}')]


def cable(ap, v):
    x, y, z = rack_top()
    ax, ay = ap
    return cable_pair([(x, y, z), (x, y, CABLE_Z), (ax, y, CABLE_Z), (ax, ay, CABLE_Z), (ax, ay, AP[2])], v)   # last bit up into the AP


def ring(ap, r, op):
    return [ellipse(r, *ap, AP[2], f'stroke="#F4A340" stroke-width="1.1" stroke-opacity="{op}"')]


def access_point(ap):
    s, t, z = AP
    x, y = ap
    return box((x - s / 2, x + s / 2, y - s / 2, y + s / 2, z, z + t), HIGH, HIGH_EDGE)


def uplink(v):
    x, y, z = rack_top()
    return cable_pair([(x, y, z), (x, y, TRAY_Z)], v, 'animation-duration:350ms',
                      'animation-delay:calc(var(--d,0ms) + 380ms),0s;animation-direction:normal,reverse', join=False)


def tray_box():
    x, y, _ = rack_top()
    tw = 3 * TILE + 2 * TILE_GAP + 2 * TRAY_M
    td = 2 * TILE + TILE_GAP + 2 * TRAY_M
    return (x - tw / 2, x + tw / 2, y - td / 2, y + td / 2, TRAY_Z, TRAY_Z + TRAY_T)


def tile(i, v):
    tx0, _, ty0, _, _, tz1 = tray_box()
    col, row = i % 3, i // 3
    x0, y0 = tx0 + TRAY_M + col * (TILE + TILE_GAP), ty0 + TRAY_M + row * (TILE + TILE_GAP)
    lit = TILES[i] == 'mail'
    out = box((x0, x0 + TILE, y0, y0 + TILE, tz1, tz1 + TILE_T), HIGH if lit else FACES, HIGH_EDGE if lit else EDGE,
              ('f-l', 'f-r', 'f-t') if v == 'hero' else ('', '', ''))
    m = (TILE - ICON) / 2
    ox, oy = w.p(x0 + m, y0 + m, tz1 + TILE_T)
    s = ICON / 24
    a, b = math.cos(math.radians(30)) * w.u * s, w.u / 2 * s
    cls = 'class="f-ic" ' if v == 'hero' else ''
    out.append(f'<g {cls}transform="matrix({a:.4f} {b:.4f} {-a:.4f} {b:.4f} {fmt(ox)} {fmt(oy)})" fill="none" stroke="{"#1B2130" if lit else "#F1F4F8"}" '
               f'stroke-width="2.0" {ROUND} vector-effect="non-scaling-stroke">{ICONS[TILES[i]]}</g>')
    return out


def card(v):
    sx, sy, bx = CARD_LINK
    x0, _, _, y1, _, z1 = tray_box()
    ex, ey = w.p(x0, y1, z1)
    rows = [('MICROSOFT 365', 87.8, 96.4), ('GOOGLE WORKSPACE', 121.4, 130.0)]
    out = [key_group('CLOUD WORKSPACE', 'Microsoft 365 or Google Workspace'),
           f'<polyline class="lt" points="{fmt(sx)},{fmt(sy)} {fmt(bx)},{fmt(sy)} {fmt(ex)},{fmt(ey)}" fill="none" stroke="#7DB9E8" stroke-width="1.6" stroke-opacity="0.55" stroke-dasharray="3 5" {ROUND}/>',
           '<rect class="lt" x="503.9" y="26.8" width="347.8" height="119.2" rx="16.8" fill="#212D40" stroke="#7DB9E8" stroke-width="1.6" stroke-opacity="0.6"/>',
           f'<text class="lt" x="525.5" y="54.8" font-family="{FONT}" font-size="16" font-weight="600" letter-spacing="0.12em" fill="#A9B4C3">CLOUD WORKSPACE</text>']
    for i, (name, cy, ty) in enumerate(rows):
        g = f'<g class="lt ob-swap ob-swap-{i}">' if v != 'office' else '<g class="lt">'
        out.append(f'{g}<circle cx="532.2" cy="{cy}" r="6.2" fill="#6FD3A0"/><text x="545.9" y="{ty}" font-family="{FONT}" font-size="24" '
                   f'font-weight="600" letter-spacing="0.06em" fill="#F1F4F8">{name}</text></g>')
    out.append(badge(ex, ey, '#7DB9E8', **BADGE) + '</g>')   # small screens: the card hides, its number sits on the tray corner
    return out


def label(dot, elbow, colour, title, sub, side='left'):
    dx, dy = w.p(*dot)
    ex, ey = elbow
    sign, anchor = (-1, 'end') if side == 'left' else (1, 'start')
    tx = ex + sign * TAIL
    return [f'<polyline class="lt" points="{fmt(dx)},{fmt(dy)} {fmt(ex)},{fmt(ey)} {fmt(tx)},{fmt(ey)}" fill="none" stroke="{colour}" stroke-width="1.8" stroke-opacity="0.6" stroke-linejoin="round"/>',
            f'<circle class="lt" cx="{fmt(dx)}" cy="{fmt(dy)}" r="6" fill="{colour}" stroke="#151E2C" stroke-width="3"/>',
            f'<text class="lt" x="{fmt(tx + sign * 12)}" y="{fmt(ey + 8)}" font-family="{FONT}" font-size="24" font-weight="600" letter-spacing="0.06em" fill="{colour}" text-anchor="{anchor}">{title}</text>',
            f'<text class="lt" x="{fmt(tx + sign * 12)}" y="{fmt(ey + 36)}" font-family="{FONT}" font-size="19" font-weight="400" letter-spacing="0" fill="#A9B4C3" text-anchor="{anchor}">{sub}</text>',
            badge(dx, dy, colour, **BADGE)]


# ---- assembly -------------------------------------------------------------------
def groups(v):
    """(wrapper attrs for the animated versions, shapes) in draw order, back to front."""
    G = [('class="ob-i ob-fade" style="--d:0ms"', floor(v)),
         ('class="ob-i ob-grow" style="--d:300ms;animation-duration:480ms"', back_wall()),
         ('class="ob-i ob-grow" style="--d:420ms;animation-duration:480ms"', left_wall()),
         ('class="ob-i" style="--d:775ms"', cabinet())]
    desks = list(DESKS.items())
    order = [desks[0], 'meeting', desks[1], desks[2], desks[3], desks[4], 'glass', 'rack0', desks[5], desks[6], 'rack1', 'front', desks[7]]
    for item in order:
        if item == 'meeting': G.append(('class="ob-i" style="--d:700ms"', meeting()))
        elif item == 'glass': G.append(('class="ob-i ob-fade" style="--d:1700ms;animation-duration:450ms"', glass_back()))
        elif item == 'front': G.append(('class="ob-i ob-fade" style="--d:1700ms;animation-duration:450ms"', glass_front()))
        elif item in ('rack0', 'rack1'):
            i = int(item[-1])
            G.append((f'class="ob-i ob-grow" style="--d:{1500 + 80 * i}ms;animation-duration:520ms"', rack(RACKS[i][0], v)))
        else:
            (cx, cy), d = item
            G.append((f'class="ob-i" style="--d:{d}ms"', desk(cx, cy)))
    for i, ap in enumerate(APS):
        G.append((f'class="ob-i ob-n" style="--d:{1900 + 80 * i}ms"', cable(ap, v)))
    for k, (r, op) in enumerate(RINGS):
        for i, ap in enumerate(APS):
            G.append(((f'class="ob-i ob-ring" style="--d:{RING_D[k][i]}ms"', f'class="ob-pulse" style="animation-delay:{RING_PULSE[k][i]}ms"'), ring(ap, r, op)))
    for i, ap in enumerate(APS):
        G.append((f'class="ob-i" style="--d:{2250 + 70 * i}ms"', access_point(ap)))
    G.append(('class="ob-i ob-n" style="--d:2450ms"', uplink(v)))
    G.append(('class="ob-i" style="--d:2500ms"', box(tray_box(), TRAY_FACES, TRAY_EDGE)))
    for i, name in enumerate(TILES):
        attrs = f'class="ob-i ob-tile" data-tile="{name}" style="--d:{2620 + 70 * i}ms"' if v == 'hero' else f'class="ob-i" style="--d:{2620 + 70 * i}ms"'
        G.append((attrs, tile(i, v)))
    if v == 'hero':
        G.append((None, [(PARTS / 'hero_cloud.svg').read_text(encoding='utf-8').rstrip('\n')]))
    else:
        G.append(('class="ob-i ob-lab" style="--d:3020ms"', card(v)))
    for dot, elbow, colour, title, sub, d, *side in LABELS:
        G.append((f'class="ob-i ob-lab co lbl" data-t="{title}" data-s="{sub}" style="--d:{d}ms"', label(dot, elbow, colour, title, sub, *side)))
    return G


def render(v):
    BOXES.clear()
    out = []
    for attrs, shapes in groups(v):
        if attrs is None:                       # hero cloud: already wrapped
            out += shapes; continue
        if v == 'office':
            open_, close = (('<g class="co lbl"' + attrs.split('lbl"')[1].split(' style=')[0] + '>') if 'lbl"' in attrs else '<g>'), '</g>'
        elif isinstance(attrs, tuple):
            open_, close = f'<g {attrs[0]}>\n<g {attrs[1]}>', '</g>\n</g>'
        else:
            open_, close = f'<g {attrs}>', '</g>'
        out += [open_, *shapes, close]
    body = number_badges('\n'.join(out))
    title = TITLES[v]
    if v == 'office':
        head = f'<svg xmlns="http://www.w3.org/2000/svg" id="plain" viewBox="0 0 1200 800" width="1200" height="800" role="img" aria-label="{title}">'
        style = font_style(body) + '\n' + key_css(KEY_WIDTH)
    elif v == 'build':
        head = f'<svg xmlns="http://www.w3.org/2000/svg" id="plain" class="ob" viewBox="0 0 1200 800" width="1200" height="800" role="img" aria-label="{title}">'
        style = font_style(body) + '\n' + key_css(KEY_WIDTH) + '\n<style>' + (PARTS / 'build.css').read_text(encoding='utf-8').rstrip('\n') + '</style>'
    else:
        head = f'<svg xmlns="http://www.w3.org/2000/svg" class="ob" viewBox="0 -130 1200 930" width="1200" height="930" role="img" aria-label="{title}">'
        style = '<style>' + (PARTS / 'hero.css').read_text(encoding='utf-8').rstrip('\n') + '</style>'
        # hidden like its two paths: the link is off (data-link="none"), so it was showing parked at -99,-99 on wide screens
        body += '\n<circle class="ob-link-end" r="6.5" fill="#1B2130" stroke="#F4A340" stroke-width="3" cx="-99" cy="-99" style="display:none"/>'
    return '\n'.join([head, f'<title>{title}</title>', style, body, '</svg>'])


def splice_hero(index_path, svg):
    """Replace only the <svg class="ob"> block in index.html; read fresh, write at once."""
    text = index_path.read_text(encoding='utf-8')
    start = text.index('<svg xmlns="http://www.w3.org/2000/svg" class="ob"')
    end = text.index('</svg>', start) + len('</svg>')
    index_path.write_text(text[:start] + svg + text[end:], encoding='utf-8', newline='')


if __name__ == '__main__':
    site = pathlib.Path(sys.argv[1])
    for v, name in (('office', 'office.svg'), ('build', 'office-build.svg')):
        (site / 'assets/img' / name).write_text(render(v) + '\n', encoding='utf-8', newline='\n')
    splice_hero(site / 'index.html', render('hero'))
