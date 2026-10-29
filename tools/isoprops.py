"""Shared kit for the drawings: office chair, monitor on a stand, desk phone (VoIP), and the helpers that put
flat details (screens, keypads, card contents) exactly on an iso face.

Every prop is built in its own local frame, centred on (0, 0) on the floor or desk top, then turned to face
one of '+x', '-x', '+y', '-y' and moved into place. It comes back as (name, box) pairs already in back-to-front
order for that facing, ready for isogen.faces() and isogen.silhouette(). Sizes are in help-desk units
(1 unit = 23px); pass s to scale for a drawing at another scale (s = 23 / that drawing's u * how big you want it).

The viewer looks at the +x and +y faces, so a part with larger x + y is nearer.

Grid rule: every prop's corners sit on x, y = multiples of 0.25 and z = multiples of 0.125 (place them on the
same grid). On screen that puts any two corners either exactly together or at least about 2.9px apart at
23px a unit, so parts can't nearly-touch (check.py stays clean) however a prop is turned or placed.
"""
from iso import C30
import palette as pal


def num(v):
    """Matrix numbers need more than iso.fmt's 0.1 (a drawing at u = 1 has C30 = 0.866)."""
    return f'{v:.5g}'


# ---- flat details on a face ---------------------------------------------------------------
def on_front(w, x, y, z):
    """SVG matrix: local 2D (u right, v down, world units) onto the plane y = const, origin (x, y, z) = top-left."""
    X, Y = w.p(x, y, z)
    return f'matrix({num(C30 * w.u)} {num(w.u / 2)} 0 {num(w.u)} {num(X)} {num(Y)})'


def on_side(w, x, y, z):
    """SVG matrix: local 2D (u right, v down) onto the plane x = const. Right on screen is -y, so the
    origin (x, y, z) is the face's top-left: its largest y."""
    X, Y = w.p(x, y, z)
    return f'matrix({num(C30 * w.u)} {num(-w.u / 2)} 0 {num(w.u)} {num(X)} {num(Y)})'


def on_top(w, x, y, z):
    """SVG matrix: local 2D (u along +x, v along +y) onto the plane z = const, origin (x, y, z)."""
    X, Y = w.p(x, y, z)
    return f'matrix({num(C30 * w.u)} {num(w.u / 2)} {num(-C30 * w.u)} {num(w.u / 2)} {num(X)} {num(Y)})'


def rect(u, v, wd, ht, fill, r=0, extra=''):
    return f'<rect x="{u:.4g}" y="{v:.4g}" width="{wd:.4g}" height="{ht:.4g}" rx="{r:.4g}" fill="{fill}"{extra}/>'


# ---- placing a prop -----------------------------------------------------------------------
TURN = {  # local (x, y) -> world offset; every prop is drawn facing '-y' in its local frame
    '-y': lambda x, y: (x, y),
    '+y': lambda x, y: (-x, -y),
    '-x': lambda x, y: (y, x),
    '+x': lambda x, y: (-y, -x),
}


def place(parts, ox, oy, oz, facing, s):
    out = []
    for name, (x0, x1, y0, y1, z0, z1) in parts:
        ax, ay = TURN[facing](x0 * s, y0 * s)
        bx, by = TURN[facing](x1 * s, y1 * s)
        out.append((name, (ox + min(ax, bx), ox + max(ax, bx), oy + min(ay, by), oy + max(ay, by), oz + z0 * s, oz + z1 * s)))
    return out


def back_to_front(parts):
    """Painter order for props whose parts stack and touch: lower parts first, then nearer (larger x + y)."""
    return sorted(parts, key=lambda p: (p[1][0] + p[1][2] + p[1][1] + p[1][3], p[1][4]))


# ---- office chair --------------------------------------------------------------------------
CHAIR = [  # local, facing -y (the sitter looks towards -y; the back is on the +y side)
    ('base', (-0.75, 0.75, -0.75, 0.75, 0, 0.25)),
    ('post', (-0.25, 0.25, -0.25, 0.25, 0.25, 1.125)),
    ('seat', (-1.0, 1.0, -0.75, 0.75, 1.125, 1.5)),
    ('back post', (-0.25, 0.25, 0.75, 1.0, 1.5, 1.875)),    # short support, so the seat shows under and beside the back
    ('back', (-0.75, 0.75, 0.75, 1.0, 1.875, 3.375)),
]


