"""Draws voip.svg (Services: VoIP and Teams Phone) and its compact phone cut from a world-space description.
Edit the numbers below and run again; don't hand-edit the SVGs.
usage: python tools/gen_voip.py site/assets/img/voip.svg       (also writes voip-compact.svg)
World: 1 unit = 23px. x runs right-down, y left-down, z up. Desk's back-left corner is the origin.
Everything sits on the isoprops grid (x, y in 0.25s, z in 0.125s). Flat details (the Teams call, the phone's
incoming call) are drawn in 2D on their face and mapped onto it with an SVG matrix.
"""
import sys
from shapely.geometry import box as box_shape
from shapely.ops import unary_union
from iso import W
from isoprops import chair, monitor, desk_phone, phone_face, screen_glass, on_side, rect
from isogen import FACES, HIGH, ORANGE, BLUE, faces, label, doc, write, silhouette, floor_grid, disc_arcs

w = W(0, 0, 23)
TX, TY = 266.0, 226.0                 # the drawing's group translate (page coordinates)
GREEN, RED = '#6FD3A0', '#F47E6A'     # tokens --c-ok, and the red the window dots use
SCREEN_BG, TILE, LINE = '#1A2333', '#26324A', '#D9E4F0'

DESK = (0, 7, 0, 3.5, 0, 2.625)       # x0 x1 y0 y1 z0 z1
TOP = DESK[5]
MON_PARTS, SCREEN = monitor(4.0, 0.75, TOP, '+y')         # shared monitor: screen face at y = 0.75, x 2..6
MONITOR = dict(MON_PARTS)['panel']
KEYBOARD = (2.5, 5.5, 1.5, 2.25, TOP, TOP + 0.125)
MOUSE = (5.75, 6.0, 1.5, 2.0, TOP, TOP + 0.125)
PHONE_PARTS, PHONE_TOP = desk_phone(6.25, 2.75, TOP, '+y')  # VoIP desk phone, front right, facing the chair
CHAIR_PARTS = chair(4.0, 5.5, '-y')

HEADSET = [  # headset hanging on a stand at the desk's back-left corner, back to front: base, back cup, pole, front cup
    ('stand base', (0.25, 1.0, 0.5, 1.25, TOP, TOP + 0.125), FACES),
    ('back cup', (0.25, 1.0, 0.25, 0.5, TOP + 1.0, TOP + 1.625), HIGH),
    ('stand pole', (0.5, 0.75, 0.75, 1.0, TOP + 0.125, TOP + 1.875), FACES),
    ('front cup', (0.25, 1.0, 1.25, 1.5, TOP + 1.0, TOP + 1.625), HIGH),
]
BAND_X = 0.625                        # the headband arcs over the pole in the plane x = BAND_X, cup to cup

MOBILE = (8.75, 9.0, -0.25, 1.25, 3.5, 6.25)   # smartphone floating at the right, screen on its x1 face

# Teams call on the monitor: local units, u across from the screen's left edge, v down from its top
CALL_BAR = 0.36                       # title bar height
TILES = dict(top=0.5, margin=0.2, gap=0.12, rows=2, cols=2, height=1.32)   # 2 x 2 video tiles
SPEAKER = 1                           # tile with the orange "speaking" ring
AVATARS = [BLUE, ORANGE, GREEN, '#9CCBF0']
CONTROLS_V = 2.0                      # call controls pill, v of its top

DISC = (4.5, 2.0, 7.5)                # floor disc centre x, y and radius; grid on whole units

