"""Draws security.svg (Services page) from a world-space description.
Edit the numbers below and run again; don't hand-edit the SVG.
usage: python tools/gen_security.py site/assets/img/security.svg
World: 1 unit = 58.4/3 px (the floor grid step). Origin = floor centre. x runs right-down, y left-down, z up.
Geometry sits on a grid (x, y in 0.25s, z in 0.125s) so edges meet exactly or sit clearly apart.
"""
import math, sys
from shapely.geometry import box as box_shape
from shapely.ops import unary_union
from iso import W, fmt
from isoprops import on_front
from isogen import FACES, ORANGE, BLUE, INK, faces, ellipse, label, doc, write, silhouette, floor_grid, disc_arcs

w = W(0, 58.4, 58.4 / 3)              # inside the group's translate (CENTRE)
CENTRE = (320, 252)                   # group origin in the 640 x 480 frame: drawing centred left to right

HALF = 3                              # building is 6 x 6
HEIGHT = 9
CAP = (0.25, 0.25)                    # roof cap: overhang each side, thickness
HVAC = (0.75, 2.25, -2.25, -1.0, 0.625)   # roof unit, back right: x0 x1 y0 y1, height above the cap
WIN_SPANS = [(-2.25, -1.25), (-0.5, 0.5), (1.25, 2.25)]   # along each wall
WIN_ROWS = [0.5, 2.75, 4.75, 6.75]    # sill heights, ground floor first; each window is WIN_H tall
WIN_H = 1.25
LIT = {('r', 3, 0), ('l', 3, 0), ('r', 1, 1), ('l', 2, 2)}   # (wall, row, span) lit from inside; the two top outer ones carry labels
DOOR = (-0.75, 0.75, 1.75)            # on the left wall (y = HALF), ground floor: x from, x to, height
AWNING = (-1.0, 1.0, 0.5, 2.0, 0.125)  # over the door: x from, x to, depth out, z, thickness

DISC_R = 9.5                          # floor disc radius; grid every 1 unit, offset 0.5
FENCE_R = 8.3                         # dashed blue perimeter
GUARD_R = 6.2                         # orange monitoring ring
THREATS = [0, 90, 180, 270]           # degrees: one per side, each along an iso axis, all four in view
THREAT_R = (9.3, 6.7)                 # each runs from here in to the cross
CROSS = 0.35                          # half-size of the blocked cross, world units: its arms run along the floor's x and y axes
RED = '#EE8A7C'

POLE = 1.0                            # shield stands on a short pole above the roof centre
SHIELD_W, SHIELD_H = 3.0, 3.625       # a shield-shaped plate standing in the plane y = 0 (faces front-left), world units
THICK = 0.25                          # plate thickness, back along -y; drawn as stacked copies so the edge is solid
HALO_R = 1.0                          # glow ring on the roof under the pole

GLASS, GLASS_LIT = '#1F2A3B', '#2C4A66'

# labels: (dot world point, text x, title y, title, subline, colour, anchor)
MON_DOT = math.degrees(math.acos(3.5 / GUARD_R))   # round the orange ring, where it meets grid line x = 3.5
TOP_WIN = WIN_ROWS[3] + WIN_H / 2
LABELS = [
    ((GUARD_R * math.cos(math.radians(MON_DOT)), GUARD_R * math.sin(math.radians(MON_DOT)), 0),
     63.3, 190.9, '24/7 MONITORING', 'threats stopped at the edge', ORANGE, 'start'),
    ((HALF, -1.75, TOP_WIN), 142.0, -66.0, 'MFA + EDR', 'every login, every device', BLUE, 'start'),     # the two upper labels mirror each other:
    ((-1.75, HALF, TOP_WIN), -142.0, -66.0, 'EMAIL FILTER', 'phishing blocked', BLUE, 'end'),            # outer top windows, same height, same reach
]
GAP = (30.0, 175.5, 213.7)            # floor lines stop at x >= GAP[0], GAP[1] <= y <= GAP[2] (bottom label + leader elbow clearance)
TITLE = 'Office building inside a security perimeter with blocked threats and a shield'


def cap_box():
    o, t = CAP
    return (-HALF - o, HALF + o, -HALF - o, HALF + o, HEIGHT, HEIGHT + t)


def hvac_box():
    x0, x1, y0, y1, h = HVAC
    z = HEIGHT + CAP[1]
    return (x0, x1, y0, y1, z, z + h)


def awning_box():
    a0, a1, d, z, t = AWNING
    return (a0, a1, HALF, HALF + d, z, z + t)


def outline():
    return unary_union([silhouette(w, -HALF, HALF, -HALF, HALF, 0, HEIGHT), silhouette(w, *cap_box()), silhouette(w, *awning_box())])


def gap():
    return box_shape(GAP[0], GAP[1], 10_000, GAP[2])


def threats():
    """Dashed approach along an iso axis, blocked by a cross lying flat on the floor."""
    lines, crosses = [], []
    for deg in THREATS:
        c, s = round(math.cos(math.radians(deg))), round(math.sin(math.radians(deg)))
        (ax, ay), (bx, by) = ((r * c, r * s) for r in THREAT_R)
        p, q = w.p(ax, ay), w.p(bx, by)
        lines.append(f'<polyline points="{fmt(p[0])},{fmt(p[1])} {fmt(q[0])},{fmt(q[1])}" fill="none" stroke="{RED}" '
                     f'stroke-width="1.2" stroke-opacity="0.85" stroke-dasharray="3 4"/>')
        k = CROSS
        crosses.append(f'<polyline points="{w.pts((bx - k, by), (bx + k, by))}" fill="none" stroke="{RED}" stroke-width="2"/>'
                       f'<polyline points="{w.pts((bx, by - k), (bx, by + k))}" fill="none" stroke="{RED}" stroke-width="2"/>')
    return lines + crosses


