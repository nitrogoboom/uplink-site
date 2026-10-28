"""Draws backup.svg (Services, Work) from a world-space description.
Edit the numbers below and run again; don't hand-edit the SVG.
usage: python tools/gen_backup.py site/assets/img/backup.svg
World: 1 unit = 16.46px. x runs right-down, y left-down, z up. Origin is the back corner of the backup unit's floor.
Everything sits on the isoprops grid (x, y in 0.25s, z in 0.125s). Flat details (drive bays, status panel,
door, lock) are drawn in 2D on their face with isoprops.on_front / on_side.
"""
import math, sys
from shapely.geometry import LineString, Polygon, box as box_shape
from shapely.ops import unary_union
from iso import W, fmt
from isogen import ORANGE, BLUE, INK, faces, iso_ellipse, label, doc, write, silhouette, floor_grid, disc_arcs
from isoprops import on_front, on_side, rect
import palette as pal

w = W(0, 0, 16.46)
TRANSLATE = (268.6, 214.6)            # puts the whole picture (labels included) in the middle of the 640 x 480 frame
GREEN, BAY, SLOT = pal.GREEN, pal.GLASS, pal.EDGE

# backup unit: three stacked appliances, each with four drive bays on its right face and a status panel on its left
UNIT = (5, 4, 1.375)                  # x, y, height of one appliance
UNITS = 3
UNIT_GAP = 0.125                      # air between stacked appliances
BAYS = 4                              # drive bays across the right face (x = UNIT x)
BAY_MARGIN, BAY_GAP, BAY_V = 0.25, 0.125, (0.25, 1.125)   # bay inset from the face's sides, gap between bays, top/bottom (down from the top)
BUSY = {(2, 0), (1, 2)}               # (appliance, bay) with the orange "writing" light; the rest are green

# offsite copy: a small secure building at the back right
SITE = (8, 11, -3, -0.5, 2.5)         # x0, x1, y0, y1, height
DOOR = (1.125, 0.75, 1.5)             # on its left face (y = y1): left edge from x0, width, height
WINDOWS = [(0.25, 0.375), (2.0, 0.375)]   # small windows on the left face: (left edge from x0, top down from the roof)
LOCK = 0.9                            # lock emblem on its right face (x = x1), size

# copy link: from the top appliance up, back over the unit and down onto the building's roof
LINK_RISE = 1.0

# restore loop round the backup unit, just above the floor, open behind the unit
RING_C, RING_R, RING_Z = (2.5, 2.0), 4.5, 0.0
RING_FROM, RING_TO = -105, 160        # degrees, world; starts behind the unit, ends left of it where the arrowhead shows
ARROW = (9.0, 3.5, 3.75)               # arrowhead: tip ahead of the loop end, base behind it, half width (px)

DISC_C, DISC_R = (4, 1), 8.25         # floor disc; grid on whole units
MIN_SEG = 3                           # drop floor-line slivers shorter than this (px) peeking out beside a box
TITLE = 'Three stacked backup appliances, a restore loop round them, and an offsite copy in a secure building'

DX, DY, DH = UNIT
SX0, SX1, SY0, SY1, SH = SITE

# labels: (dot in world or 'ring:deg', elbow offset from the dot in px, text side, title, subline, colour)
LABELS = [
    (('unit', 1.0, DY, (UNITS - 1) * (DH + UNIT_GAP) + DH / 2), (-58, -58), 'left', 'DAILY BACKUPS', 'servers + Microsoft 365', BLUE),
    (('site', SX1, (SY0 + SY1) / 2, SH * 0.5), (30, -66), 'right', 'OFFSITE COPY', 'a separate, locked site', ORANGE),   # on the lock
    (('ring', 105), (40, 48), 'right', 'TESTED RESTORES', 'we prove it works', ORANGE),
]
TITLE_W, SUB_W = 8.4, 5.4             # rough px per character, for the floor-line gap round each label

