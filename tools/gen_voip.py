"""Draws voip.svg (Services: VoIP and Teams Phone) and its compact phone cut from a world-space description.
Edit the numbers below and run again; don't hand-edit the SVGs.
usage: python tools/gen_voip.py public/assets/img/voip.svg       (also writes voip-compact.svg)
World: 1 unit = 23px. x runs right-down, y left-down, z up. Desk's back-left corner is the origin.
Everything sits on the isoprops grid (x, y in 0.25s, z in 0.125s). Flat details (the Teams call, the phone
screens, the headset band and pads) are drawn in 2D on their face and mapped onto it with an SVG matrix.
"""
import sys
from shapely.ops import unary_union
from iso import W
from isoprops import chair, monitor, desk_phone, phone_face, screen_glass, on_front, on_side, rect
from isogen import ORANGE, BLUE, faces, label, doc, write, silhouette, floor_grid, disc_arcs, label_text_gaps
import palette as pal

w = W(0, 0, 23)
TX, TY = 278.0, 222.0                 # the drawing's group translate (page coordinates)
GREEN, RED, SKY_TOP = pal.GREEN, pal.RED_DOT, pal.SKY_TOP   # tokens --c-ok, the window-dot red, --iso-sky-top
SCREEN_BG, TILE, LINE = pal.SCREEN, pal.APP_BAR, pal.EDGE
DARK = (pal.APP_BAR, pal.WINDOW, pal.LEFT)                 # headset cups: left, right, top faces

DESK = (0, 8, 0, 3.5, 0, 2.625)       # x0 x1 y0 y1 z0 z1
TOP = DESK[5]
MON_PARTS, SCREEN = monitor(3.5, 0.75, TOP, '+y')         # shared monitor: screen face at y = 0.75, x 1.5..5.5
MONITOR = dict(MON_PARTS)['panel']
KEYBOARD = (2.0, 4.5, 1.5, 2.25, TOP, TOP + 0.125)
PHONE_PARTS, PHONE_TOP = desk_phone(5.75, 2.75, TOP, '+y', s=2.0, cradle=True)   # VoIP desk phone at twice the kit size, handset up on its cradle
CHAIR_PARTS = chair(3.5, 5.75, '-y')

# headset hanging on a stand at the desk's right end, past the phone and right of the monitor on screen:
# cups either side of the post, band over it, the mic boom curling right (away from the phone)
STAND_BASE = (7.0, 7.75, 0.5, 1.25, TOP, TOP + 0.125)
STAND_POST = (7.25, 7.5, 0.75, 1.0, TOP + 0.125, TOP + 2.375)
CUP_BACK = (7.0, 7.75, -0.25, 0.0, TOP + 1.0, TOP + 2.0)        # hangs past the desk's back edge
CUP_FRONT = (7.0, 7.75, 1.75, 2.0, TOP + 1.0, TOP + 2.0)        # x - y >= 5: just clear of the phone on screen
BAND_X = 7.375                        # plane of the band (the post's centre line)

# mobile standing in a dock, front-left of the desk, screen facing the chair side (+y)
DOCK = (0.25, 1.75, 2.25, 3.0, TOP, TOP + 0.25)
MOBILE = (0.5, 1.5, 2.5, 2.75, TOP + 0.25, TOP + 2.0)

# Teams call on the monitor (local units: u across from the screen's left edge, v down from its top)
CALL_BAR = 0.34
TILES = dict(top=0.5, margin=0.2, gap=0.14, rows=2, cols=2, height=1.34, radius=0.1)
SPEAKER = 1
AVATARS = [BLUE, ORANGE, GREEN, SKY_TOP]
CONTROLS = dict(v=2.0, w=1.5, h=0.32)

DISC = (4.0, 2.75, 7.0)               # floor disc centre x, y and radius; grid on whole units