def pane(pts, lit):
    fill, op = (GLASS_LIT, 0.9) if lit else (GLASS, 1)
    return f'<polygon points="{w.pts(*pts)}" fill="{fill}" fill-opacity="{op}" stroke="{BLUE}" stroke-width="0.9" stroke-opacity="0.5"/>'


def windows():
    out = []
    for row, lo in enumerate(WIN_ROWS):
        hi = lo + WIN_H
        for k, (a, b) in enumerate(WIN_SPANS):      # right wall (x = HALF), back to front
            out.append(pane([(HALF, a, lo), (HALF, b, lo), (HALF, b, hi), (HALF, a, hi)], ('r', row, k) in LIT))
        for k, (a, b) in enumerate(WIN_SPANS):      # left wall (y = HALF), back to front; the door takes the ground floor middle
            if row == 0 and k == 1:
                continue
            out.append(pane([(a, HALF, lo), (b, HALF, lo), (b, HALF, hi), (a, HALF, hi)], ('l', row, k) in LIT))
    d0, d1, dh = DOOR
    out.append(f'<polygon points="{w.pts((d0, HALF, 0), (d1, HALF, 0), (d1, HALF, dh), (d0, HALF, dh))}" fill="#1A2333" '
               f'stroke="{BLUE}" stroke-width="0.9" stroke-opacity="0.6"/>')
    out.append(f'<polyline points="{w.pts((0, HALF, 0), (0, HALF, dh))}" fill="none" stroke="{BLUE}" stroke-width="0.9" stroke-opacity="0.4"/>')
    return out


def shield_path(wd, ht):
    """Shield outline in a face's local units: u right, v down, tip at the bottom centre."""
    hw = wd / 2
    return (f'M{hw:.4g},0 L{wd:.4g},{0.16 * ht:.4g} L{wd:.4g},{0.54 * ht:.4g} '
            f'C{wd:.4g},{0.82 * ht:.4g} {hw + 0.38 * hw:.4g},{0.93 * ht:.4g} {hw:.4g},{ht:.4g} '
            f'C{hw - 0.38 * hw:.4g},{0.93 * ht:.4g} 0,{0.82 * ht:.4g} 0,{0.54 * ht:.4g} L0,{0.16 * ht:.4g} Z')


def shield():
    """A shield-shaped plate standing on a pole at the roof centre, in the plane y = 0 like a sign: its face
    is mapped onto that plane, and its thickness runs back along -y (stacked copies make the edge solid)."""
    roof = HEIGHT + CAP[1]
    bx, by = w.p(0, 0, roof)
    wd, ht = SHIELD_W, SHIELD_H
    base = roof + POLE                  # the tip sits on the pole
    d = shield_path(wd, ht)
    ns = ' vector-effect="non-scaling-stroke"'
    out = [ellipse(w, HALO_R, z=roof, attrs=f'fill="{ORANGE}" fill-opacity="0.12" stroke="{ORANGE}" stroke-width="1" stroke-opacity="0.6"'),
           f'<polyline points="{w.pts((0, 0, roof), (0, 0, base))}" fill="none" stroke="{ORANGE}" stroke-width="2"/>']
    steps = 5
    for k in range(steps, 0, -1):       # the edge: back face first, then copies forward
        y = -THICK * k / steps
        out.append(f'<path d="{d}" transform="{on_front(w, -wd / 2, y, base + ht)}" fill="#C98030"'
                   f'{" stroke=\"#A86A24\" stroke-width=\"1\"" + ns if k == steps else ""}/>')
    lock = (f'<rect x="{wd / 2 - 0.32:.4g}" y="{0.42 * ht:.4g}" width="0.64" height="0.6" rx="0.1" fill="{ORANGE}"/>'
            f'<path d="M{wd / 2 - 0.2:.4g},{0.42 * ht:.4g} v-0.3 a0.2,0.2 0 0 1 0.4,0 v0.3" fill="none" stroke="{ORANGE}" stroke-width="2"{ns}/>'
            f'<circle cx="{wd / 2:.4g}" cy="{0.42 * ht + 0.3:.4g}" r="0.08" fill="{INK}"/>')
    out.append(f'<g transform="{on_front(w, -wd / 2, 0, base + ht)}"><path d="{d}" fill="#405169" stroke="{ORANGE}" stroke-width="2.5"{ns}/>{lock}</g>')
    return out


def build():
    body = [floor_grid(w, (0, 0), DISC_R, gap().union(outline()), phase=(0.5, 0.5)) + disc_arcs(w, DISC_R, mask=gap())]
    body.append(ellipse(w, FENCE_R, attrs=f'fill="none" stroke="{BLUE}" stroke-width="1" stroke-opacity="0.55" stroke-dasharray="5 6"'))
    body.append(ellipse(w, GUARD_R, attrs=f'fill="none" stroke="{ORANGE}" stroke-width="1.4" stroke-opacity="0.9"'))
    body += threats()
    body += faces(w, -HALF, HALF, -HALF, HALF, 0, HEIGHT, FACES)
    body += windows()
    body += faces(w, *cap_box()) + faces(w, *hvac_box()) + faces(w, *awning_box())
    body += shield()
    for dot, tx, ty, title, sub, colour, anchor in LABELS:
        side = 27 if anchor == 'end' else -27
        body += label(w.p(*dot), (tx + side, ty - 4.5), tx, title, sub, colour, anchor)
    return doc(TITLE, body, translate=CENTRE)


if __name__ == '__main__':
    write(sys.argv[1], build())