# compact phone cut (isogen.doc crop): the same scene framed closer, labels at 1.5x. Crop, elbows and text x are
# page coordinates (the group's translate is taken off for you). Keep the crop 4:3.
COMPACT = dict(crop=(106, 56, 440, 330), scale=1.5, labels=[
    # (dot spec as in LABELS, elbow, text x, anchor, title, subline, colour)
    (('unit', 1.0, DY, (UNITS - 1) * (DH + UNIT_GAP) + DH / 2), (228, 86), 255, 'start', 'DAILY BACKUPS', 'servers + Microsoft 365', BLUE),
    (('site', SX0 + 0.5, SY1, 0.5), (389, 322), 407, 'start', 'OFFSITE COPY', 'a separate,\nlocked site', ORANGE),
    (('ring', 5), (324, 345), 297, 'end', 'TESTED RESTORES', 'we prove it works', ORANGE),
])
LEADER_CLEAR = 3                      # px of floor kept clear either side of a leader line


def unit_z(i): return i * (DH + UNIT_GAP)


def ring_point(deg):
    t = math.radians(deg)
    return w.p(RING_C[0] + RING_R * math.cos(t), RING_C[1] + RING_R * math.sin(t), RING_Z)


def label_geom(spec):
    """Screen dot, elbow, text x and anchor for one label."""
    where, (ox, oy), side, title, sub, colour = spec
    dot = ring_point(where[1]) if where[0] == 'ring' else w.p(*where[1:])
    elbow = (dot[0] + ox, dot[1] + oy)
    text_x = elbow[0] + (27 if side == 'right' else -27)
    return dot, elbow, text_x, 'start' if side == 'right' else 'end'


def dot_at(where):
    return ring_point(where[1]) if where[0] == 'ring' else w.p(*where[1:])


def compact_labels():
    """(dot, elbow, text x, anchor, title, sub, colour) for the cut, in the drawing's group coordinates."""
    tx0, ty0 = TRANSLATE
    return [(dot_at(where), (ex - tx0, ey - ty0), x - tx0, anchor, t, sub, c)
            for where, (ex, ey), x, anchor, t, sub, c in COMPACT['labels']]


def compact_gaps():
    """Floor lines stop round the cut's bigger text (sublines may wrap) and keep clear of its leaders."""
    k, gaps = COMPACT['scale'], []
    for dot, (ex, ey), x, anchor, t, sub, _c in compact_labels():
        lines = sub.split('\n')
        width = max(len(t) * TITLE_W, max(len(line) for line in lines) * SUB_W) * k
        x0, x1 = (min(ex, x) - 4, x + width + 6) if anchor == 'start' else (x - width - 6, max(ex, x) + 4)
        ty = ey + 4.5 * k
        gaps.append(box_shape(x0, ty - 15 * k, x1, ty + 15 * k + (len(lines) - 1) * 13 * k + 5))
        gaps.append(LineString([dot, (ex, ey), (x, ey)]).buffer(LEADER_CLEAR))
    return gaps


def label_gaps():
    gaps = []
    for spec in LABELS:
        dot, (ex, ey), tx, anchor = label_geom(spec)
        width = max(len(spec[3]) * TITLE_W, len(spec[4]) * SUB_W)
        x0, x1 = (min(ex, tx) - 4, tx + width + 6) if anchor == 'start' else (tx - width - 6, max(ex, tx) + 4)
        gaps.append(box_shape(x0, ey - 14, x1, ey + 26))
        gaps.append(LineString([dot, (ex, ey), (tx, ey)]).buffer(LEADER_CLEAR))   # floor lines keep clear of the leader too
    return gaps


def hidden(compact=False):
    """Screen areas floor lines skip: the labels, the unit and the building."""
    parts = compact_gaps() if compact else label_gaps()
    parts += [silhouette(w, 0, DX, 0, DY, unit_z(i), unit_z(i) + DH) for i in range(UNITS)]
    parts.append(silhouette(w, SX0, SX1, SY0, SY1, 0, SH))
    parts.append(Polygon(arrow_points()).buffer(LEADER_CLEAR))               # and of the arrowhead and the copy line
    parts.append(LineString([w.p(*p) for p in link_points()]).buffer(LEADER_CLEAR))
    return unary_union(parts)


