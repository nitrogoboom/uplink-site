"""Draws the growing world (home page "grow" section) from a world-space description: the office tower, plus the
remote homes, security ring, second office, cloud and cables that join as the business grows.
Writes the inline <svg class="tg"> (src/components/home/grow-tower.svg, inlined by Grow.astro) and the reference
copy public/assets/img/tower-grow.svg.
Edit the numbers below and run again; don't hand-edit either copy.
usage: python tools/gen_tower.py public
World: 1 unit = 24px, W(262, 283.2, 24). Origin = back corner of the ground slab's top. x runs right-down, y left-down, z up.
Without script the whole world shows (all three storeys, viewBox = the level 3 camera). home.js scrubs it with the
scroll: it sets each storey's and piece's opacity and drop from its data-at (the point on the 0-3 growth scale where
it starts), moves the roof (data-storey px per missing storey), and moves the viewBox between the cameras on the <svg> (data-cam1..3, one per level).
It still sets data-floors, which picks the lit storey's colours. Tag anchors: <circle class="tg-a" data-a="...">.
Keep the classes (tg-ground, tg-floor + data-f, tg-roof, tg-front, tg-w/wl/wr/on, tg-tl/td/tb/tt) and group order.
"""
import pathlib, sys
from shapely.ops import unary_union
from shapely.geometry import Polygon
from iso import W, fmt
from isogen import FACES, HIGH, BLUE, ORANGE, INK, EDGE, FONT, silhouette, clip_out, seg_path, ellipse
from svgfont import font_style
from isoprops import on_front, on_side, rect, tree
import palette as pal
import hero_cloud

w = W(262, 283.2, 24)

# Grid: x, y in 0.25s, z in 0.125s (as tools/isoprops.py), so nothing nearly-touches.
GROUND = 11.75                        # ground slab is GROUND x GROUND, top at z = 0
GROUND_T = 0.75                       # slab thickness
GROUND_TOP = pal.WINDOW
GRID = range(0, 12)                   # ground lines at x = k and y = k
LAWN_INSET = 0.5                      # faint green tint, inset from the slab edge
B0, B1 = 1.25, 9.25                   # building footprint, x and y (8 wide, centre 5.25)
FLOOR = 3.25                          # storey height
FLOORS = 3
CORNICE = (0.25, 0.25)                # overhang each side, depth below the storey top
WIN_SPANS = [(2.25, 3.75), (4.5, 6.0), (6.75, 8.25)]  # along each wall: 1.5 wide, 1.0 margins, 0.75 gaps
WIN_Z = (1.0, 2.375)                  # sill and head, from the storey floor
WIN_ON = {1: {'r': [2]}, 2: {'l': [0, 2], 'r': [1]}, 3: {}}   # windows lit from the start (tg-on), by storey
DOOR = (4.5, 6.0, 2.125)              # on the front-left wall (y = B1), under the middle windows: x from, x to, height
AWNING = (4.25, 6.25, 0.75, 2.25, 0.125)   # x from, x to, depth out from the wall, z, thickness
STEP = (4.25, 6.25, 0.5, 0.125)       # x from, x to, depth out from the wall, height
WALK = (4.5, 6.0)                     # path from the door to the slab edge, x from, x to (door width)
WALK_LINE = (10.375, 10.5)            # thin seam across the path, y from, y to
LABEL_DOT = (B1, 1.75, 1.75)          # leader dot on the front-right wall: x, y, z above the storey floor (window middle height)
LABEL_GAP = 48.4                      # px from dot to the label pill
PILL_PAD, PILL_H = 14, 30
LABELS = [('1–10 people', 117.7), ('11–50 people', 125.8), ('51–150 people', 133.9)]   # text, pill width (px)
ROOF = (1.75, 8.75, 0.375)            # roof slab: from, to (x and y), thickness (0.5 in from the walls)
HVAC = (2.25, 4.75, 5.75, 7.75, 1.0)  # x0, x1, y0, y1, height (on the roof)
FAN = (3.0, 4.0, 6.25, 7.25, 0.25)    # centred on top of the HVAC unit
FAN_R = 0.375                         # round grille on the fan's top, with two blades across it
LOUVRES = (0.25, [0.25, 0.4375, 0.625], 0.09)   # slats on the HVAC's two front faces: inset from the ends, tops (down from its top), height
PLANTER = (5.5, 7.0, 2.5, 4.0, 0.5)   # on the roof
MAST = (7.5, 3.25)                    # at x = y = MAST[0], height above the roof
WIFI = [(9, 0.8), (16, 0.5)]          # signal arcs round the mast top: radius px, opacity
TREES = [(1.0, 10.5, 'big'), (10.5, 10.5, 'small')]   # centre x, y, kind (isoprops.tree): front-left corner and front corner
BUSH = [(0, 1.0, 0.375), (0.25, 0.5, 0.25)]   # a low mound and a smaller one on top: inset, width, height
BUSHES = [(2.0, 10.0), (3.25, 10.0), (6.25, 10.0), (7.5, 10.0),       # back corner x, y: a row each side of the path,
          (10.0, 2.25), (10.0, 3.5), (10.0, 6.0), (10.0, 7.25)]       # and two pairs along the right wall