def chair(x, y, facing='-y', s=1.0, z=0):
    """Office chair centred on (x, y): base, post, seat, back. Facing is where the sitter looks."""
    parts = place(CHAIR, x, y, z, facing, s)
    order = ['base', 'post', 'seat', 'back post', 'back'] if facing in ('-y', '-x') else ['base', 'post', 'back post', 'back', 'seat']
    d = dict(parts)
    return [(n, d[n]) for n in order]


# ---- monitor on a stand ------------------------------------------------------------------------
def monitor(x, y, top, facing='+y', s=1.0, width=4.0, height=2.625):
    """Monitor centred on x (or y) with its screen face at y (or x), standing on a desk whose top is z = top.
    Facing '+y' puts the screen on the panel's y1 face, '+x' on its x1 face (the faces the viewer sees).
    Returns (parts back to front, screen) where screen = (transform, width, height) for drawing on the glass."""
    hw = width / 2
    local = [  # local facing -y: the screen is on the -y side at y = 0
        ('foot', (-1.0, 1.0, -0.25, 0.5, 0, 0.125)),
        ('neck', (-0.25, 0.25, 0.25, 0.5, 0.125, 0.5)),       # behind the panel, up to its underside
        ('panel', (-hw, hw, 0, 0.25, 0.5, 0.5 + height)),
    ]
    turn = {'+y': '+y', '+x': '+x'}[facing]
    parts = dict(place(local, x, y, top, turn, s))
    order = [(n, parts[n]) for n in ('neck', 'panel')]
    order.insert(0, ('foot', parts['foot']))
    # the foot sticks out in front of the panel; drawn first it sits under it, which is right from this view
    x0, x1, y0, y1, z0, z1 = parts['panel']
    inset = 0.16 * s
    if facing == '+y':
        screen = (None, x0 + inset, y1, z1 - inset)
    else:
        screen = (None, x1, y1 - inset, z1 - inset)
    return order, (facing, screen[1:], (x1 - x0 if facing == '+y' else y1 - y0) - 2 * inset, (z1 - z0) - 2 * inset)


def screen_transform(w, screen):
    facing, (x, y, z), _wd, _ht = screen
    return on_front(w, x, y, z) if facing == '+y' else on_side(w, x, y, z)


def screen_glass(w, screen, content='', glow=pal.SKY):
    """Dark glass with a faint edge, plus whatever content (local units) the drawing puts on it."""
    _f, _xyz, wd, ht = screen
    return (f'<g transform="{screen_transform(w, screen)}">'
            + rect(0, 0, wd, ht, pal.SCREEN, 0.08 * min(wd, ht) / 2.4, f' stroke="{glow}" stroke-opacity="0.35" stroke-width="1" vector-effect="non-scaling-stroke"')
            + content + '</g>')


def app_window(wd, ht, accent=pal.AMBER, line=pal.EDGE):
    """A plain app window for screens that don't need their own story: title bar, a highlight, three lines."""
    bar = min(0.36, ht * 0.15)
    out = [rect(0, 0, wd, bar, pal.APP_BAR, 0.06)]
    out += [f'<circle cx="{0.2 + k * 0.17:.3g}" cy="{bar / 2:.3g}" r="0.055" fill="{c}"/>' for k, c in enumerate((pal.RED_DOT, accent, pal.GREEN))]
    out.append(rect(0.22, bar + 0.25, wd * 0.45, 0.16, accent, 0.08, ' fill-opacity="0.85"'))
    for k, f in enumerate((0.8, 0.65, 0.5)):
        out.append(rect(0.22, bar + 0.6 + k * 0.32, wd * f - 0.44, 0.1, line, 0.05, ' fill-opacity="0.3"'))
    return ''.join(out)


# ---- desk phone (VoIP) ------------------------------------------------------------------------
PHONE = [  # local, facing -y: body, handset resting flush on its left; screen and keypad are drawn on the body's top
    ('body', (-0.5, 0.5, -0.25, 0.5, 0, 0.25)),
    ('handset', (-0.5, -0.25, -0.25, 0.5, 0.25, 0.375)),
]
CRADLE = [  # cradle=True: two hooks on the body's left strip, the handset lying across them with a gap below
    ('hook back', (-0.5, -0.25, 0.25, 0.5, 0.25, 0.5)),
    ('hook front', (-0.5, -0.25, -0.25, 0.0, 0.25, 0.5)),
    ('handset', (-0.5, -0.25, -0.25, 0.5, 0.5, 0.625)),
]