def arrow_points():
    (ex, ey) = ring_point(RING_TO)
    (ax, ay), (bx, by) = ring_point(RING_TO - 0.5), ring_point(RING_TO + 0.5)
    n = math.hypot(bx - ax, by - ay); tx, ty = (bx - ax) / n, (by - ay) / n
    ahead, behind, half = ARROW
    mx, my = ex - tx * behind, ey - ty * behind
    return [(ex + tx * ahead, ey + ty * ahead), (mx - ty * half, my + tx * half), (mx + ty * half, my - tx * half)]


def link_points():
    top = unit_z(UNITS - 1) + DH
    cx, cy, mx, my = DX / 2, DY / 2, (SX0 + SX1) / 2, (SY0 + SY1) / 2
    up = top + LINK_RISE
    return [(cx, cy, top), (cx, cy, up), (cx, my, up), (mx, my, up), (mx, my, SH)]


def restore_loop():
    rx, ry, _ = iso_ellipse(w, RING_R)
    (sx, sy), (ex, ey) = ring_point(RING_FROM), ring_point(RING_TO)
    big = 1 if (RING_TO - RING_FROM) % 360 > 180 else 0
    arc = (f'<path d="M{fmt(sx)},{fmt(sy)}A{fmt(rx)},{fmt(ry)} 0 {big} 1 {fmt(ex)},{fmt(ey)}" '
           f'fill="none" stroke="{ORANGE}" stroke-width="1.6" stroke-opacity="0.9"/>')
    pts = arrow_points()                       # arrowhead along the loop's screen tangent at its end
    head = (f'<polygon class="mark" points="{" ".join(f"{fmt(x)},{fmt(y)}" for x, y in pts)}" '
            f'fill="{ORANGE}" stroke="{ORANGE}" stroke-width="1" stroke-linejoin="round"/>')
    return [arc, head]


def bays(i, z0):
    """Drive bays on the appliance's right face: dark bay, a pull slot, and a status light each."""
    z1 = z0 + DH
    face_w = DY                                    # the right face runs along y, DY long
    bw = (face_w - 2 * BAY_MARGIN - (BAYS - 1) * BAY_GAP) / BAYS
    v0, v1 = BAY_V
    out = []
    for k in range(BAYS):
        u = BAY_MARGIN + k * (bw + BAY_GAP)
        light = ORANGE if (i, k) in BUSY else GREEN
        out += [rect(u, v0, bw, v1 - v0, BAY, 0.06, f' stroke="{pal.EDGE}" stroke-opacity="0.18" stroke-width="1" vector-effect="non-scaling-stroke"'),
                rect(u + 0.15, v0 + 0.2, bw - 0.3, 0.08, SLOT, 0.04, ' fill-opacity="0.35"'),
                f'<circle cx="{u + bw - 0.18:.4g}" cy="{v1 - 0.17:.4g}" r="0.07" fill="{light}"/>']
    return f'<g transform="{on_side(w, DX, DY, z1)}">' + ''.join(out) + '</g>'


def status_panel(i, z0):
    """Small lit display and a power light on the appliance's left face."""
    z1 = z0 + DH
    out = [rect(0.5, 0.375, 1.5, 0.5, pal.SCREEN, 0.06, f' stroke="{pal.SKY}" stroke-opacity="0.4" stroke-width="1" vector-effect="non-scaling-stroke"'),
           rect(0.66, 0.53, 0.9, 0.08, BLUE, 0.04, ' fill-opacity="0.85"'),
           rect(0.66, 0.69, 0.55, 0.06, BLUE, 0.03, ' fill-opacity="0.45"'),
           f'<circle cx="{DX - 0.5:.4g}" cy="0.625" r="0.09" fill="{GREEN if i else ORANGE}"/>']
    return f'<g transform="{on_front(w, 0, DY, z1)}">' + ''.join(out) + '</g>'