GREEN = (pal.GREEN_MID, pal.GREEN_DARK, pal.GREEN)
GREEN_EDGE = f'stroke="{pal.EDGE}" stroke-width="1" stroke-opacity="0.22"'
AWNING_EDGE = f'stroke="{pal.HI_EDGE}" stroke-width="1" stroke-opacity="0.55"'
WALL_LINE = f'fill="none" stroke="{pal.EDGE}" stroke-width="0.8" stroke-opacity="0.3"'
TITLE = 'Isometric office that grows from one to three storeys, then gains remote staff, a second office and a cloud'

# The rest of the world, outside the tower's slab. Each piece has its own slab (PAD thick, like the ground) and an
# `at`: where it starts on the growth scale (0-1 level 1, 1-2 level 2, 2-3 level 3). home.js builds each in over
# 0.4 of a level, storeys over 0.55, so every level is finished by its whole number.
FLOOR_AT = {1: 0, 2: 1, 3: 2}         # storey -> at
HOME = (4.5, 2.75, 2.0, 1.75)         # slab size, house size (square, centred), wall height, roof rise (steep enough that no roof edge runs near an iso axis)
HOME_WIN = (0.75, 2.0, 0.75, 1.5)     # front-left window: x from, x to (from the house's x0), sill, head
HOMES = [(15.5, 2.0, 1.2, 'home-a'), (2.0, 15.5, 1.4, 'home-b'),          # slab back corner x, y; at; anchor name
         (29.5, 15.75, 2.4, None), (18.25, 27.5, 2.45, None)]
OFFICE = (16.0, 15.0, 9.0, 1.25, 2)   # slab back corner x, y; slab size; building inset; storeys
OFFICE_AT = 2.15
OFFICE_WIN = [(1.0, 2.5), (4.0, 5.5)] # along each wall, from the building's corner
RING = (0.75, 1.6)                    # security ring: gap round the tower's slab, at
CLOUD = (2.0, -2.0, 12.5, 7.0, 2.35)  # the hero's cloud (tools/hero_cloud.py), scaled down: face's bottom-left x, y, z
                                      # (the face looks down +y, the slab runs back along -y), width, at
CLOUD_GID = 'gc'                      # its gradient id prefix (the hero's own cloud uses 'hc' on the same page)
CABLES = [(1.35, [(11.75, 4.25), (15.5, 4.25)]),                            # at, path at z = 0
          (1.55, [(4.25, 11.75), (4.25, 15.5)]),
          (2.3, [(11.75, 9.0), (13.75, 9.0), (13.75, 19.5), (16.0, 19.5)]),
          (2.5, [(25.0, 18.0), (29.5, 18.0)]),
          (2.55, [(20.5, 24.0), (20.5, 27.5)])]
UPLINK_AT = 2.6                       # dashed line from the cloud down to the tower's mast
CAM_PAD = 24                          # px round each level's camera

