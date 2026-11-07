"""Draws the Home "We grow with you" world (src/components/home/grow-world.svg, inlined by Grow.astro): one business
that grows in six steps by where its people work (the office, a home, the road, a second office, the ring and cloud
over all of it, then the dome). Every part carries data-s, the step it arrives on, and data-o, its order inside the
step; src/scripts/grow.js shows a step's parts as it plays. Nothing moves or rebuilds: later steps only add.
Edit the numbers below and run again; don't hand-edit the SVG.
usage: python tools/gen_grow.py                       (writes src/components/home/grow-world.svg)
       python tools/gen_grow.py editing-room/grow-options/places   (also the five separate scenes the mockups used)
World: 1 unit = 20px. Origin = floor disc centre. x runs right-down, y left-down, z up.
Everything sits on the isoprops grid (x, y in 0.25s, z in 0.125s), so no two edges can nearly touch
(except each person's head, a half step in: see person()).
No words in the drawing: the page writes its tags over it at the anchors (<circle class="tg-a" data-a="...">).
Check: python tools/check.py src/components/home/grow-world.svg
       python tools/painter.py src/components/home/grow-world.svg 0 0 20 tools/rules_grow.py
"""
import sys, pathlib
from shapely.geometry import Polygon
from shapely.ops import unary_union
from iso import W, fmt
from isogen import FACES, HIGH, ORANGE, BLUE, INK, EDGE, silhouette, floor_grid, disc_arcs, ellipse, doc, write, box as draw_box
from isoprops import tree
import palette as pal

w = W(0, 0, 20)
SIZE = 480                            # each scene's width and height in the page (px)
PAD = 14                              # space round the drawing inside its square (px)

STOREY, WALL = 2.25, 2.0              # floor to floor; wall height inside it (the rest is the slab)
SLAB = 0.25                           # slab overhang past the walls
WIN_W, WIN_Z = 1.0, (0.5, 1.5)        # window width; sill and head from the storey floor
DOOR_W, DOOR_H = 1.0, 1.5
GABLE = 0.625                         # house roof rise per unit of depth: keeps the slopes 12° or more off the iso axes
GREEN = (pal.GREEN_MID, pal.GREEN_DARK, pal.GREEN)
GREEN_EDGE = f'stroke="{pal.EDGE}" stroke-width="1" stroke-opacity="0.22"'
HI_EDGE = f'stroke="{pal.HI_EDGE}" stroke-width="1" stroke-opacity="0.55"'
LIGHT = (pal.MUG_LEFT, pal.MUG_RIGHT, pal.MUG_TOP)       # car body, cloud, faces
SKYBOX = (pal.SKY, pal.SKY_RIGHT, pal.SKY_TOP)           # car glass, shirts
ROOF = (pal.STEP_LEFT, pal.STEP_RIGHT, pal.STEP_TOP)     # house roof, a shade lighter than the walls
LINK = f'fill="none" stroke="{BLUE}" stroke-width="2" stroke-dasharray="5 5" stroke-linecap="round"'

BOXES = []                            # every box drawn in the current scene, in order (rules_grow.py reads it)


class Scene:
    def __init__(self, name, title, disc):
        self.name, self.title, self.disc = name, title, disc     # disc = (x, y, r)
        self.ops, self.ground, self.points, self.anchors = [], [], [], {}
        self.step = None                                         # the growing world: which step a part arrives on
        self.whole_grid = False                                  # True: floor lines run under everything (the growing world)

    def group(self, o):
        s = f' data-s="{self.step}"' if self.step else ''
        self.ops.append(('raw', f'<g class="pc"{s} data-o="{o}">'))

    def end(self):
        self.ops.append(('raw', '</g>'))

    def box(self, b, cols=FACES, edge=EDGE, on_ground=True):
        self.ops.append(('box', b, cols, edge))
        if on_ground:
            self.ground.append(silhouette(w, *b))
        x0, x1, y0, y1, z0, z1 = b
        self.points += [w.p(x, y, z) for x in (x0, x1) for y in (y0, y1) for z in (z0, z1)]

    def flat(self, pts, fill, extra='', ground=False):
        self.ops.append(('raw', f'<polygon points="{w.pts(*pts)}" fill="{fill}"{extra}/>'))
        if ground:
            self.ground.append(Polygon([w.p(*p) for p in pts]))

    def raw(self, s):
        self.ops.append(('raw', s))

    def anchor(self, key, p):
        self.anchors[key] = p