def backup_unit():
    out = []
    for i in range(UNITS):
        z = unit_z(i)
        out += faces(w, 0, DX, 0, DY, z, z + DH) + [bays(i, z), status_panel(i, z)]
    return out


def lock_icon(size):
    """Padlock in local units, centred on (0, 0)."""
    s = size
    body = rect(-s * 0.4, -s * 0.05, s * 0.8, s * 0.6, ORANGE, s * 0.08)
    shackle = (f'<path d="M{-s * 0.24:.4g},{-s * 0.05:.4g}V{-s * 0.25:.4g}A{s * 0.24:.4g},{s * 0.24:.4g} 0 0 1 {s * 0.24:.4g},{-s * 0.25:.4g}V{-s * 0.05:.4g}" '
               f'fill="none" stroke="{ORANGE}" stroke-width="2" vector-effect="non-scaling-stroke"/>')
    hole = f'<circle cx="0" cy="{s * 0.22:.4g}" r="{s * 0.07:.4g}" fill="{INK}"/>'
    return shackle + body + hole


def offsite_site():
    out = faces(w, SX0, SX1, SY0, SY1, 0, SH)
    # left face (y = SY1), u along +x from SX0, v down from the roof
    dl, dw, dh = DOOR
    left = [rect(dl, SH - dh, dw, dh, BAY, 0.05, f' stroke="{pal.EDGE}" stroke-opacity="0.25" stroke-width="1" vector-effect="non-scaling-stroke"'),
            f'<circle cx="{dl + dw - 0.15:.4g}" cy="{SH - dh / 2:.4g}" r="0.05" fill="{SLOT}" fill-opacity="0.7"/>']
    for wl, wt in WINDOWS:
        left.append(rect(wl, wt, 0.75, 0.5, BLUE, 0.04, f' fill-opacity="0.35" stroke="{pal.SKY}" stroke-opacity="0.6" stroke-width="1" vector-effect="non-scaling-stroke"'))
    out.append(f'<g transform="{on_front(w, SX0, SY1, SH)}">' + ''.join(left) + '</g>')
    # right face (x = SX1): the lock, centred
    fw = SY1 - SY0
    out.append(f'<g transform="{on_side(w, SX1, SY1, SH)} translate({fw / 2:.4g} {SH * 0.5:.4g})">' + lock_icon(LOCK) + '</g>')
    return out


def copy_link():
    """Dashed copy line on the grid: up from the top appliance, back to the building's middle, over, down onto its roof."""
    pts = link_points()
    path = w.pts(*pts)
    ex, ey = w.p(*pts[-1])
    return [f'<polyline points="{path}" fill="none" stroke="{ORANGE}" stroke-width="1.3" stroke-opacity="0.85" stroke-dasharray="6 5"/>',
            f'<circle cx="{fmt(ex)}" cy="{fmt(ey)}" r="3" fill="{ORANGE}"/>']


def build(compact=False):
    mask = hidden(compact)
    gaps = unary_union(compact_gaps() if compact else label_gaps())
    body = [floor_grid(w, DISC_C, DISC_R, mask, min_seg=MIN_SEG) + disc_arcs(w, DISC_R, *DISC_C, mask=gaps)]
    body += restore_loop() + offsite_site() + backup_unit() + copy_link()
    if compact:
        for dot, elbow, x, anchor, t, sub, c in compact_labels():
            body += label(dot, elbow, x, t, sub, colour=c, anchor=anchor, scale=COMPACT['scale'])
        return doc(TITLE, body, translate=TRANSLATE, crop=COMPACT['crop'])
    for spec in LABELS:
        dot, elbow, tx, anchor = label_geom(spec)
        body += label(dot, elbow, tx, spec[3], spec[4], colour=spec[5], anchor=anchor)
    return doc(TITLE, body, translate=TRANSLATE)


if __name__ == '__main__':
    write(sys.argv[1], build())
    write(sys.argv[1].replace('.svg', '-compact.svg'), build(compact=True))     # phone cut, served by <picture> on small screens