STYLE = f'''<style>.tg-floor,.tg-roof{{transition:opacity .6s ease,transform .6s ease}}
.tg-w{{fill:{pal.GLASS};transition:fill .6s ease,fill-opacity .6s ease}}
.tg-w.tg-on{{fill:{pal.SKY};fill-opacity:.6}}
.tg-wr.tg-on{{fill-opacity:.42}}
.tg-tl{{stroke:{pal.SKY};transition:stroke .6s ease}}
.tg-td{{fill:{pal.SKY};stroke:{pal.PAGE};stroke-width:2;transition:fill .6s ease}}
.tg-tb{{fill:{pal.WINDOW};stroke:{pal.SKY};stroke-opacity:.4;stroke-width:1;transition:stroke .6s ease,stroke-opacity .6s ease}}
.tg-tt{{fill:{pal.WHITE};text-transform:uppercase;transition:fill .6s ease}}
@media (max-width:599px){{.tg-tl,.tg-td,.tg-tb,.tg-tt{{display:none}}}}
.tg[data-floors="1"] .tg-floor[data-f="2"],.tg[data-floors="1"] .tg-floor[data-f="3"],.tg[data-floors="2"] .tg-floor[data-f="3"]{{opacity:0;transform:translateY(-30px);pointer-events:none}}
.tg[data-floors="2"] .tg-roof{{transform:translateY(DROP1px)}}
.tg[data-floors="1"] .tg-roof{{transform:translateY(DROP2px)}}
.tg[data-floors="1"] .tg-floor[data-f="1"] .tg-w,.tg[data-floors="2"] .tg-floor[data-f="2"] .tg-w,.tg[data-floors="3"] .tg-floor[data-f="3"] .tg-w,.tg:not([data-floors]) .tg-floor[data-f="3"] .tg-w{{fill:{pal.HI_TOP};fill-opacity:1}}
.tg[data-floors="1"] .tg-floor[data-f="1"] .tg-wr,.tg[data-floors="2"] .tg-floor[data-f="2"] .tg-wr,.tg[data-floors="3"] .tg-floor[data-f="3"] .tg-wr,.tg:not([data-floors]) .tg-floor[data-f="3"] .tg-wr{{fill:{pal.HI_LEFT}}}
.tg[data-floors="1"] .tg-floor[data-f="1"] .tg-tl,.tg[data-floors="2"] .tg-floor[data-f="2"] .tg-tl,.tg[data-floors="3"] .tg-floor[data-f="3"] .tg-tl,.tg:not([data-floors]) .tg-floor[data-f="3"] .tg-tl{{stroke:{pal.AMBER}}}
.tg[data-floors="1"] .tg-floor[data-f="1"] .tg-td,.tg[data-floors="2"] .tg-floor[data-f="2"] .tg-td,.tg[data-floors="3"] .tg-floor[data-f="3"] .tg-td,.tg:not([data-floors]) .tg-floor[data-f="3"] .tg-td{{fill:{pal.AMBER}}}
.tg[data-floors="1"] .tg-floor[data-f="1"] .tg-tb,.tg[data-floors="2"] .tg-floor[data-f="2"] .tg-tb,.tg[data-floors="3"] .tg-floor[data-f="3"] .tg-tb,.tg:not([data-floors]) .tg-floor[data-f="3"] .tg-tb{{stroke:{pal.AMBER};stroke-opacity:.9}}
.tg[data-floors="1"] .tg-floor[data-f="1"] .tg-tt,.tg[data-floors="2"] .tg-floor[data-f="2"] .tg-tt,.tg[data-floors="3"] .tg-floor[data-f="3"] .tg-tt,.tg:not([data-floors]) .tg-floor[data-f="3"] .tg-tt{{fill:{pal.AMBER}}}
.tg-ring{{fill:{pal.AMBER};fill-opacity:.05;stroke:{pal.AMBER};stroke-opacity:.6;stroke-width:1.4;stroke-dasharray:6 7;animation:tg-dash 2.6s linear infinite}}
.tg-cable{{fill:none;stroke:{pal.AMBER};stroke-opacity:.22;stroke-width:4;stroke-linecap:round;stroke-dasharray:1 1}}
.tg-flow{{fill:none;stroke:{pal.AMBER};stroke-width:1.6;stroke-linecap:round;stroke-dasharray:4 8;animation:tg-dash 1.2s linear infinite}}
.tg-up{{fill:none;stroke:{pal.SKY};stroke-opacity:.7;stroke-width:1.2;stroke-dasharray:2 6;animation:tg-dash 1.6s linear infinite}}
.tg-float{{animation:tg-float 5s ease-in-out infinite}}
.tg-a{{fill:none}}
.tg-live .tg-floor,.tg-live .tg-roof,.tg-live .tg-p{{transition:none}}
@keyframes tg-dash{{to{{stroke-dashoffset:-12}}}}
@keyframes tg-float{{50%{{transform:translateY(-6px)}}}}
@media (prefers-reduced-motion:reduce){{.tg-floor,.tg-roof,.tg-w,.tg-tl,.tg-td,.tg-tb,.tg-tt{{transition:none!important}}.tg-ring,.tg-flow,.tg-up,.tg-float{{animation:none}}}}</style>'''


def box(x0, x1, y0, y1, z0, z1, cols=FACES, edge=EDGE):
    """A box's (left, right, top) faces. Every box goes through here so painter rules can list them (BOXES)."""
    BOXES.append((x0, x1, y0, y1, z0, z1))
    return [f'<polygon points="{pts}" fill="{c}" {edge}/>' for pts, c in zip(w.box(x0, x1, y0, y1, z0, z1), cols)]