# ---- parts ---------------------------------------------------------------------------------------
def windows(s, x0, x1, y0, y1, z, lit=(), skip=()):
    """Windows on the two walls the viewer sees: right (x = x1) then left (y = y1), back to front."""
    lo, hi = z + WIN_Z[0], z + WIN_Z[1]
    for wall, a0, a1 in (('r', y0, y1), ('l', x0, x1)):
        n = int((a1 - a0 - 0.5) // 1.75)                    # 1 wide, about 0.75 apart and from the corners (0.5 at worst)
        gap = (a1 - a0 - n * WIN_W) / (n + 1)
        for k in range(n):
            a = a0 + gap * (k + 1) + WIN_W * k
            a = round(a * 4) / 4                            # on the 0.25 grid
            if (wall, k) in skip:
                continue
            pts = ([(x1, a, lo), (x1, a + WIN_W, lo), (x1, a + WIN_W, hi), (x1, a, hi)] if wall == 'r'
                   else [(a, y1, lo), (a + WIN_W, y1, lo), (a + WIN_W, y1, hi), (a, y1, hi)])
            on = (wall, k) in lit
            s.flat(pts, pal.SKY if on else pal.GLASS, ' fill-opacity="0.6"' if on else '')


def door(s, x0, x1, y1, z=0):
    """Lit door in the middle of the left wall (y = y1), with an amber awning over it."""
    m = round((x0 + x1) / 2 * 4) / 4
    a, b = m - DOOR_W / 2, m + DOOR_W / 2
    s.flat([(a, y1, z), (b, y1, z), (b, y1, z + DOOR_H), (a, y1, z + DOOR_H)], pal.HI_TOP,
           f' fill-opacity="0.55" stroke="{pal.HI_EDGE}" stroke-width="1.2" stroke-opacity="0.8"')
    s.box((a - 0.25, b + 0.25, y1, y1 + 0.5, z + DOOR_H + 0.25, z + DOOR_H + 0.375), HIGH, HI_EDGE, on_ground=False)
    return (m, y1, z + DOOR_H / 2)


def building(s, x0, x1, y0, y1, storeys, o, lit=None, door_on=True, roof_unit=True):
    """Office block: storeys of wall, windows and slab; a lit door on the ground floor; a roof unit on top.
    Each storey is its own build group (o, o + 1, ...). Returns (door point, roof centre)."""
    lit = lit or {}
    dp = None
    for f in range(storeys):
        s.group(o + f)
        z = f * STOREY
        s.box((x0, x1, y0, y1, z, z + WALL))
        windows(s, x0, x1, y0, y1, z, lit.get(f, ()), skip={('l', 0)} if f == 0 and door_on and x1 - x0 < 3.5 else set())
        if f == 0 and door_on:
            dp = door(s, x0, x1, y1)
        s.box((x0 - SLAB, x1 + SLAB, y0 - SLAB, y1 + SLAB, z + WALL, z + STOREY), on_ground=False)
        if f == storeys - 1 and roof_unit:
            top = z + STOREY
            ux, uy = round((x0 + 0.75) * 4) / 4, round((y0 + 0.75) * 4) / 4
            s.box((ux, ux + 1.0, uy, uy + 1.0, top, top + 0.5), on_ground=False)
        s.end()
    top = storeys * STOREY
    return dp, ((x0 + x1) / 2, (y0 + y1) / 2, top)


def house(s, x0, x1, y0, y1, o, lit=True):
    """A house: walls, a lit window and door, then a gable roof with its ridge along x."""
    h = 2.0
    s.group(o)
    s.box((x0, x1, y0, y1, 0, h), FACES)
    m = round((x0 + x1) / 2 * 4) / 4
    s.flat([(x1, y0 + 0.75, 0.5), (x1, y0 + 1.75, 0.5), (x1, y0 + 1.75, 1.5), (x1, y0 + 0.75, 1.5)], pal.HI_TOP if lit else pal.GLASS,
           ' fill-opacity="0.8"' if lit else '')          # the lit window: someone working
    dp = door(s, x0, x1, y1) if x1 - x0 >= 2 else None
    s.end()
    s.group(o + 1)
    d = y1 - y0
    r = round(GABLE * d * 8) / 8
    ym = (y0 + y1) / 2
    e = 0.5                                                 # overhang at the gable ends only: one along y would bend the slope
    s.flat([(x0 - e, y0, h), (x1 + e, y0, h), (x1 + e, ym, h + r), (x0 - e, ym, h + r)], ROOF[2], f' {EDGE}')   # back slope
    s.flat([(x1, y0, h), (x1, y1, h), (x1, ym, h + r)], ROOF[1], f' {EDGE}')                                     # gable end
    s.flat([(x0 - e, y1, h), (x1 + e, y1, h), (x1 + e, ym, h + r), (x0 - e, ym, h + r)], ROOF[0], f' {EDGE}')   # front slope
    s.points += [w.p(x0 - e, ym, h + r), w.p(x1 + e, ym, h + r)]
    s.end()
    return dp, (m, ym, h + r)


SHIRTS = (SKYBOX, GREEN, HIGH)        # people's shirts, picked by where they stand so a group isn't all one colour
LEGS = (pal.APP_BAR, pal.SCREEN, pal.PATH)


def person(s, x, y, o):
    """A person, built so nothing else in the picture shares the shape: dark legs, a coloured shirt, and a small
    light head centred on top (the head sits on a 0.125 step, a half grid step in from the shoulders)."""
    s.group(o)
    s.box((x, x + 0.5, y, y + 0.5, 0, 0.5), LEGS)
    s.box((x, x + 0.5, y, y + 0.5, 0.5, 1.0), SHIRTS[int(round((x + 2 * y) * 4)) % 3], on_ground=False)
    s.box((x + 0.125, x + 0.375, y + 0.125, y + 0.375, 1.0, 1.375), LIGHT, on_ground=False)
    s.end()


def trees(s, spots, o):
    s.group(o)
    for x, y, kind in spots:
        for k, (_n, b) in enumerate(tree(x, y, kind)):
            s.box(b) if k == 0 else s.box(b, GREEN, GREEN_EDGE, on_ground=k == 1)
    s.end()


def link(s, pts, o):
    """A cable on the floor: a cable along the iso axes, dashed blue."""
    s.group(o)
    s.raw(f'<polyline points="{w.pts(*[(x, y, 0) for x, y in pts])}" {LINK}/>')
    s.end()


def car(s, x0, y0, o):
    """A car on the road, facing +x: wheels, body, glass cabin."""
    s.group(o)
    for wx in (x0 + 0.5, x0 + 2.25):
        s.box((wx, wx + 0.5, y0 + 1.25, y0 + 1.5, 0, 0.25), (pal.PAGE, pal.PAGE, pal.PAGE))
    s.box((x0, x0 + 3.25, y0, y0 + 1.5, 0.25, 1.0), LIGHT, on_ground=False)
    s.box((x0 + 0.75, x0 + 2.5, y0 + 0.25, y0 + 1.25, 1.0, 1.625), SKYBOX, on_ground=False)
    s.end()
    s.ground.append(silhouette(w, x0, x0 + 3.25, y0, y0 + 1.5, 0, 1.625))
    return (x0 + 1.625, y0 + 0.75, 1.625)


def cloud(s, x, y, z, o):
    """A blocky cloud floating over (x, y): a flat base and two bumps."""
    s.group(o)
    s.box((x - 1.75, x + 1.75, y - 1.0, y + 1.0, z, z + 0.625), LIGHT, on_ground=False)
    s.box((x - 1.25, x, y - 0.75, y + 0.5, z + 0.625, z + 1.375), LIGHT, on_ground=False)
    s.box((x, x + 1.0, y - 0.5, y + 0.5, z + 0.625, z + 1.125), LIGHT, on_ground=False)
    s.end()
    return (x, y, z + 1.375)


def road(s, x0, x1, y0, y1, o=0):
    """A road with lane marks; its own build group, so in the growing world it arrives with its step."""
    s.group(o)
    s.flat([(x0, y0, 0), (x1, y0, 0), (x1, y1, 0), (x0, y1, 0)], pal.PATH, f' stroke="{pal.EDGE}" stroke-width="1" stroke-opacity="0.15"', ground=True)
    m = (y0 + y1) / 2
    for a in range(int(x0) + 1, int(x1) - 1, 2):
        s.raw(f'<polyline points="{w.pts((a, m, 0), (a + 1, m, 0))}" fill="none" stroke="{pal.EDGE}" stroke-width="1.5" stroke-opacity="0.35"/>')
    s.end()


def ring(s, r, o):
    s.group(o)
    s.raw(disc_arcs(w, r, *s.disc[:2], attrs=f'fill="none" stroke="{ORANGE}" stroke-width="2" stroke-dasharray="6 6" stroke-opacity="0.8"'))
    s.end()


def mini_hq(s, o):
    """The office, small, in the back-right of the scene: where everyone else connects to."""
    building(s, 2.25, 4.25, -5.0, -3.0, 2, o, lit={1: {('r', 0)}}, door_on=False, roof_unit=False)   # inside the disc
    return (3.25, -3.0, 0)


# ---- the five scenes -----------------------------------------------------------------------------
def office():
    s = Scene('office', 'Your office: one building, people at the door', (0, 0, 7))
    trees(s, [(-4.5, 3.5, 'big'), (4.0, -4.0, 'small')], 3)
    dp, top = building(s, -2.5, 2.5, -2.5, 2.5, 2, 0, lit={0: {('r', 1)}, 1: {('r', 0), ('l', 2)}})
    for k, (x, y) in enumerate([(-0.75, 3.75), (0.5, 4.0), (1.5, 3.5)]):
        person(s, x, y, 4 + k)
    s.anchor('a', (dp[0], dp[1] + 0.5, 2.0))
    s.anchor('b', top)
    return s


def home():
    s = Scene('home', 'Working from home: a house with a lit window, linked to the office', (0, 0, 7))
    hq = mini_hq(s, 0)
    link(s, [(3.25, -2.75), (3.25, 0.5), (1.75, 0.5)], 2)
    dp, ridge = house(s, -2.0, 1.5, -1.25, 2.25, 3)
    person(s, 0.75, 3.25, 5)
    trees(s, [(-4.25, 3.5, 'big'), (3.5, 3.5, 'small')], 5)
    s.anchor('a', ridge)
    s.anchor('b', (1.5, -0.25, 1.5))
    return s


def road_scene():
    s = Scene('road', 'On the road: a car and a café, linked to the office', (0, 0, 7.5))
    road(s, -6.5, 6.5, 0.25, 2.75)
    hq = mini_hq(s, 0)
    link(s, [(3.25, -2.75), (3.25, -1.0), (-2.25, -1.0), (-2.25, 0.25)], 2)
    cp = car(s, -4.25, 0.75, 3)
    s.group(5)
    s.box((-0.5, 0.25, 4.75, 5.5, 0, 0.75), FACES)                    # café table (behind the café on screen: drawn first)
    s.end()
    building(s, 1.5, 4.5, 3.75, 6.0, 1, 4, lit={0: {('r', 0)}}, roof_unit=False)
    person(s, -1.5, 5.0, 6)
    s.anchor('a', cp)
    s.anchor('b', (3.0, 4.875, STOREY))
    return s


def second():
    s = Scene('second', 'A second office: two buildings linked by a cable', (0, 0, 7.5))
    _dp, hq_top = building(s, -5.5, -2.5, -1.5, 1.5, 3, 0, lit={1: {('r', 0)}, 2: {('l', 1)}})
    link(s, [(-2.25, 0.0), (2.5, 0.0), (2.5, -0.75)], 3)
    dp, top = building(s, 1.5, 5.0, -4.75, -1.25, 2, 4, lit={0: {('r', 1)}, 1: {('r', 0)}})
    person(s, 2.75, -0.5, 6)
    person(s, 3.75, -0.25, 7)
    trees(s, [(-2.5, 4.5, 'big'), (5.0, 3.0, 'small')], 6)
    s.anchor('a', (0.25, 0.0, 0))
    s.anchor('b', top)
    return s


def everything():
    s = Scene('all', 'All of it: the office in the middle, a home, a car, a second office and the cloud, inside a ring', (0, 0, 8.5))
    link(s, [(-1.5, 0.0), (-4.0, 0.0), (-4.0, 3.0)], 5)
    link(s, [(0.0, 1.75), (0.0, 4.5), (2.5, 4.5)], 5)
    link(s, [(1.75, -0.5), (3.75, -0.5), (3.75, -3.0)], 5)
    building(s, 3.0, 5.5, -6.0, -3.5, 2, 4, lit={1: {('r', 0)}}, roof_unit=False)
    _dp, top = building(s, -1.5, 1.5, -1.5, 1.5, 2, 0, lit={1: {('r', 0)}})
    house(s, -5.5, -3.5, 3.0, 5.0, 2, lit=True)
    road(s, 1.5, 6.5, 4.75, 6.5)
    car(s, 2.5, 5.0, 4)
    ring(s, 7.75, 7)
    s.group(6)
    (bx, by), (tx, ty) = w.p(0, 0, top[2] + 0.5), w.p(0, 0, 7.75)
    s.raw(f'<polyline points="{fmt(bx)},{fmt(by)} {fmt(tx)},{fmt(ty)}" fill="none" stroke="{BLUE}" stroke-width="2" stroke-dasharray="4 4"/>')
    s.end()
    cl = cloud(s, 0, 0, 7.75, 6)
    s.anchor('a', (5.5, 5.5, 0))
    s.anchor('b', cl)
    return s


RING = 8.25                           # the security ring round the whole business (world units); the dome sits on it


def dome(s, R, o):
    """The finale: a glass dome over the ring. A hemisphere in true iso: its outline is the top half of a circle as
    wide as the ring's ellipse, closed by the ring's front half. Two latitude rings, a third and two thirds up."""
    s.group(o)
    cx, cy = w.p(0, 0, 0)
    rx, ry = R * w.u * 1.5 ** 0.5, R * w.u / 2 ** 0.5
    top = f'M{fmt(cx - rx)},{fmt(cy)}A{fmt(rx)},{fmt(rx)} 0 0 1 {fmt(cx + rx)},{fmt(cy)}'
    s.raw(f'<linearGradient id="grow-dome" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{pal.SKY}" stop-opacity="0.3"/>'
          f'<stop offset="1" stop-color="{pal.SKY}" stop-opacity="0.05"/></linearGradient>')
    s.raw(f'<path class="dome" d="{top}A{fmt(rx)},{fmt(ry)} 0 0 1 {fmt(cx - rx)},{fmt(cy)}Z" fill="url(#grow-dome)"/>')
    LAT = (1 / 3, 2 / 3)
    for k in LAT:
        h = R * k
        s.raw(ellipse(w, (R * R - h * h) ** 0.5, 0, 0, h, f'class="dome-lat" fill="none" stroke="{pal.SKY}" stroke-width="1.2" stroke-opacity="0.35"'))
    # light running round those rings, so they look like they turn: drawn and moved by the page (it knows the sums)
    s.raw(f'<g class="dome-orbit" data-r="{R}" data-lat="{",".join(f"{k:.4f}" for k in LAT)}" data-u="{w.u}" data-ox="{w.ox}" data-oy="{w.oy}" '
          f'fill="none" stroke="{pal.SKY}" stroke-linecap="round"></g>')
    s.raw(f'<path class="dome-rim" d="{top}" fill="none" stroke="{pal.SKY}" stroke-width="2" stroke-opacity="0.85"/>')
    s.end()
    s.points.append((cx, cy - rx))
    return (0, 0, R)


def world():
    """One world that grows in six steps: 1 the office, 2 a home, 3 the road (a car and a café), 4 a second office,
    5 the ring and the cloud over all of it, 6 the dome over the ring. Every part carries data-s, the step it arrives
    on; nothing moves or rebuilds, later steps only add. Drawn back to front whatever the step (painter order).
    The ring lies on the ground under everything, and everything stands inside it."""
    s = Scene('world', 'A business that grows: the office, a home, a car and café, a second office, the cloud over it all, and a dome that protects it', (0, 0, 9))
    s.whole_grid = True
    st = lambda n: setattr(s, 'step', n)
    # the glow a step's new parts wear while they arrive (grow.css .pc.glow)
    s.raw(f'<defs><filter id="grow-glow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="0" stdDeviation="4" '
          f'flood-color="{ORANGE}" flood-opacity="0.95"/></filter></defs>')
    # on the ground, under everything: the ring, then the cables and the road
    st(5); ring(s, RING, 0)
    st(2); link(s, [(-1.5, 0.0), (-4.5, 0.0), (-4.5, 2.75)], 1)
    st(3); link(s, [(1.0, 2.0), (1.0, 4.25)], 2)
    st(4); link(s, [(1.75, -0.75), (3.0, -0.75), (3.0, -2.75)], 2)
    st(3); road(s, 0.25, 4.75, 4.25, 6.0)
    # back to front
    st(1); trees(s, [(-1.0, -6.5, 'small'), (-6.0, -2.0, 'big')], 2)
    st(4); _d4, top4 = building(s, 2.5, 5.0, -5.5, -3.0, 2, 0, lit={0: {('r', 0)}, 1: {('r', 0)}}, roof_unit=False)
    st(1); dp1, top1 = building(s, -1.5, 1.5, -1.5, 1.5, 2, 0, lit={0: {('r', 1)}, 1: {('r', 0), ('l', 1)}})
    st(4); person(s, 3.5, -2.25, 3); person(s, 4.5, -2.0, 4)
    st(3); _d3, top3 = building(s, 4.0, 5.5, 1.75, 3.25, 1, 0, lit={0: {('r', 0)}}, door_on=True, roof_unit=False)
    st(1); person(s, -0.5, 2.25, 3); person(s, -1.25, 2.5, 4)
    st(2); person(s, 0.25, 2.75, 3)                                     # the team grows at the office too
    st(2); _d2, ridge = house(s, -5.5, -3.5, 3.0, 5.0, 0, lit=True)
    st(2); person(s, -4.25, 5.5, 2)
    st(3); cp = car(s, 0.75, 4.5, 1)
    st(3); person(s, 4.25, 4.5, 3)                                      # the salesperson, out of the car
    # the cloud's cable: straight up from the roof (in front of the roof unit) into the cloud's bottom corner, a dot at
    # each end. The cloud sits so that corner (x + 1.75, y + 1) is on the cable's line (x - y = 0 on screen); the cable
    # rises until it meets it on screen: (0.75 + 0.75) / 2 - z = (1.25 + 1.25) / 2 - 6.5, so z = 6.0.
    CLOUD = (-0.5, 0.25, 6.5)
    st(5); s.group(1)
    (bx, by), (tx, ty) = w.p(0.75, 0.75, top1[2]), w.p(0.75, 0.75, 6.0)
    s.raw(f'<polyline points="{fmt(bx)},{fmt(by)} {fmt(tx)},{fmt(ty)}" fill="none" stroke="{BLUE}" stroke-width="2" stroke-dasharray="4 4"/>')
    s.end()
    cl = cloud(s, *CLOUD, 2)                                            # low enough to sit under the dome
    st(5); s.group(3)
    for X, Y in ((bx, by), (tx, ty)):
        s.raw(f'<circle class="node" cx="{fmt(X)}" cy="{fmt(Y)}" r="3.5" fill="{BLUE}" stroke="{INK}" stroke-width="1.5"/>')
    s.end()
    st(6); dm = dome(s, RING, 0)
    s.step = None
    s.anchors.update({
        's1a': (1.5, 0.0, 1.5), 's1b': top1,          # s1a on the office's right wall, clear of the people at the door
        's2a': ridge, 's2b': (-3.5, 3.75, 1.0),
        's3a': cp, 's3b': (4.75, 2.5, STOREY),
        's4a': (3.0, -1.75, 0), 's4b': top4,
        's5a': (-5.75, 5.75, 0), 's5b': cl,
        's6a': dm, 's6b': (5.8, -5.8, 0),
    })
    return s


SCENES = {'office': office, 'home': home, 'road': road_scene, 'second': second, 'all': everything, 'world': world}


# ---- writing -------------------------------------------------------------------------------------
def render(s):
    BOXES.clear()
    cx, cy, r = s.disc
    # floor lines stop under what stands on them, except in the growing world: there parts arrive one step at a time,
    # so a cut-out would show as a blank patch until its part is built; they're opaque and cover the lines anyway
    mask = Polygon() if s.whole_grid or not s.ground else unary_union(s.ground)
    body = [floor_grid(w, (cx, cy), r, mask, phase=(0.5, 0.5)) + disc_arcs(w, r, cx, cy)]
    for op in s.ops:
        if op[0] == 'raw':
            body.append(op[1])
        else:
            _k, b, cols, edge = op
            body += draw_box(w, b, cols, edge, log=BOXES)
    for k, p in s.anchors.items():
        X, Y = w.p(*p)
        body.append(f'<circle class="tg-a" data-a="{k}" cx="{fmt(X)}" cy="{fmt(Y)}" r="0"/>')
    # square frame round the disc and everything drawn
    rx, ry = r * w.u * 1.5 ** 0.5, r * w.u / 2 ** 0.5
    X0, Y0 = w.p(cx, cy)
    pts = s.points + [(X0 - rx, Y0), (X0 + rx, Y0), (X0, Y0 - ry), (X0, Y0 + ry)]
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    side = max(max(xs) - min(xs), max(ys) - min(ys)) + 2 * PAD
    mx, my = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    crop = (round(mx - side / 2, 1), round(my - side / 2, 1), round(side, 1), round(side, 1))
    return doc(s.title, body, view=(SIZE, SIZE), crop=crop)


def build(name):
    return render(SCENES[name]())


SITE = pathlib.Path(__file__).resolve().parent.parent / 'src' / 'components' / 'home' / 'grow-world.svg'
SCENE_NAMES = ['office', 'home', 'road', 'second', 'all']   # the mockups' separate scenes (editing-room/grow-options)

if __name__ == '__main__':
    write(SITE, build('world'), card_cut=False)
    print(SITE.name)
    if len(sys.argv) > 1:
        out = pathlib.Path(sys.argv[1])
        out.mkdir(parents=True, exist_ok=True)
        for name in SCENE_NAMES:
            write(out / f'{name}.svg', build(name), card_cut=False)
            print(f'{name}.svg')
