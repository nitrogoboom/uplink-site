"""Draws backup.svg (Services, Work) from a world-space description.
Edit the numbers below and run again; don't hand-edit the SVG.
usage: python tools/gen_backup.py site/assets/img/backup.svg
World: 1 unit = 16.46px. x runs right-down, y left-down, z up. Origin is the back corner of the drive stack's floor.
"""
import math, sys
from shapely.geometry import box as box_shape
from shapely.ops import unary_union
from iso import W, fmt
from isogen import ORANGE, BLUE, faces, iso_ellipse, label, doc, write, silhouette, floor_grid, disc_arcs

w = W(0, 0, 16.46)                    # inside the group's translate(289.9,207.4)

DRIVE = (5, 4, 1.4)                   # each backup drive: x, y, height
DRIVES = 3
STACK_GAP = 0.2                       # air between stacked boxes
LEDS = [0.6, 1.5, 2.4, 3.3]           # along the right wall (y), first one orange
OFFSITE = (8, 11, -4, -1.6)           # offsite stack footprint: x0, x1, y0, y1
OFFSITE_H, OFFSITES = 1.0, 2
RING_C, RING_R, RING_Z = (2.5, 2), 5.6, 0.05   # restore loop round the drive stack, just above the floor
RING_FROM, RING_TO = -160, 160        # loop runs this way round (degrees, world), open at the back
ARROW = (11, 4.4, 4.5)                  # arrowhead: tip ahead of the loop end, base behind it, half width (px)
DISC_C, DISC_R = (4, 1.5), 8.2        # floor disc; grid on whole units
GAP = (-24.7, 132.8, 111.6)           # floor lines stop inside x0 <= x <= x1, y >= y0 (label clearance)
MIN_SEG = 3                           # drop floor-line slivers shorter than this (px) peeking out beside a box
TITLE = 'Stacked backup drives with a restore loop and an offsite copy'

DX, DY, DH = DRIVE
OX0, OX1, OY0, OY1 = OFFSITE


def drive_z(i): return i * (DH + STACK_GAP)
def offsite_z(i): return i * (OFFSITE_H + STACK_GAP)




def hidden():
    """Screen areas floor lines skip: the label gap and both box stacks."""
    x0, x1, y0 = GAP
    parts = [box_shape(x0, y0, x1, 10_000)]
    parts += [silhouette(w, 0, DX, 0, DY, drive_z(i), drive_z(i) + DH) for i in range(DRIVES)]
    parts += [silhouette(w, OX0, OX1, OY0, OY1, offsite_z(i), offsite_z(i) + OFFSITE_H) for i in range(OFFSITES)]
    return unary_union(parts)






def ring_point(deg):
    t = math.radians(deg)
    return w.p(RING_C[0] + RING_R * math.cos(t), RING_C[1] + RING_R * math.sin(t), RING_Z)


def restore_loop():
    rx, ry, _ = iso_ellipse(w, RING_R)
    (sx, sy), (ex, ey) = ring_point(RING_FROM), ring_point(RING_TO)
    big = 1 if (RING_TO - RING_FROM) % 360 > 180 else 0
    arc = (f'<path d="M{fmt(sx)},{fmt(sy)}A{fmt(rx)},{fmt(ry)} 0 {big} 1 {fmt(ex)},{fmt(ey)}" '
           f'fill="none" stroke="{ORANGE}" stroke-width="1.6" stroke-opacity="0.9"/>')
    # arrowhead along the loop's screen tangent at its end
    (ax, ay), (bx, by) = ring_point(RING_TO - 0.5), ring_point(RING_TO + 0.5)
    n = math.hypot(bx - ax, by - ay); tx, ty = (bx - ax) / n, (by - ay) / n
    ahead, behind, half = ARROW
    tip = (ex + tx * ahead, ey + ty * ahead)
    mx, my = ex - tx * behind, ey - ty * behind
    pts = [tip, (mx - ty * half, my + tx * half), (mx + ty * half, my - tx * half)]
    head = (f'<polygon class="mark" points="{" ".join(f"{fmt(x)},{fmt(y)}" for x, y in pts)}" '
            f'fill="{ORANGE}" stroke="{ORANGE}" stroke-width="1" stroke-linejoin="round"/>')
    return [arc, head]


def drives():
    out = []
    for i in range(DRIVES):
        z = drive_z(i)
        out += faces(w, 0, DX, 0, DY, z, z + DH)
        for k, y in enumerate(LEDS):
            cx, cy = w.p(DX, y, z + DH / 2)
            out.append(f'<circle cx="{fmt(cx)}" cy="{fmt(cy)}" r="1.8" fill="{ORANGE if k == 0 else BLUE}"/>')
    return out


def offsite():
    out = []
    for i in range(OFFSITES):
        z = offsite_z(i)
        out += faces(w, OX0, OX1, OY0, OY1, z, z + OFFSITE_H)
    # copy runs from the top drive, back over the stack and down onto the offsite stack
    top = drive_z(DRIVES - 1) + DH
    mid = ((OX0 + OX1) / 2, (OY0 + OY1) / 2)
    path = w.pts((DX / 2, DY / 2, top), (DX / 2, mid[1], top), (mid[0], mid[1], top), (mid[0], mid[1], offsite_z(OFFSITES - 1) + OFFSITE_H))
    out.append(f'<polyline points="{path}" fill="none" stroke="{ORANGE}" stroke-width="1.3" stroke-opacity="0.8" stroke-dasharray="6 5"/>')
    return out


def build():
    x0, x1, y0 = GAP
    body = [floor_grid(w, DISC_C, DISC_R, hidden(), min_seg=MIN_SEG)
            + disc_arcs(w, DISC_R, *DISC_C, mask=box_shape(x0, y0, x1, 10_000))]
    body += restore_loop() + drives() + offsite()
    up = offsite_z(OFFSITES - 1)
    body += label(w.p((OX0 + OX1) / 2, OY1, up + OFFSITE_H / 2), (186.2, -16.2), 213.2, 'OFFSITE COPY', 'separate location')
    body += label(w.p(1, DY, drive_z(DRIVES - 1) + 0.7), (-88.0, -76.3), -115.0, 'DAILY BACKUPS', 'servers + Microsoft 365', colour=BLUE, anchor='end')
    body += label(ring_point(90), (-32.7, 125.1), -5.7, 'TESTED RESTORES', 'we prove it works')
    return doc(TITLE, body, translate=(289.9, 207.4))


if __name__ == '__main__':
    write(sys.argv[1], build())