def flat(pts, attrs):
    return f'<polygon points="{w.pts(*pts)}" {attrs}/>'


def tree_boxes(cx, cy, kind):
    return [b for _n, b in tree(cx, cy, kind)]


def bush_boxes(x0, y0):
    out, z = [], 0
    for inset, size, h in BUSH:
        out.append((x0 + inset, x0 + inset + size, y0 + inset, y0 + inset + size, z, z + h))
        z += h
    return out


def door_boxes():
    a0, a1, ad, az, at = AWNING
    s0, s1, sd, sh = STEP
    return (a0, a1, B1, B1 + ad, az, az + at), (s0, s1, B1, B1 + sd, 0, sh)


def door_front():
    """Glass double door (drawn flat on the wall), awning and step on the ground storey."""
    d0, d1, dh = DOOR
    dw = d1 - d0
    awning, step = door_boxes()
    leaf = (dw - 0.375) / 2           # two leaves, 0.125 frame each side and between
    door = [rect(0, 0, dw, dh, pal.GLASS, 0, f' stroke="{BLUE}" stroke-opacity="0.5" stroke-width="0.9" vector-effect="non-scaling-stroke"')]
    for k in range(2):
        u = 0.125 + k * (leaf + 0.125)
        door.append(rect(u, 0.125, leaf, dh - 0.25, BLUE, 0, ' fill-opacity="0.22"'))
        door.append(rect(u + (leaf - 0.1 if k == 0 else 0.04), dh * 0.5, 0.06, 0.3, pal.EDGE, 0.03, ' fill-opacity="0.7"'))
    return [f'<g transform="{on_front(w, d0, B1, dh)}">' + ''.join(door) + '</g>'] + box(*awning, HIGH, AWNING_EDGE) + box(*step)


def ground(mask):
    g = GROUND
    out = box(0, g, 0, g, -GROUND_T, 0, (FACES[0], FACES[1], GROUND_TOP))
    segs = []
    for k in GRID:
        segs += clip_out(w.p(k, 0), w.p(k, g), mask)
        segs += clip_out(w.p(0, k), w.p(g, k), mask)
    out.append(seg_path([s for s in segs if abs(s[0][0] - s[1][0]) + abs(s[0][1] - s[1][1]) >= 3],
                        f'fill="none" stroke="{pal.GRID}" stroke-width="0.8" stroke-opacity="0.5"'))
    i = LAWN_INSET
    out.append(flat([(i, i), (g - i, i), (g - i, g - i), (i, g - i)], f'fill="{pal.GREEN}" fill-opacity="0.13"'))
    out.append(flat([(WALK[0], B1), (WALK[1], B1), (WALK[1], g), (WALK[0], g)], f'fill="{FACES[2]}" fill-opacity="0.95"'))
    out.append(flat([(WALK[0], WALK_LINE[0]), (WALK[1], WALK_LINE[0]), (WALK[1], WALK_LINE[1]), (WALK[0], WALK_LINE[1])], f'fill="{FACES[0]}"'))
    return out


def windows(z0, lit):
    lo, hi = z0 + WIN_Z[0], z0 + WIN_Z[1]
    walls = [('l', lambda a, b: [(a, B1, lo), (b, B1, lo), (b, B1, hi), (a, B1, hi)]),
             ('r', lambda a, b: [(B1, a, lo), (B1, b, lo), (B1, b, hi), (B1, a, hi)])]
    spans = {'l': WIN_SPANS if z0 else [WIN_SPANS[0], WIN_SPANS[2]], 'r': WIN_SPANS}   # ground storey: door in the middle
    frames, panes = [], []
    for side, quad in walls:
        for i, (a, b) in enumerate(spans[side]):
            pts = w.pts(*quad(a, b))
            frames.append(f'<polygon points="{pts}" {WALL_LINE}/>')
            on = ' tg-on' if i in lit.get(side, []) else ''
            panes.append(f'<polygon class="tg-w tg-w{side}{on}" points="{pts}"/>')
    return frames + panes


