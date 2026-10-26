"""Draws helpdesk.svg (Services, Work) from a world-space description.
Edit the numbers below and run again; don't hand-edit the SVG.
usage: python tools/gen_helpdesk.py site/assets/img/helpdesk.svg
World: 1 unit = 23px. x runs right-down, y left-down, z up. Desk's back-left corner is the origin.
Flat details (the chat window, the ticket cards' contents) are drawn in 2D on their face and mapped onto it
with an SVG matrix, so they sit exactly in the iso plane.
"""
import sys
from shapely.geometry import box as box_shape
from shapely.ops import unary_union
from iso import W
from isoprops import chair, monitor, desk_phone, phone_face, screen_glass, on_top, rect
from isogen import ORANGE, BLUE, INK, faces, label, doc, write, silhouette, floor_grid, disc_arcs

w = W(0, 0, 23)                       # inside the group's translate(265.7,200.9)
GREEN = '#6FD3A0'                     # tokens --c-ok

DESK = (0, 8, 0, 3.5, 0, 2.625)       # x0 x1 y0 y1 z0 z1 (everything on the isoprops grid: x, y in 0.25s, z in 0.125s)
TOP = DESK[5]
MON_PARTS, SCREEN = monitor(4, 0.75, TOP, '+y')           # shared monitor on a stand (isoprops): screen face at y = 0.75
MONITOR = dict(MON_PARTS)['panel']
PHONE_PARTS, PHONE_TOP = desk_phone(6.75, 1.0, TOP, '+y')   # VoIP desk phone, facing the chair
KEYBOARD = (2.5, 5.5, 1.5, 2.5, TOP, TOP + 0.125)
MOUSE = (6.0, 6.5, 1.75, 2.5, TOP, TOP + 0.125)
CHAIR_PARTS = chair(4, 5.5, '-y')                         # shared office chair, facing the desk
BACK = dict(CHAIR_PARTS)['back']

# chat window on the screen: local units, u across from the screen's left edge, v down from its top
CHAT = [  # (kind, u, v, width, height): header bar, then messages top to bottom
    ('bar', 0, 0, None, 0.36),
    ('in', 0.22, 0.6, 1.9, 0.46),
    ('out', 1.38, 1.22, 1.9, 0.46),
    ('typing', 0.22, 1.84, 0.95, 0.42),
]
SCREEN_BG, BUBBLE_IN, LINE = '#1A2333', '#3A4A63', '#D9E4F0'

TICKET = (3.75, 2.5, 0.25)            # width (x), depth (y), thickness
TICKETS = [  # (x0, y0, z0, status colour, status): top to bottom
    (9.5, -2.25, 7.75, BLUE, 'open'),
    (9.25, -2.0, 5.0, ORANGE, 'in progress'),
    (9.0, -1.75, 2.5, GREEN, 'resolved'),
]
SHADOW = (0.4, 0.35, 5)               # soft floor shadow under the bottom ticket: opacity, inset (units), blur (px)

DISC = (5.5, 1.5, 7.65)               # floor disc centre x, y and radius; grid on whole units

# labels: dot in world, elbow and text in screen; title/sub widths are measured text widths (for the floor gap)
LABELS = [
    dict(dot=(3.1, MONITOR[3], MONITOR[5] - 0.16 - 1.05), elbow=(43.7, -124.0), x=16.7, title='LIVE CHAT', sub='phone, email, chat', tw=70, sw=95, colour=ORANGE),
    dict(dot=(4.0, BACK[3], 2.6), elbow=(-82.8, 127.9), x=-109.8, title='REAL PERSON', sub='local help desk', tw=96, sw=79, colour=BLUE),
    dict(dot=(TICKETS[2][0] + TICKET[0] - 0.55, TICKETS[2][1] + TICKET[1] / 2, TICKETS[2][2] + TICKET[2]), elbow=(250.9, 145.1), x=223.9, title='TICKETS', sub='open, in progress, resolved', tw=61.3, sw=141.7, colour=ORANGE),
]
TITLE = 'Help desk workstation: a chat on screen and support tickets moving from open to resolved'


def ticket_boxes():
    tw, td, th = TICKET
    return [(x0, x0 + tw, y0, y0 + td, z0, z0 + th) for x0, y0, z0, _c, _s in TICKETS]


def objects():
    return [DESK] + [b for _n, b in MON_PARTS + PHONE_PARTS + CHAIR_PARTS] + [KEYBOARD, MOUSE] + ticket_boxes()


def label_gaps(L):
    """Floor lines stop around each label's title, subline and level tail (end-anchored text)."""
    ex, ey = L['elbow']; x = L['x']; ty, sy = ey + 4.5, ey + 19.5
    return [box_shape(x - L['tw'] - 5, ty - 18, ex + 4, ty - 1), box_shape(x - L['sw'] - 5, sy - 16, x + 5, sy + 8)]


def hidden():
    """Floor lines skip everything drawn over them: objects and labels."""
    return unary_union([silhouette(w, *b) for b in objects()] + [g for L in LABELS for g in label_gaps(L)])