# labels: dot in world, elbow and text in the group's screen coordinates; tw/sw are measured text widths
LABELS = [
    dict(dot=(1.0, 2.75, TOP + 1.5), elbow=(-78.0, -84.0), x=-105.0, title='TEAMS PHONE', sub='calls from any device',
         tw=93, sw=108, colour=BLUE, anchor='end'),
    dict(dot=(7.375, 0.0, TOP + 1.5), elbow=(170.0, -32.0), x=197.0, title='HEADSETS', sub='clear calls all day',
         tw=70, sw=92, colour=ORANGE, anchor='start'),
    dict(dot=(5.25, 3.0, TOP + 0.5), elbow=(138.0, 80.0), x=165.0, title='DESK PHONES', sub='plug in and dial',
         tw=95, sw=82, colour=ORANGE, anchor='start'),
]
# compact phone cut: the same scene framed closer, labels at 1.6x: TEAMS PHONE above, HEADSETS beside, DESK PHONES
# below, so the frame stays narrow enough for 14px+ titles at 340px. Crop in page coordinates, exactly 4:3.
COMPACT = dict(crop=(85, 53, 480, 360), scale=1.6, labels=[
    dict(dot=(1.0, 2.75, TOP + 1.5), elbow=(12.0, -157.2), x=-20.0, title='TEAMS PHONE', sub='calls from any device',
         tw=93, sw=108, colour=BLUE, anchor='end'),
    dict(dot=(7.375, 0.0, TOP + 1.5), elbow=(152.0, -40.0), x=170.0, title='HEADSETS', sub='clear calls\nall day',
         tw=70, sw=60, colour=ORANGE, anchor='start'),
    dict(dot=(5.25, 2.5, TOP + 0.5), elbow=(95.0, 132.8), x=120.0, title='DESK PHONES', sub='plug in and dial',
         tw=95, sw=82, colour=ORANGE, anchor='start'),
])
TITLE = 'VoIP desk: a Teams call on screen, a desk phone, a headset on its stand and a phone taking a call'


def objects():
    return ([DESK] + [b for _n, b in MON_PARTS] + [KEYBOARD, CUP_BACK, STAND_BASE, STAND_POST, CUP_FRONT]
            + [b for _n, b in PHONE_PARTS] + [DOCK, MOBILE] + [b for _n, b in CHAIR_PARTS])


def hidden(compact=False):
    labels, k = (COMPACT['labels'], COMPACT['scale']) if compact else (LABELS, 1.0)
    return unary_union([silhouette(w, *b) for b in objects()] + [g for L in labels for g in label_text_gaps(L, k)])


# ---- headset -----------------------------------------------------------------------------------
def cup_face(cup, pad):
    """The visible y1 face of a cup: an orange ring on the outside (front cup), the orange cushion inside (back)."""
    x0, x1, _y0, y1, z0, z1 = cup
    wd, ht = x1 - x0, z1 - z0
    if pad:
        art = rect(0.12, 0.1, wd - 0.24, ht - 0.2, ORANGE, 0.18, ' fill-opacity="0.9"')
    else:
        art = (rect(0.12, 0.1, wd - 0.24, ht - 0.2, 'none', 0.18,
                    f' stroke="{ORANGE}" stroke-width="2" vector-effect="non-scaling-stroke"')
               + rect(0.27, 0.25, wd - 0.54, ht - 0.5, pal.SCREEN, 0.1))
    return f'<g transform="{on_front(w, x0, y1, z1)}">{art}</g>'


def headband():
    """Smooth band from the back cup, over the post, to the front cup, in the plane x = BAND_X."""
    y1 = CUP_FRONT[3]
    top = TOP + 2.75                  # local frame: u = y1 - y (rightwards on screen), v = top - z
    u_front, u_back = y1 - (CUP_FRONT[2] + CUP_FRONT[3]) / 2, y1 - (CUP_BACK[2] + CUP_BACK[3]) / 2
    v_cup = top - CUP_FRONT[5]
    v_post = top - STAND_POST[5]
    d = (f'M{u_front:.4g},{v_cup:.4g} C{u_front:.4g},{v_post - 0.1:.4g} {u_front + 0.5:.4g},{v_post - 0.22:.4g} '
         f'{(u_front + u_back) / 2:.4g},{v_post - 0.22:.4g} S{u_back:.4g},{v_post - 0.1:.4g} {u_back:.4g},{v_cup:.4g}')
    return (f'<g transform="{on_side(w, BAND_X, y1, top)}" fill="none" stroke-linecap="round">'
            f'<path d="{d}" stroke="{DARK[0]}" stroke-width="6" vector-effect="non-scaling-stroke"/>'
            f'<path d="{d}" stroke="{pal.EDGE}" stroke-opacity="0.35" stroke-width="1" vector-effect="non-scaling-stroke"/></g>')


def mic_boom():
    """Boom from the front cup towards the mouth, ending in an orange mic, in the cup's outer plane."""
    x0, _x1, _y0, y1, _z0, z1 = CUP_FRONT
    d = 'M0.75,0.7 C0.95,0.78 1.05,1.0 1.2,1.1'               # off the cup's right edge, so it stays clear of the phone
    return (f'<g transform="{on_front(w, x0, y1, z1)}" fill="none" stroke-linecap="round">'
            f'<path d="{d}" stroke="{pal.CABLE}" stroke-width="3.5" vector-effect="non-scaling-stroke"/>'
            f'<circle cx="1.22" cy="1.11" r="0.13" fill="{ORANGE}"/></g>')