def storey(f):
    z0 = (f - 1) * FLOOR
    o, d = CORNICE
    out = box(B0, B1, B0, B1, z0, z0 + FLOOR - d)          # walls stop under the cornice band
    out += box(B0 - o, B1 + o, B0 - o, B1 + o, z0 + FLOOR - d, z0 + FLOOR)
    out += windows(z0, WIN_ON[f])
    if f == 1:
        out += door_front()
    text, width = LABELS[f - 1]
    x, y, z = LABEL_DOT
    dx, dy = w.p(x, y, z0 + z)
    rx = dx + LABEL_GAP
    out += [f'<line class="tg-tl" x1="{fmt(dx)}" y1="{fmt(dy)}" x2="{fmt(rx)}" y2="{fmt(dy)}" stroke-width="1.2" stroke-opacity="0.7"/>',
            f'<circle class="tg-td" cx="{fmt(dx)}" cy="{fmt(dy)}" r="4"/>',
            f'<rect class="tg-tb" x="{fmt(rx)}" y="{fmt(dy - PILL_H / 2)}" width="{fmt(width)}" height="{PILL_H}" rx="8"/>',
            f'<text class="tg-tt" x="{fmt(rx + PILL_PAD)}" y="{fmt(dy + 4.5)}" font-size="13" font-weight="600" letter-spacing="0.06em">{text}</text>']
    return out


def roof():
    top = FLOORS * FLOOR
    r0, r1, rt = ROOF
    z = top + rt
    out = box(r0, r1, r0, r1, top, z)
    x0, x1, y0, y1, h = HVAC
    out += box(x0, x1, y0, y1, z, z + h)
    inset, tops, sh = LOUVRES
    for tf, length in ((on_front(w, x0, y1, z + h), x1 - x0), (on_side(w, x1, y1, z + h), y1 - y0)):
        out.append(f'<g transform="{tf}">' + ''.join(rect(inset, v, length - 2 * inset, sh, pal.SCREEN, 0, ' fill-opacity="0.7"') for v in tops) + '</g>')
    fx0, fx1, fy0, fy1, fh = FAN
    out += box(fx0, fx1, fy0, fy1, z + h, z + h + fh)
    cx, cy, cz = (fx0 + fx1) / 2, (fy0 + fy1) / 2, z + h + fh
    out.append(ellipse(w, FAN_R, cx, cy, cz, f'fill="{pal.SCREEN}" stroke="{pal.EDGE}" stroke-width="1" stroke-opacity="0.3"'))
    blades = ''.join(f'M{w.pts(a)}L{w.pts(b)}' for a, b in (((cx - FAN_R, cy, cz), (cx + FAN_R, cy, cz)), ((cx, cy - FAN_R, cz), (cx, cy + FAN_R, cz))))
    out.append(f'<path d="{blades}" fill="none" stroke="{pal.EDGE}" stroke-width="1" stroke-opacity="0.45"/>')
    px0, px1, py0, py1, ph = PLANTER
    out += box(px0, px1, py0, py1, z, z + ph, GREEN, GREEN_EDGE)
    m, mh = MAST
    (bx, by), (tx, ty) = w.p(m, m, z), w.p(m, m, z + mh)
    out.append(f'<polyline points="{fmt(bx)},{fmt(by)} {fmt(tx)},{fmt(ty)}" fill="none" stroke="{pal.EDGE}" stroke-width="1.6" stroke-opacity="0.8"/>')
    out.append(f'<circle cx="{fmt(tx)}" cy="{fmt(ty)}" r="4" fill="{ORANGE}" stroke="{INK}" stroke-width="2"/>')
    for r, o in WIFI:
        k = r / 2 ** 0.5
        out.append(f'<path d="M{fmt(tx - k)},{fmt(ty - k)} A{r},{r} 0 0 1 {fmt(tx + k)},{fmt(ty - k)}" fill="none" stroke="{BLUE}" stroke-width="1.4" stroke-opacity="{o}"/>')
    return out


def front():
    """Trees and bushes, back to front (by footprint centre x + y); a tree is trunk, canopy, top."""
    plants = [(t[0] + t[1], tree_boxes(*t), True) for t in TREES]
    plants += [(p[0] + p[1] + BUSH[0][1], bush_boxes(*p), False) for p in BUSHES]
    out = []
    for _d, boxes, trunk in sorted(plants, key=lambda q: q[0]):
        for k, bx in enumerate(boxes):
            out += box(*bx) if trunk and k == 0 else box(*bx, GREEN, GREEN_EDGE)
    return out