def chat_window():
    sw = SCREEN[2]
    out = []
    for kind, u, v, wd, ht in CHAT:
        if kind == 'bar':
            out.append(rect(0, 0, sw, ht, '#26324A', 0.08))
            out += [f'<circle cx="{0.2 + k * 0.17:g}" cy="{ht / 2:g}" r="0.055" fill="{c}"/>' for k, c in enumerate(('#F47E6A', ORANGE, GREEN))]
            out.append(rect(sw / 2 - 0.55, ht / 2 - 0.045, 1.1, 0.09, LINE, 0.045, ' fill-opacity="0.3"'))
        elif kind == 'in':
            out.append(rect(u, v, wd, ht, BUBBLE_IN, 0.16))
            out += [rect(u + 0.18, v + 0.13, wd - 0.55, 0.07, LINE, 0.035, ' fill-opacity="0.55"'),
                    rect(u + 0.18, v + 0.27, wd - 0.95, 0.07, LINE, 0.035, ' fill-opacity="0.35"')]
        elif kind == 'out':
            out.append(rect(u, v, wd, ht, ORANGE, 0.16))
            out += [rect(u + 0.18, v + 0.13, wd - 0.45, 0.07, INK, 0.035, ' fill-opacity="0.55"'),
                    rect(u + 0.18, v + 0.27, wd - 1.0, 0.07, INK, 0.035, ' fill-opacity="0.4"')]
        else:                          # someone typing
            out.append(rect(u, v, wd, ht, BUBBLE_IN, 0.16))
            out += [f'<circle cx="{u + 0.28 + k * 0.2:g}" cy="{v + ht / 2:g}" r="0.06" fill="{LINE}" fill-opacity="{0.8 - k * 0.2:g}"/>' for k in range(3)]
    return screen_glass(w, SCREEN, ''.join(out))


def ticket_card(b, colour, status):
    """Status strip, title and two text lines, and a status pill (a tick when resolved) on a ticket's top face."""
    x0, x1, y0, y1, _z0, z1 = b
    cw, cd = x1 - x0, y1 - y0
    out = [rect(0, 0, 0.26, cd, colour, 0.06),
           rect(0.55, 0.42, 2.0, 0.2, LINE, 0.1, ' fill-opacity="0.6"'),
           rect(0.55, 0.9, 2.6, 0.14, LINE, 0.07, ' fill-opacity="0.28"'),
           rect(0.55, 1.22, 1.8, 0.14, LINE, 0.07, ' fill-opacity="0.28"')]
    px, py, pw, ph = cw - 1.35, cd - 0.68, 1.0, 0.38
    if status == 'resolved':
        out.append(rect(px, py, pw, ph, colour, 0.19))
        out.append(f'<polyline points="{px + 0.3:g},{py + 0.2:g} {px + 0.45:g},{py + 0.3:g} {px + 0.72:g},{py + 0.1:g}" fill="none" stroke="{INK}" '
                   f'stroke-width="2" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/>')
    else:
        out.append(rect(px, py, pw, ph, colour, 0.19, ' fill-opacity="0.22"'))
        out.append(rect(px + 0.18, py + ph / 2 - 0.05, pw - 0.36, 0.1, colour, 0.05))
    return f'<g transform="{on_top(w, x0, y0, z1)}">' + ''.join(out) + '</g>'


def ticket_shadow():
    """Soft footprint of the bottom card on the floor, so the stack reads as hovering."""
    op, inset, blur = SHADOW
    x0, x1, y0, y1, _z0, _z1 = ticket_boxes()[-1]
    x0, x1, y0, y1 = x0 + inset, x1 - inset, y0 + inset, y1 - inset
    return (f'<filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="{blur}"/></filter>'
            f'<polygon class="shadow" points="{w.pts((x0, y0, 0), (x1, y0, 0), (x1, y1, 0), (x0, y1, 0))}" fill="#0B1019" fill-opacity="{op}" filter="url(#soft)"/>')


def build():
    mask = hidden()
    body = [floor_grid(w, DISC[:2], DISC[2], mask) + disc_arcs(w, DISC[2], *DISC[:2], mask=mask)]
    body.append(ticket_shadow())
    body += faces(w, *DESK)
    for _n, b in MON_PARTS: body += faces(w, *b)
    body.append(chat_window())
    for _n, b in PHONE_PARTS: body += faces(w, *b)
    body.append(phone_face(w, PHONE_TOP))
    body += faces(w, *KEYBOARD) + faces(w, *MOUSE)
    for _n, b in CHAIR_PARTS: body += faces(w, *b)
    for b, (*_, colour, status) in zip(ticket_boxes(), TICKETS):
        body += faces(w, *b) + [ticket_card(b, colour, status)]
    for L in LABELS:
        body += label(w.p(*L['dot']), L['elbow'], L['x'], L['title'], L['sub'], colour=L['colour'], anchor='end')
    return doc(TITLE, body, translate=(265.7, 200.9))


if __name__ == '__main__':
    write(sys.argv[1], build())