# labels: dot in world, elbow and text in the group's screen coordinates; tw/sw are measured text widths
LABELS = [
    dict(dot=(0.625, 1.5, TOP + 1.3125), elbow=(-62.0, -104.0), x=-89.0, title='HEADSETS', sub='clear calls all day',
         tw=70, sw=92, colour=ORANGE, anchor='end'),
    dict(dot=(9.0, 0.5, 5.5), elbow=(194.0, -78.0), x=221.0, title='TEAMS PHONE', sub='calls from any device',
         tw=93, sw=108, colour=BLUE, anchor='start'),
    dict(dot=(6.25, 2.625, TOP + 0.25), elbow=(118.0, 108.0), x=145.0, title='DESK PHONES', sub='plug in and dial',
         tw=95, sw=82, colour=ORANGE, anchor='start'),
]
# compact phone cut: same scene framed closer, two labels at 1.65x (HEADSETS is left to the picture: three don't fit
# at phone size). TEAMS PHONE points at the call on the monitor here. Crop in page coordinates, exactly 4:3.
COMPACT = dict(crop=(121, 71, 427, 320.25), scale=1.65, labels=[
    dict(dot=(3.0, 0.75, 5.0), elbow=(50.0, -135.4), x=20.0, title='TEAMS PHONE', sub='calls from any device',
         tw=93, sw=108, colour=BLUE, anchor='end'),
    dict(dot=(6.0, 2.75, TOP + 0.25), elbow=(95.0, 110.6), x=120.0, title='DESK PHONES', sub='plug in and dial',
         tw=95, sw=82, colour=ORANGE, anchor='start'),
])
TITLE = 'VoIP desk: a Teams call on screen, a desk phone, a headset and a smartphone taking a call'


def objects():
    return ([DESK] + [b for _n, b, _c in HEADSET] + [b for _n, b in MON_PARTS + PHONE_PARTS + CHAIR_PARTS]
            + [KEYBOARD, MOUSE, MOBILE])


def text_gaps(L, k):
    """Floor lines stop around a label's text (title, wrapped subline) and its level tail."""
    ex, ey = L['elbow']; x = L['x']; ty = ey + 4.5 * k; sy = ty + 15 * k
    lines = L['sub'].count('\n') + 1
    t0, t1 = (x - L['tw'] * k - 5, x + 5) if L['anchor'] == 'end' else (x - 5, x + L['tw'] * k + 5)
    s0, s1 = (x - L['sw'] * k - 5, x + 5) if L['anchor'] == 'end' else (x - 5, x + L['sw'] * k + 5)
    return [box_shape(min(t0, ex - 4), ty - 15 * k, max(t1, ex + 4), ty + 3),
            box_shape(s0, sy - 12 * k, s1, sy + (lines - 1) * 13 * k + 5)]


def hidden(compact=False):
    labels, k = (COMPACT['labels'], COMPACT['scale']) if compact else (LABELS, 1.0)
    return unary_union([silhouette(w, *b) for b in objects()] + [g for L in labels for g in text_gaps(L, k)])


def teams_call():
    """A Teams-style call: title bar, 2 x 2 video tiles with avatars (one speaking), and the controls pill."""
    sw = SCREEN[2]
    out = [rect(0, 0, sw, CALL_BAR, TILE, 0.08)]
    out += [f'<circle cx="{0.2 + k * 0.17:.3g}" cy="{CALL_BAR / 2:.3g}" r="0.055" fill="{c}"/>' for k, c in enumerate((RED, ORANGE, GREEN))]
    out.append(rect(sw / 2 - 0.55, CALL_BAR / 2 - 0.045, 1.1, 0.09, LINE, 0.045, ' fill-opacity="0.3"'))
    t = TILES
    tw = (sw - 2 * t['margin'] - (t['cols'] - 1) * t['gap']) / t['cols']
    th = (t['height'] - (t['rows'] - 1) * t['gap']) / t['rows']
    for r in range(t['rows']):
        for c in range(t['cols']):
            n = r * t['cols'] + c
            u, v = t['margin'] + c * (tw + t['gap']), t['top'] + r * (th + t['gap'])
            ring = f' stroke="{ORANGE}" stroke-width="1.5" vector-effect="non-scaling-stroke"' if n == SPEAKER else ''
            out.append(rect(u, v, tw, th, TILE, 0.06, ring))
            cx, cy = u + tw / 2, v + th / 2
            out.append(f'<circle cx="{cx:.4g}" cy="{cy - 0.06:.4g}" r="0.13" fill="{AVATARS[n]}"/>')
            out.append(f'<path d="M{cx - 0.24:.4g},{v + th:.4g} a0.24,0.17 0 0 1 0.48,0 z" fill="{AVATARS[n]}" fill-opacity="0.75"/>')
    pw, ph = 1.3, 0.3
    pu = sw / 2 - pw / 2
    out.append(rect(pu, CONTROLS_V, pw, ph, TILE, ph / 2))
    for k, col in enumerate((LINE, LINE, RED)):
        op = '' if col == RED else ' fill-opacity="0.55"'
        out.append(f'<circle cx="{pu + 0.3 + k * 0.35:.4g}" cy="{CONTROLS_V + ph / 2:.4g}" r="0.09" fill="{col}"{op}/>')
    return screen_glass(w, SCREEN, ''.join(out))