def floor_mask():
    """What always stands on the ground in front of it: the ground storey, its door bits, trees, bushes and the path.
    Upper storeys come and go with data-floors, so they don't hide floor lines."""
    o = CORNICE[0]
    shapes = [silhouette(w, B0, B1, B0, B1, 0, FLOOR), silhouette(w, B0 - o, B1 + o, B0 - o, B1 + o, FLOOR - CORNICE[1], FLOOR)]
    shapes += [silhouette(w, *b) for b in door_boxes()]
    shapes += [silhouette(w, *bx) for t in TREES for bx in tree_boxes(*t)]
    shapes += [silhouette(w, *bx) for p in BUSHES for bx in bush_boxes(*p)]
    shapes.append(Polygon([w.p(WALK[0], B1), w.p(WALK[1], B1), w.p(WALK[1], GROUND), w.p(WALK[0], GROUND)]))
    return unary_union(shapes)


def flat3(pts, attrs):
    return f'<polygon points="{w.pts(*pts)}" {attrs}/>'


def pad(x0, y0, size):
    """A piece's own slab: the ground's faces and lawn tint, top at z = 0."""
    x1, y1, i = x0 + size, y0 + size, LAWN_INSET
    out = box(x0, x1, y0, y1, -GROUND_T, 0, (FACES[0], FACES[1], GROUND_TOP))
    out.append(flat([(x0 + i, y0 + i), (x1 - i, y0 + i), (x1 - i, y1 - i), (x0 + i, y1 - i)], f'fill="{pal.GREEN}" fill-opacity="0.13"'))
    return out


def home_parts(x0, y0):
    """House walls x0, x1, y0, y1, wall top, ridge height, ridge y."""
    size, hs, wall, rise = HOME
    hx0, hy0 = x0 + (size - hs) / 2, y0 + (size - hs) / 2
    return hx0, hx0 + hs, hy0, hy0 + hs, wall, wall + rise, hy0 + hs / 2


def home(x0, y0):
    """A remote worker's house: slab, walls, a gable roof (ridge along x, no overhang, so every roof corner is a wall
    corner), one lit window, an online dot over the ridge."""
    hx0, hx1, hy0, hy1, zt, zr, ym = home_parts(x0, y0)
    out = pad(x0, y0, HOME[0]) + box(hx0, hx1, hy0, hy1, 0, zt)
    out.append(flat3([(hx0, hy0, zt), (hx1, hy0, zt), (hx1, ym, zr), (hx0, ym, zr)], f'fill="{pal.TOP}" {EDGE}'))
    out.append(flat3([(hx1, hy0, zt), (hx1, ym, zr), (hx1, hy1, zt)], f'fill="{pal.RIGHT}" {EDGE}'))
    out.append(flat3([(hx0, ym, zr), (hx1, ym, zr), (hx1, hy1, zt), (hx0, hy1, zt)], f'fill="{pal.LEFT}" {EDGE}'))
    a, b, lo, hi = HOME_WIN
    pts = w.pts((hx0 + a, hy1, lo), (hx0 + b, hy1, lo), (hx0 + b, hy1, hi), (hx0 + a, hy1, hi))
    out += [f'<polygon points="{pts}" {WALL_LINE}/>', f'<polygon points="{pts}" fill="{pal.HI_TOP}"/>']
    dx, dy = w.p((hx0 + hx1) / 2, ym, zr + 0.75)
    out.append(f'<circle cx="{fmt(dx)}" cy="{fmt(dy)}" r="4" fill="{ORANGE}" stroke="{INK}" stroke-width="2"/>')
    return out


def office():
    """The second office: two storeys with a cornice each, windows on both walls, roof slab and one HVAC unit."""
    x0, y0, size, inset, n = OFFICE
    b0x, b1x, b0y, b1y = x0 + inset, x0 + size - inset, y0 + inset, y0 + size - inset
    o, d = CORNICE
    out = pad(x0, y0, size)
    for f in range(n):
        z0 = f * FLOOR
        out += box(b0x, b1x, b0y, b1y, z0, z0 + FLOOR - d)
        out += box(b0x - o, b1x + o, b0y - o, b1y + o, z0 + FLOOR - d, z0 + FLOOR)
        lo, hi = z0 + WIN_Z[0], z0 + WIN_Z[1]
        for i, (a, b) in enumerate(OFFICE_WIN):
            for side, pts in (('l', w.pts((b0x + a, b1y, lo), (b0x + b, b1y, lo), (b0x + b, b1y, hi), (b0x + a, b1y, hi))),
                              ('r', w.pts((b1x, b0y + a, lo), (b1x, b0y + b, lo), (b1x, b0y + b, hi), (b1x, b0y + a, hi)))):
                lit = (f + i + (side == 'r')) % 2 == 0
                fill = f'fill="{pal.SKY}" fill-opacity="{0.6 if side == "l" else 0.42}"' if lit else f'fill="{pal.GLASS}"'
                out += [f'<polygon points="{pts}" {WALL_LINE}/>', f'<polygon points="{pts}" {fill}/>']
    top = n * FLOOR
    out += box(b0x + 0.5, b1x - 0.5, b0y + 0.5, b1y - 0.5, top, top + ROOF[2])
    z = top + ROOF[2]
    out += box(b0x + 1.0, b0x + 2.75, b0y + 1.0, b0y + 2.5, z, z + 0.875)
    return out