# ---- screens -------------------------------------------------------------------------------------
def avatar(cx, base, colour, k=1.0):
    """Head and shoulders, sitting on the line v = base."""
    return (f'<circle cx="{cx:.4g}" cy="{base - 0.33 * k:.4g}" r="{0.13 * k:.4g}" fill="{colour}"/>'
            f'<path d="M{cx - 0.25 * k:.4g},{base:.4g} a{0.25 * k:.4g},{0.17 * k:.4g} 0 0 1 {0.5 * k:.4g},0 z" fill="{colour}" fill-opacity="0.8"/>')


def teams_call():
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
            out.append(f'<svg x="{u:.4g}" y="{v:.4g}" width="{tw:.4g}" height="{th:.4g}" overflow="hidden">'
                       + rect(0, 0, tw, th, TILE, t['radius']) + avatar(tw / 2, th, AVATARS[n]) + '</svg>')
            if n == SPEAKER:
                out.append(rect(u, v, tw, th, 'none', t['radius'], f' stroke="{ORANGE}" stroke-width="1.5" vector-effect="non-scaling-stroke"'))
    cw, ch = CONTROLS['w'], CONTROLS['h']
    cu, cv = sw / 2 - cw / 2, CONTROLS['v']
    out.append(rect(cu, cv, cw, ch, TILE, ch / 2))
    mid = cv + ch / 2
    out.append(rect(cu + 0.27, mid - 0.09, 0.08, 0.15, LINE, 0.04, ' fill-opacity="0.7"'))                    # mute
    out.append(rect(cu + 0.6, mid - 0.06, 0.16, 0.12, LINE, 0.02, ' fill-opacity="0.7"'))                     # camera
    out.append(f'<path d="M{cu + 0.76:.4g},{mid:.4g} l0.08,-0.05 v0.1 z" fill="{LINE}" fill-opacity="0.7"/>')
    out.append(rect(cu + 1.0, mid - 0.07, 0.3, 0.14, RED, 0.07))                                              # end call
    return screen_glass(w, SCREEN, ''.join(out))


def incoming_call():
    """The mobile's screen (its y1 face): caller, name lines, decline and answer."""
    x0, x1, _y0, y1, z0, z1 = MOBILE
    i = 0.08
    sw, sh = (x1 - x0) - 2 * i, (z1 - z0) - 2 * i
    out = [rect(0, 0, sw, sh, SCREEN_BG, 0.1, f' stroke="{BLUE}" stroke-opacity="0.4" stroke-width="1" vector-effect="non-scaling-stroke"'),
           f'<circle cx="{sw / 2:.4g}" cy="0.48" r="0.19" fill="{BLUE}"/>',
           rect(sw / 2 - 0.26, 0.8, 0.52, 0.08, LINE, 0.04, ' fill-opacity="0.75"'),
           rect(sw / 2 - 0.17, 0.97, 0.34, 0.06, LINE, 0.03, ' fill-opacity="0.35"'),
           f'<circle cx="{sw / 2 - 0.2:.4g}" cy="{sh - 0.3:.4g}" r="0.11" fill="{RED}"/>',
           f'<circle cx="{sw / 2 + 0.2:.4g}" cy="{sh - 0.3:.4g}" r="0.11" fill="{GREEN}"/>']
    return f'<g transform="{on_front(w, x0 + i, y1, z1 - i)}">' + ''.join(out) + '</g>'


def build(compact=False):
    mask = hidden(compact)
    body = [floor_grid(w, DISC[:2], DISC[2], mask) + disc_arcs(w, DISC[2], *DISC[:2], mask=mask)]
    body += faces(w, *DESK)
    for _n, b in MON_PARTS: body += faces(w, *b)
    body.append(teams_call())
    body += faces(w, *KEYBOARD)
    for n, b in PHONE_PARTS:
        body += faces(w, *b)
        if n == 'body': body.append(phone_face(w, PHONE_TOP))      # keypad under the raised handset
    body += faces(w, *CUP_BACK, cols=DARK) + [cup_face(CUP_BACK, pad=True)]       # headset (right of the phone), back to front
    body += faces(w, *STAND_BASE) + faces(w, *STAND_POST)
    body.append(headband())
    body += faces(w, *CUP_FRONT, cols=DARK) + [cup_face(CUP_FRONT, pad=False), mic_boom()]
    body += faces(w, *DOCK) + faces(w, *MOBILE) + [incoming_call()]
    for _n, b in CHAIR_PARTS: body += faces(w, *b)
    labels, k = (COMPACT['labels'], COMPACT['scale']) if compact else (LABELS, 1.0)
    for L in labels:
        body += label(w.p(*L['dot']), L['elbow'], L['x'], L['title'], L['sub'], colour=L['colour'], anchor=L['anchor'], scale=k)
    return doc(TITLE, body, translate=(TX, TY), crop=COMPACT['crop'] if compact else None)


if __name__ == '__main__':
    write(sys.argv[1], build())
    write(sys.argv[1].replace('.svg', '-compact.svg'), build(compact=True))     # phone cut, served by <picture> on small screens