def incoming_call():
    """Smartphone screen on the x1 face: caller avatar, name lines, decline and answer buttons."""
    x0, x1, y0, y1, z0, z1 = MOBILE
    i = 0.125
    sw, sh = (y1 - y0) - 2 * i, (z1 - z0) - 2 * i
    out = [rect(0, 0, sw, sh, SCREEN_BG, 0.1, f' stroke="{BLUE}" stroke-opacity="0.35" stroke-width="1" vector-effect="non-scaling-stroke"'),
           f'<circle cx="{sw / 2:.4g}" cy="0.75" r="0.3" fill="{BLUE}"/>',
           rect(sw / 2 - 0.45, 1.25, 0.9, 0.12, LINE, 0.06, ' fill-opacity="0.75"'),
           rect(sw / 2 - 0.3, 1.5, 0.6, 0.09, LINE, 0.045, ' fill-opacity="0.35"'),
           f'<circle cx="{sw / 2 - 0.35:.4g}" cy="{sh - 0.45:.4g}" r="0.18" fill="{RED}"/>',
           f'<circle cx="{sw / 2 + 0.35:.4g}" cy="{sh - 0.45:.4g}" r="0.18" fill="{GREEN}"/>']
    return f'<g transform="{on_side(w, x1, y1 - i, z1 - i)}">' + ''.join(out) + '</g>'


def headband():
    """Curved band from the back cup over the pole to the front cup, drawn flat in the plane x = BAND_X."""
    top = TOP + 2.0                   # local frame: u = 1.5 - y (rightwards on screen), v = top - z
    u_front, u_back = 1.5 - 1.375, 1.5 - 0.375
    v_cup = top - (TOP + 1.625)
    d = f'M{u_front:.4g},{v_cup:.4g} C{u_front:.4g},-0.05 {u_back:.4g},-0.05 {u_back:.4g},{v_cup:.4g}'
    return (f'<g transform="{on_side(w, BAND_X, 1.5, top)}" fill="none" stroke-linecap="round">'
            f'<path d="{d}" stroke="{FACES[0]}" stroke-width="6" vector-effect="non-scaling-stroke"/>'
            f'<path d="{d}" stroke="#D9E4F0" stroke-opacity="0.3" stroke-width="1" vector-effect="non-scaling-stroke"/></g>')


def build(compact=False):
    mask = hidden(compact)
    body = [floor_grid(w, DISC[:2], DISC[2], mask) + disc_arcs(w, DISC[2], *DISC[:2], mask=mask)]
    body += faces(w, *DESK)
    for n, b, cols in HEADSET:
        if n == 'front cup': body.append(headband())       # between the cups, so the front cup covers its end
        body += faces(w, *b, cols=cols)
    for _n, b in MON_PARTS: body += faces(w, *b)
    body.append(teams_call())
    body += faces(w, *KEYBOARD) + faces(w, *MOUSE)
    for _n, b in PHONE_PARTS: body += faces(w, *b)
    body.append(phone_face(w, PHONE_TOP))
    for _n, b in CHAIR_PARTS: body += faces(w, *b)
    body += faces(w, *MOBILE) + [incoming_call()]
    labels, k = (COMPACT['labels'], COMPACT['scale']) if compact else (LABELS, 1.0)
    for L in labels:
        body += label(w.p(*L['dot']), L['elbow'], L['x'], L['title'], L['sub'], colour=L['colour'], anchor=L['anchor'], scale=k)
    return doc(TITLE, body, translate=(TX, TY), crop=COMPACT['crop'] if compact else None)


if __name__ == '__main__':
    write(sys.argv[1], build())
    write(sys.argv[1].replace('.svg', '-compact.svg'), build(compact=True))     # phone cut, served by <picture> on small screens