def ring():
    """Security ring round the tower's slab, at the slab's foot."""
    g, z = RING[0], -GROUND_T
    pts = w.pts((-g, -g, z), (GROUND + g, -g, z), (GROUND + g, GROUND + g, z), (-g, GROUND + g, z))
    return [f'<polygon class="tg-ring" points="{pts}"/>']


def cable(path):
    """A ground-level link: a soft line home.js draws in (pathLength 1), and moving dashes on top."""
    d = 'M' + ' L'.join(w.s(x, y, 0) for x, y in path)
    return [f'<path class="tg-cable" d="{d}" pathLength="1"/>', f'<path class="tg-flow" d="{d}"/>']


def cloud_fit():
    """World size of one hero-cloud plane unit, and the face's u span, v height and depth (plane units)."""
    u0, _v0, u1, v1 = hero_cloud.face().bounds
    return CLOUD[3] / (u1 - u0), u0, u1, v1, hero_cloud.DEPTH


def cloud():
    """The hero's cloud, scaled and moved into this world (a uniform scale keeps it true isometric)."""
    x0, y0, z0, _width, _at = CLOUD
    k, u0, _u1, _v1, _d = cloud_fit()
    tx, ty = w.p(x0 - u0 * k, y0, z0)                 # where the face's u = 0, v = 0 lands
    ox, oy = hero_cloud.ORIGIN
    hero_cloud.GID = CLOUD_GID
    return [f'<g transform="translate({fmt(tx)} {fmt(ty)}) scale({k * w.u:.4f}) translate({-ox:.1f} {-oy:.1f})">',
            hero_cloud.cloud_shapes(), '</g>']


def cloud_box():
    """The cloud's world box (x0, x1, y0, y1, z0, z1)."""
    x0, y0, z0, width, _at = CLOUD
    k, _u0, _u1, v1, d = cloud_fit()
    return x0, x0 + width, y0 - d * k, y0, z0, z0 + v1 * k


def uplinks():
    """Dashed line from under the cloud's left side down to the tower's mast top (the roof is in place by then)."""
    x0, x1, _y0, y1, z0, _z1 = cloud_box()
    fx, fy = w.p(x0 + (x1 - x0) / 4, y1, z0)
    tx, ty = w.p(MAST[0], MAST[0], FLOORS * FLOOR + ROOF[2] + MAST[1])
    return [f'<path class="tg-up" d="M{fmt(fx)},{fmt(fy)} L{fmt(tx)},{fmt(ty)}"/>']


def anchors():
    """Where the phone tags point (home.js reads cx, cy)."""
    hx0, hx1, _y0, _y1, _zt, zr, ym = home_parts(*HOMES[0][:2])
    x0, y0, size, _inset, n = OFFICE
    g = RING[0]
    spots = {'door': ((DOOR[0] + DOOR[1]) / 2, B1 + AWNING[2] / 2, AWNING[3] + AWNING[4]),
             'mast1': (MAST[0], MAST[0], FLOOR + ROOF[2] + MAST[1]),
             'ring': (GROUND + g, GROUND + g, -GROUND_T),
             'home-a': ((hx0 + hx1) / 2, ym, zr + 0.75),
             'office': (x0 + size / 2, y0 + size / 2, n * FLOOR + ROOF[2] + 0.875),
             'cloud': ((cloud_box()[0] + cloud_box()[1]) / 2, CLOUD[1], cloud_box()[5])}
    out = []
    for name, (x, y, z) in spots.items():
        X, Y = w.p(x, y, z)
        out.append(f'<circle class="tg-a" data-a="{name}" cx="{fmt(X)}" cy="{fmt(Y)}" r="0"/>')
    return out