def desk_phone(x, y, top, facing='-y', s=1.0, cradle=False):
    """VoIP desk phone centred on (x, y) on a desk at z = top. Returns (parts back to front, top_face) where
    top_face = (x0, y0, z, width_x, depth_y) of the body's top for phone_face().
    cradle=True raises the handset on two hooks (for a drawing where the phone shows big)."""
    if cradle:
        parts = dict(place(PHONE[:1] + CRADLE, x, y, top, facing, s))
        hooks = back_to_front([(n, parts[n]) for n in ('hook back', 'hook front')])
        order = [('body', parts['body'])] + hooks + [('handset', parts['handset'])]
    else:
        parts = dict(place(PHONE, x, y, top, facing, s))
        order = [('body', parts['body']), ('handset', parts['handset'])]
    bx0, bx1, by0, by1, _bz0, bz1 = parts['body']
    return order, (bx0, by0, bz1, bx1 - bx0, by1 - by0, facing, s)


def phone_face(w, top_face, glow=pal.SKY, key=pal.EDGE):
    """Little lit screen and a 3 x 3 keypad on the phone's top, clear of the handset."""
    x0, y0, z, wx, dy, facing, s = top_face
    # lay out in the phone's own frame (u across its width, v front to back) then map with on_top
    if facing in ('-y', '+y'):
        u_len, v_len = wx, dy
    else:
        u_len, v_len = dy, wx
    out = [rect(0.36 * s, 0.08 * s, 0.54 * s, 0.2 * s, glow, 0.03 * s, ' fill-opacity="0.85"')]
    for r in range(3):
        for c in range(3):
            out.append(f'<circle cx="{(0.47 + c * 0.16) * s:.4g}" cy="{(0.4 + r * 0.11) * s:.4g}" r="{0.032 * s:.3g}" fill="{key}" fill-opacity="0.5"/>')
    content = ''.join(out)
    # the frame's u runs along x for +-y facings, along y otherwise; mirror for the + facings so the handset side matches
    if facing == '-y':
        tf = on_top(w, x0, y0, z)
    elif facing == '+y':
        tf = on_top(w, x0, y0, z) + f' translate({u_len:.4g} {v_len:.4g}) scale(-1 -1)'
    elif facing == '-x':
        tf = on_top(w, x0, y0, z) + ' matrix(0 1 1 0 0 0)'
    else:
        tf = on_top(w, x0, y0, z) + f' matrix(0 1 1 0 0 0) translate({u_len:.4g} {v_len:.4g}) scale(-1 -1)'
    return f'<g transform="{tf}">{content}</g>'


# ---- tree ---------------------------------------------------------------------------------------
TREES = {  # local, centred on (0, 0): trunk, then a crown that is narrow at the bottom and top and notched at the corners
    'big': [('trunk', (-0.25, 0.25, -0.25, 0.25, 0, 0.75)),
            ('crown base', (-0.5, 0.5, -0.5, 0.5, 0.75, 1.0)),
            ('crown -x', (-1.0, -0.75, -0.5, 0.5, 1.125, 2.0)),
            ('crown -y', (-0.5, 0.5, -1.0, -0.75, 1.125, 2.0)),
            ('crown', (-0.75, 0.75, -0.75, 0.75, 1.0, 2.375)),
            ('crown +x', (0.75, 1.0, -0.5, 0.5, 1.125, 2.0)),
            ('crown +y', (-0.5, 0.5, 0.75, 1.0, 1.125, 2.0)),
            ('crown top', (-0.5, 0.5, -0.5, 0.5, 2.375, 2.75))],
    'small': [('trunk', (-0.25, 0.25, -0.25, 0.25, 0, 0.625)),
              ('crown base', (-0.25, 0.25, -0.25, 0.25, 0.625, 0.75)),
              ('crown -x', (-0.75, -0.5, -0.25, 0.25, 0.875, 1.5)),
              ('crown -y', (-0.25, 0.25, -0.75, -0.5, 0.875, 1.5)),
              ('crown', (-0.5, 0.5, -0.5, 0.5, 0.75, 1.75)),
              ('crown +x', (0.5, 0.75, -0.25, 0.25, 0.875, 1.5)),
              ('crown +y', (-0.25, 0.25, 0.5, 0.75, 0.875, 1.5)),
              ('crown top', (-0.25, 0.25, -0.25, 0.25, 1.75, 2.0))],
}


def tree(x, y, kind='big', z=0):
    """Tree centred on (x, y): a trunk under a rounded, blocky crown. Parts come back to front; the trunk is the
    only one named 'trunk' (draw it in the box faces, the rest in greens). No facing: it looks the same each way."""
    return place(TREES[kind], x, y, z, '-y', 1.0)