def cameras():
    """One viewBox per level: everything standing at the end of that level, plus CAM_PAD."""
    cams = []
    for L in (1, 2, 3):
        P = [w.p(x, y, z) for x in (0, GROUND) for y in (0, GROUND) for z in (-GROUND_T, 0)]
        top = L * FLOOR + ROOF[2]
        P += [w.p(x, y, top + HVAC[4] + FAN[4]) for x in (B0, B1) for y in (B0, B1)]
        tx, ty = w.p(MAST[0], MAST[0], top + MAST[1])
        P += [(tx, ty - WIFI[1][0])]
        P += [w.p(t[0], t[1], 5.0) for t in TREES]
        for f in range(1, L + 1):
            dx, dy = w.p(LABEL_DOT[0], LABEL_DOT[1], (f - 1) * FLOOR + LABEL_DOT[2])
            P += [(dx + LABEL_GAP + LABELS[f - 1][1], dy - PILL_H / 2), (dx, dy + PILL_H / 2)]
        if RING[1] < L:
            g = RING[0]
            P += [w.p(x, y, -GROUND_T) for x in (-g, GROUND + g) for y in (-g, GROUND + g)]
        for x0, y0, at, _a in HOMES:
            if at < L:
                hx0, hx1, _y0, _y1, _zt, zr, ym = home_parts(x0, y0)
                P += [w.p(x, y, z) for x in (x0, x0 + HOME[0]) for y in (y0, y0 + HOME[0]) for z in (-GROUND_T, 0)]
                dx, dy = w.p((hx0 + hx1) / 2, ym, zr + 0.75)
                P += [(dx, dy - 6)]
        if OFFICE_AT < L:
            x0, y0, size, _i, n = OFFICE
            P += [w.p(x, y, z) for x in (x0, x0 + size) for y in (y0, y0 + size) for z in (-GROUND_T, n * FLOOR + 2)]
        if CLOUD[4] < L:
            x0, x1, y0, y1, z0, z1 = cloud_box()
            P += [w.p(x, y, z) for x in (x0, x1) for y in (y0, y1) for z in (z0, z1)]
        xs, ys = [q[0] for q in P], [q[1] for q in P]
        cams.append((min(xs) - CAM_PAD, min(ys) - CAM_PAD, max(xs) - min(xs) + 2 * CAM_PAD, max(ys) - min(ys) + 2 * CAM_PAD))
    return cams


def piece(at, parts, cls='tg-p'):
    return [f'<g class="{cls}" data-at="{at:g}">', *parts, '</g>']


def build(embed_font):
    BOXES.clear()
    body = piece(RING[1], ring())
    for at, path in CABLES:
        body += piece(at, cable(path), 'tg-p tg-c')
    body += piece(CLOUD[4], ['<g class="tg-float">', *cloud(), '</g>'])
    body += ['<g class="tg-ground">', *ground(floor_mask()), '</g>']
    for f in range(1, FLOORS + 1):
        body += [f'<g class="tg-floor" data-f="{f}" data-at="{FLOOR_AT[f]:g}">', *storey(f), '</g>']
    body += ['<g class="tg-roof">', *roof(), '</g>', '<g class="tg-front">', *front(), '</g>']
    for x0, y0, at, _a in sorted(HOMES[:2], key=lambda h: h[0] + h[1]):
        body += piece(at, home(x0, y0))
    body += piece(OFFICE_AT, office())
    for x0, y0, at, _a in sorted(HOMES[2:], key=lambda h: h[0] + h[1]):
        body += piece(at, home(x0, y0))
    body += piece(UPLINK_AT, uplinks())
    body += anchors()
    text = '\n'.join(body)
    cams = cameras()
    vb = ' '.join(fmt(v) for v in cams[2])
    data = ' '.join(f'data-cam{k + 1}="{" ".join(fmt(v) for v in c)}"' for k, c in enumerate(cams))
    return '\n'.join([
        f'<svg xmlns="http://www.w3.org/2000/svg" class="tg" data-floors="3" viewBox="{vb}" width="{round(cams[2][2])}" height="{round(cams[2][3])}" {data} data-storey="{FLOOR * w.u:g}" role="img" aria-label="{TITLE}">',
        f'<title>{TITLE}</title>',
        STYLE.replace('DROP1', f'{FLOOR * w.u:g}').replace('DROP2', f'{2 * FLOOR * w.u:g}')   # roof drops one storey per missing floor
        + (font_style(text) if embed_font else ''),
        f'<g font-family="{FONT}" stroke-linecap="round" stroke-linejoin="round">',
        text, '</g>', '</svg>'])


BOXES = []


if __name__ == '__main__':
    site = pathlib.Path(sys.argv[1])
    open(site / 'assets/img/tower-grow.svg', 'w', encoding='utf-8', newline='\n').write(build(True) + '\n')
    root = pathlib.Path(__file__).resolve().parent.parent
    open(root / 'src/components/home/grow-tower.svg', 'w', encoding='utf-8', newline='\n').write(build(False) + '\n')
