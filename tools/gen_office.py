"""Draws the office floor plan from one world-space description, in these cuts, which share every shape:
  public/assets/img/office.svg        static, loaded with <img> on the Work page and as Home's no-script hero on wider screens (carries its Barlow letters)
  public/assets/img/office-card.svg   card cut: the compact cut ('compact': cropped 4:3 closer on the room, no card or
                                      badges) without its labels or their letters (isogen.card). The compact cut is not written on its own.
  public/assets/img/hero-office.svg  the hero, fetched by home.js on wide screens (page fonts apply)
  public/assets/img/hero-office-tablet.svg  tablet cut of the hero: same scene and dashes, three labels at TABLET_K
  src/components/home/hero-flows.svg  the hero's moving dashes, inlined by Hero.astro (shared by the two hero cuts)
  public/assets/img/office-compact-build.svg  the hero's phone cut, animated: the hero scene framed closer, no words;
                                         home.js writes its two captions (PHONE_*); fetched on phones (page fonts apply).
                                         Its build starts PHONE_AHEAD in, on the furnished room. With reduced motion
                                         it stands still (hero.css) and the captions come at once.
  public/assets/img/office-compact-flows.svg  its moving dashes, fetched with it and laid on top (like hero-flows.svg)
  public/assets/img/hero-office-phone.svg  the phone cut as a still, dashes in, nothing moving: Home's no-script hero on phones
usage: python tools/gen_office.py public
Edit the numbers below and run again; don't hand-edit any of them.
The hero and its tablet and phone cuts have their own floor layout for now ('hero layout' below: desk rows, lounge,
guest Wi-Fi, reception, entrance); office and compact (the card) still draw the plan above. To move them over, send them through hero_groups() too.
World: 1 unit = 28.127px, W(616.4, 240.2). Floor x 0..22, y 0..15; x runs right-down, y left-down, z up.
Chairs, monitors and desk phones are the shared kit (isoprops) at PROP_S; furniture sits on that kit's grid scaled
to this drawing (x, y in 0.125s, z in 0.0625s) so parts meet exactly or stay a clear pixel apart.
The hero's animation (classes, --d delays, data-tile) and its 3D cloud are kept as the page's JS and CSS expect:
  tools/office_parts/hero.css              the animation CSS inside the animated cuts
  tools/office_parts/hero_cloud.svg        hero only: sync lines, the cloud's group and its label (fixed screen points)
  tools/hero_cloud.py                      the cloud's shapes (face and side wall), filled in at {{CLOUD_SHAPES}}
"""
import html, json, math, pathlib, re, sys
from shapely.ops import unary_union
from iso import W, fmt
from isogen import FACES, HIGH, EDGE, FONT, silhouette, clip_out, seg_path, key_group, key_css, number_badges, hoist_styles, esc, card as card_cut, box as draw_box
from isoprops import chair, monitor, desk_phone, phone_face, screen_glass, rect, on_side
from svgfont import font_style
from hero_cloud import cloud_shapes
import palette as pal

w = W(616.4, 240.2, 28.127)
PARTS = pathlib.Path(__file__).parent / 'office_parts'


def part(name):
    """A file from office_parts/, with its {{pal:NAME}} colours filled in from palette.py."""
    text = (PARTS / name).read_text(encoding='utf-8').rstrip('\n')
    return re.sub(r'\{\{pal:(\w+)\}\}', lambda m: getattr(pal, m.group(1)), text)

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
RACKS = [18.5, 20.1]                   # x0 of each rack (LEDS and LED_ANIM are keyed by it); racks are 1.1 x 1.3 x 3.6 at y 1..2.3
RACK = (1.1, 1.0, 2.3, 3.6)            # w, y0, y1, h
RACK_SLOTS = 10                        # vent lines between slots; one LED per slot
VENT = (0.1, 1.0)                      # vent line runs from x0 + 0.1 to x0 + 1.0
LED_X = 0.875
LEDS = {18.5: 'GWWGWWGWWG', 20.1: 'WWGWWGWWGW'}   # bottom to top: G green, W white
LED_ANIM = {18.5: {0: (2800, 0), 2: (3840, -1060), 4: (3580, -2120), 6: (3320, -3180), 8: (3060, -1180)},
            20.1: {1: (3320, -1440), 3: (3060, -2500), 5: (2800, -760), 7: (3840, -780), 9: (3580, -2100)}}

# ---- Wi-Fi --------------------------------------------------------------------
CABLE_Z = 4.3125                       # cable trays run just under the ceiling (a height that clears every window and chair edge on screen)
APS = [(8.75, 8.25), (14.75, 8.25), (3.125, 12.75)]   # access point centres: a pair over the desk block (centred on it, x 6..17.5), then the Teams room. On screen a ceiling AP shows 4.5 back-left of where it hangs, so these land over open floor behind row 1; 0.625 square
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
    ((18.95, 2.3, 0.54), (944.0, 712.0), pal.AMBER, 'FIREWALL RACK', 'core switch + backups', 2800, 'right'),   # outside the room's front edge
    ((APS[2][0], APS[2][1], 4.625), (361.1, 208.7), pal.AMBER, 'WI-FI ACCESS POINT', 'Wi-Fi 6E, no dead spots', 2880),
    ((13.25, 9.25, 1.25), (634.1, 695.7), pal.SKY, 'WORKSTATIONS', 'managed + patched', 2960),
    ((WALL_T, (TV[0] + TV[1]) / 2, (TV[2] + TV[3]) / 2), (290.0, 523.7), pal.SKY, 'TEAMS ROOM', 'one-touch meeting join', 3040),
]
# compact phone cut ('compact'): a 4:3 crop in page coordinates and two labels at COMPACT_K, so at 340px wide
# titles render >= 14px and sublines >= 12px. Text sits outside the room, under its front-left edge, stepped down
# it: WORKSTATIONS first, FIREWALL RACK below and to the right of it. Both leaders run down-left and their tails
# carry on left to the words; FIREWALL RACK's crosses the open floor and leaves the room clear of the front corner.
# 4:3 rather than 3:2 so the band under the room holds both labels at full size.
COMPACT_CROP = (220, 114, 992, 744)    # the whole room and tray, no card, a band below the room for the labels
COMPACT_K = 1.86
COMPACT_LABELS = [  # dot (world), elbow (screen), colour, title, subline, side
    (LABELS[0][0], (730.0, 783.1), pal.AMBER, 'FIREWALL RACK', 'core switch + backups', 'left'),
    (LABELS[2][0], (640.3, 682.1), pal.SKY, 'WORKSTATIONS', 'managed + patched', 'left'),
]
# ---- hero layout (the hero's three cuts only for now; office, build and compact keep the plan above) ------------
# Back half, the work area: 3 desks on the back wall and 2 in front (a walkway by the meeting room), gaps between them and a 1.75-wide aisle, set right so the meeting
# room's glass doesn't hide them; a utility wall on the left (filing cabinet, printer, coffee counter); a small
# network closet (4 x 3) round the rack and UPS in the back-right corner.
# Front half, left to right: the meeting room (7.25 x 7.5, glass on its two inner sides with a door, 7 seats facing
# the screen); the entrance mat; reception beside it, facing the door; the waiting area beside reception.
# Three Wi-Fi points hung from the ceiling, each on its own cable run at ceiling height from the server closet.
HERO_WIN = ((6.75, 9.75, 12.75), 2.0, 0, 1.5, 3.75)   # back wall window starts (one centred over each desk of row A), width, -, sill, head
HERO_LEFT_WIN = ((12.25,), 1.5, 0, 1.5, 3.75)   # left wall: one window in the meeting room, past the table
HERO_DESKS = {(6.5, 0.25): 1000, (9.5, 0.25): 1100, (12.5, 0.25): 1200}    # row A, flush to the back wall
HERO_DESKS_B = {(9.5, 4.25): 1400, (12.5, 4.25): 1500}   # row B: two desks (a walkway by the meeting room); aisle y 2.5..4.25
PRINTER = [(0.375, 1.375, 4.25, 5.25, 0, 0.875), (0.5, 1.25, 4.375, 5.125, 0.875, 1.0)]   # body, lid: print nook, below the cabinet
PAPER = (0.625, 1.125, 4.5, 5.0)                # a sheet on the printer lid (x0 x1 y0 y1)
COFFEE = [(0.25, 1.25, 5.5, 7.25, 0, 1.25), (0.375, 0.875, 5.75, 6.375, 1.25, 1.875), (0.5, 0.75, 6.75, 7.0, 1.25, 1.5)]   # counter on the left wall, machine, mug
MUG = (pal.MUG_LEFT, pal.MUG_RIGHT, pal.MUG_TOP)
HERO_APS = [(15.25, 7.875), (RACKS[0] + RACK[0] / 2, 8.5), (6.5, 13.875)]
# The desks' and meeting room's points: on screen a ceiling AP shows 4.5 back-left of where it hangs, so these read
# as over the desks (10.75, 3.375) and the middle of the meeting room's box (centred left to right on screen).
# The guest point hangs at the true ceiling centre above the sofa and table, in line with the rack, so its blue
# cable runs out of the closet in one straight line.
GUEST_AP = 1                                    # index in HERO_APS drawn blue (guest network), rings at GUEST_RINGS of the staff size
GUEST_RINGS = 0.55
MEET_GLASS = (7.5, 7.5, 15.0, 4)                # meeting room glass: x = 7.5 side (out to the outer edge), y = 7.5 back; height
HERO_GLASS = (18.0, 3.25, 4)                    # network closet glass: x = 18 from the back wall to y = 3.25, then to the right edge
HERO_RACK = (2.25, 6)                           # one short rack (height, slots) on rack 1's footprint: the tray stays put
UPS = (20.0, 20.875, 1.25, 2.25, 0, 1.0)        # battery backup beside the rack
MEET_TV = (9.5, 11.75, 1.5, 3.0)                # on the left wall: y0, y1, z0, z1
CREDENZA = (0.25, 1.0, 9.5, 11.75, 0, 1.25)     # low cabinet under the screen
MEET_TABLE = (1.75, 5.75, 9.75, 11.5, 1.25)     # x0 x1 y0 y1 h: points at the screen
MEET_CHAIRS = ([(x, 9.25, '+y') for x in (2.5, 3.75, 5.0)] + [(x, 12.0, '-y') for x in (2.5, 3.75, 5.0)]
               + [(6.5, 10.625, '-x')])          # far side, near side, the end facing the screen (0.25 apart: no doubled edges)
RUG = ((17.375, 21.125, 6.625, 10.375), pal.RUG)  # waiting area, flat (x0 x1 y0 y1, fill), edges off the floor grid lines
MAT = ((9.0, 11.5, 13.875, 14.875), pal.MAT)    # entrance, flat; chevrons point in
SOFA = [(19.75, 20.5, 7.0, 7.25, 0, 1.0), (19.75, 20.5, 7.25, 9.75, 0, 0.75),     # far arm, seat,
        (19.75, 20.5, 9.75, 10.0, 0, 1.0), (20.5, 21.0, 7.0, 10.0, 0, 1.375)]     # near arm, back: faces -x, towards reception
LOW_TABLE = (18.0, 19.0, 7.75, 9.25, 0, 0.5)
PLANT_AT = (18.75, 5.0)                         # pot centre: the waiting area's back corner, by the closet, out of the doorway
POT = [(0.375, 0, 0.625), (0.5, 0.625, 0.75)]   # pot, rim: half width, z0, z1
BLADES = [(-0.375, -0.375, 1.75), (0.125, -0.375, 2.125), (-0.125, -0.125, 2.5), (-0.375, 0.125, 2.0), (0.125, 0.125, 1.625)]   # leaf blades: cell corner (0.25 square), top z
LEAF = (pal.GREEN_DARK, pal.LEAF_SHADE, pal.LEAF_LIGHT)
LEAF_EDGE = f'stroke="{pal.EDGE}" stroke-width="1" stroke-opacity="0.22"'
RECEPTION_CHAIR = (14.75, 10.5)                 # faces +y, behind the counter
COUNTER = (13.0, 16.5, 11.25, 12.25, 0, 1.25)   # beside the mat, facing the door
COUNTER_TOP = (12.75, 16.75, 11.0, 12.5, 1.25, 1.375)
RECEPTION_MON = (13.75, 12.125)                 # monitor: left end, at the back of the counter (an arm's length off), screen face y
RECEPTION_PHONE = (15.875, 11.75)               # desk phone on the counter, turned to the receptionist
MEET_DOOR = (12.25, 13.25, 3.0)                 # door in the meeting room's side glass: y0, y1, head
# Leaders run straight from the object and the tail carries on the same way to the words (no kinks, no doubling
# back): WI-FI straight up; GUEST and WORKSTATIONS on one shared diagonal (LEADER_SLOPE, dx per dy); TEAMS ROOM
# straight across; FIREWALL RACK near-straight down past the open front edge.
LEADER_SLOPE = (650.0 - 873.4) / (750.0 - 497.6)


def _along(dot, y):
    """Elbow at screen height y on the shared diagonal from the world point dot."""
    x0, y0 = w.p(*dot)
    return (x0 + LEADER_SLOPE * (y - y0), y)


_TV_DOT = (WALL_T, MEET_TV[1], (MEET_TV[2] + MEET_TV[3]) / 2)   # the screen's left edge, so the call tiles stay clear
HERO_LABELS = [((19.5, 2.3, 0.54), (1052.0, 760.0), pal.AMBER, 'FIREWALL RACK', 'core switch + backups', 2800, 'left'),
               ((*HERO_APS[0], 4.625), (w.p(*HERO_APS[0], 4.625)[0], 60.0), pal.AMBER, 'WI-FI ACCESS POINT', 'Wi-Fi 6E, no dead spots', 2880),
               ((9.75, 5.25, 1.25), _along((9.75, 5.25, 1.25), 640.0), pal.SKY, 'WORKSTATIONS', 'managed + patched', 2960),
               (_TV_DOT, (290.0, w.p(*_TV_DOT)[1]), pal.SKY, 'TEAMS ROOM', 'one-touch meeting join', 3040),
               ((*HERO_APS[GUEST_AP], 4.625), (650.0, 750.0), pal.SKY, 'GUEST WI-FI', 'separate from staff', 3120)]

# tablet cut ('tablet'): screens 600-1299px wide and under 1100px tall show the hero 440-680px wide, where 21-unit
# sublines read 8-12px. Same scene, the three main labels at TABLET_K (sublines 19 x 1.5 units: 12-13px at
# 1024-1180 wide) and the cloud's label text scaled by the same factor about its tail end.
TABLET_K = 1.5
TABLET_LABELS = [(HERO_LABELS[0][0], (1052.0, 728.0), *HERO_LABELS[0][2:]),
                 (HERO_LABELS[1][0], (HERO_LABELS[1][1][0], 70.0), *HERO_LABELS[1][2:6], 'left'),
                 (HERO_LABELS[2][0], _along(HERO_LABELS[2][0], 640.0), *HERO_LABELS[2][2:])]
TABLET_CLOUD = (842.7, -82.0)          # the cloud label's text scales about this point (its right edge, at the tail)

# phone cut ('phone'): the whole hero scene, cloud full size, framed close (PHONE_CROP), with no words drawn in it.
# home.js writes two captions over it at a fixed on-screen size: CLOUD top left (its line to the cloud, the app it
# names lit on the tray) and OFFICE bottom left (its line to each item in PHONE_ITEMS in turn). Their data rides on
# the <svg> as data-cloud and data-items (data- attributes survive SVGO; empty <text> would not).
PHONE_CROP = (240, -118, 962, 900)     # x, y, width, height: the cloud's top to the slab, room for a caption in each free corner
PHONE_CLOUD_DOT = (950.1, -36.0)       # the cloud label's dot in office_parts/hero_cloud.svg
PHONE_ITEMS = [HERO_LABELS[i] for i in (1, 2, 3, 4, 0)]   # Wi-Fi, workstations, Teams room, guest Wi-Fi, firewall rack
# The phone cut starts its build this far in (ms), so it opens on the furnished room (the last of it, the lounge,
# lands at 1750 + 450) and only the network and the cloud build in, over about 1.3 s. Started at 0, it opened on a
# bare floor slab for a second or more. The captions come as the cloud settles (3300 on the build's own clock); the
# <svg> carries that time as data-words for home.js.
PHONE_AHEAD = 2200
PHONE_WORDS = 3300 - PHONE_AHEAD
HERO_CUTS = ('hero', 'tablet', 'phone')   # the animated hero layout's three cuts

HALO = f'stroke="{pal.PAGE}" stroke-width="7" stroke-linejoin="round" paint-order="stroke"'   # page-colour halo: lines under the text break cleanly
COMPACT_TEXT_W = {'FIREWALL RACK': 194, 'WORKSTATIONS': 187.1, 'core switch + backups': 181.2, 'managed + patched': 160.4}   # measured at 24 / 19
TAIL = 40                              # level tail, px; text starts 12px past it

HIGH_EDGE = f'stroke="{pal.HI_EDGE}" stroke-width="1" stroke-opacity="0.55"'
TRAY_FACES = (pal.TRAY_LEFT, pal.TRAY_RIGHT, pal.TRAY_TOP)
TRAY_EDGE = f'stroke="{pal.SKY}" stroke-width="1.4" stroke-opacity="0.75"'
ROUND = 'stroke-linecap="round" stroke-linejoin="round"'
# what screen readers say for the drawing: plain words, as a person would describe it
TITLES = {'office': 'Drawing of an office with desks, a server rack, Wi-Fi and a cloud workspace for Microsoft 365 and Google Workspace',
          'hero': 'Drawing of an office being set up: desks, a server rack, Wi-Fi and a cloud workspace for Microsoft 365 and Google Workspace'}


# ---- small builders -------------------------------------------------------------
def poly(pts, attrs, cls=''):
    c = f'class="{cls}" ' if cls else ''
    return f'<polygon {c}points="{w.pts(*pts)}" {attrs} stroke-linejoin="round"/>'


def line(pts, attrs, pre=''):
    if 'pathLength' in pre:            # pathLength is valid on <path> but not on <polyline> (W3C checker)
        return f'<path {pre}d="M{w.pts(*pts).replace(" ", " L")}" fill="none" {attrs}/>'
    return f'<polyline {pre}points="{w.pts(*pts)}" fill="none" {attrs}/>'


BOXES = []                             # every box drawn, in order (rules_office.py reads it for painter.py)


def box(b, cols=FACES, edge=EDGE, classes=('', '', '')):
    return draw_box(w, b, cols, edge, classes, ' stroke-linejoin="round"', log=BOXES)


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


def screen_ui(scr, accent=pal.SKY):
    """A small app on a desk monitor: a lit header bar and two text lines, sized to the glass."""
    _f, _xyz, wd, ht = scr
    return (rect(0.06, 0.06, wd - 0.12, ht * 0.2, accent, 0.03, ' fill-opacity="0.55"')
            + rect(0.06, ht * 0.42, wd * 0.62, ht * 0.11, pal.EDGE, 0.03, ' fill-opacity="0.35"')
            + rect(0.06, ht * 0.64, wd * 0.42, ht * 0.11, pal.EDGE, 0.03, ' fill-opacity="0.25"'))


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
    out += [(x, x + RACK[0], RACK[1], RACK[2], 0, RACK[3]) for x in RACKS]
    s, t, z = AP
    out += [(x - s / 2, x + s / 2, y - s / 2, y + s / 2, z, z + t) for x, y in APS]   # hung high, but they hide the floor behind them
    return out


def floor(v, zone=ZONE):
    X, Y = FLOOR
    out = box((0, X, 0, Y, -SLAB, 0), (pal.LEFT, pal.RIGHT, pal.WINDOW))
    segs = [(w.p(k, 0), w.p(k, Y)) for k in range(X + 1)] + [(w.p(0, k), w.p(X, k)) for k in range(Y + 1)]
    if v in ('office', 'compact'):   # static: floor lines stop where something stands on them (animated versions keep them: things drop in)
        mask = unary_union([silhouette(w, *b) for b in solids()] + (compact_gaps() if v == 'compact' else []))
        segs = [s for p, q in segs for s in clip_out(p, q, mask)]
    out.append(seg_path(segs, f'class="floor" fill="none" stroke="{pal.GRID}" stroke-width="0.8" stroke-opacity="0.55" {ROUND}'))   # class: check.py
    if zone:
        out.append(line(zone, f'stroke="{pal.SKY}" stroke-width="1" stroke-opacity="0.4" {ROUND} stroke-dasharray="6 4"'))
    return out


def windows(n, plane, win=WIN):
    """n windows from first at pitch; or, when first is a tuple, one window at each start in it (n unused)."""
    first, width, pitch, sill, head = win
    starts = first if isinstance(first, tuple) else [first + i * pitch for i in range(n)]
    out, mullions = [], []
    for a in starts:
        out.append(poly(plane(a, a + width, sill, head), f'fill="{pal.WINDOW}" fill-opacity="0.55" stroke="{pal.SKY}" stroke-width="0.9" stroke-opacity="0.5"'))
        m = plane(a + width / 2, a + width / 2, sill, head)
        mullions.append(line([m[0], m[3]], f'stroke="{pal.SKY}" stroke-width="0.7" stroke-opacity="0.4" {ROUND}'))
    return out + mullions


def back_wall(n=BACK_WINDOWS, win=WIN):
    return box((0, FLOOR[0], 0, WALL_T, 0, WALL_H)) + windows(n, lambda a, b, z0, z1: wall_y(WALL_T, a, b, z0, z1), win)


def left_wall(n=LEFT_WINDOWS, win=WIN, tv=TV, call=False):
    out = box((0, WALL_T, WALL_T, FLOOR[1], 0, WALL_H)) + windows(n, lambda a, b, z0, z1: wall_x(WALL_T, a, b, z0, z1), win)
    y0, y1, z0, z1 = tv
    out.append(poly(wall_x(WALL_T, y0, y1, z0, z1), f'fill="{pal.AMBER}" fill-opacity="0.14" stroke="{pal.AMBER}" stroke-width="1.4" stroke-opacity="0.95"'))
    return out + ([call_tiles(tv)] if call else [])


def call_tiles(tv):
    """A meeting on the screen: 2 x 2 people tiles (head and shoulders), the one speaking lit orange."""
    y0, y1, z0, z1 = tv
    m = 0.1
    tw, th = (y1 - y0 - 3 * m) / 2, (z1 - z0 - 3 * m) / 2
    out = []
    for k in range(4):
        u, v = m + (k % 2) * (tw + m), m + (k // 2) * (th + m)
        cx, cy = u + tw / 2, v + th / 2
        lit = k == 1
        out.append(rect(u, v, tw, th, pal.APP_BAR, 0.05))
        out.append(f'<circle cx="{cx:.4g}" cy="{cy - 0.07:.4g}" r="0.1" fill="{pal.AMBER if lit else pal.SKY}" fill-opacity="0.85"/>')
        out.append(f'<path d="M{cx - 0.17:.4g} {v + th - 0.04:.4g}a0.17 0.15 0 0 1 0.34 0z" fill="{pal.AMBER if lit else pal.SKY}" fill-opacity="0.85"/>')
    return f'<g transform="{on_side(w, WALL_T, y1, z1)}">' + ''.join(out) + '</g>'


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


def cabinet(c=CABINET):
    """Filing cabinet with drawer lines on its front (x1) face."""
    x0, x1, y0, y1, z0, z1 = c
    out = box(c)
    step = (z1 - z0) / DRAWERS
    for k in range(1, DRAWERS):
        out.append(line([(x1, y1 - 0.25, z0 + k * step), (x1, y0 + 0.25, z0 + k * step)], f'stroke="{pal.EDGE}" stroke-width="0.8" stroke-opacity="0.35" {ROUND}'))
    for k in range(DRAWERS):
        out.append(line([(x1, (y0 + y1) / 2 + 0.25, z0 + (k + 0.55) * step), (x1, (y0 + y1) / 2 - 0.25, z0 + (k + 0.55) * step)],
                        f'stroke="{pal.EDGE}" stroke-width="1.2" stroke-opacity="0.5" {ROUND}'))
    return out


def glass_back(g=GLASS):
    x, y, h = g
    return [poly(wall_x(x, WALL_T, y, 0, h), f'fill="{pal.SKY}" fill-opacity="0.09" stroke="{pal.SKY}" stroke-width="1" stroke-opacity="0.5"')]


def glass_front(g=GLASS):
    x, y, h = g
    return [poly(wall_y(y, x, FLOOR[0], 0, h), f'fill="{pal.SKY}" fill-opacity="0.09" stroke="{pal.SKY}" stroke-width="1" stroke-opacity="0.5"'),
            line([(x, y, 0), (x, y, h)], f'stroke="{pal.SKY}" stroke-width="1.6" stroke-opacity="0.7" {ROUND}')]


def rack(x0, v, h=RACK[3], slots=RACK_SLOTS):
    rw, y0, y1, _h = RACK
    slot = h / slots
    out = box((x0, x0 + rw, y0, y1, 0, h), HIGH, HIGH_EDGE)
    for k in range(1, slots):                  # vents between slots, bottom up
        z = k * slot
        out.append(line([(x0 + VENT[0], y1, z), (x0 + VENT[1], y1, z)], f'stroke="{pal.VENT}" stroke-width="0.9" stroke-opacity="0.45" {ROUND}'))
    for k, c in enumerate(LEDS[x0][:slots]):
        X, Y = w.p(x0 + LED_X, y1, slot * (k + 0.5))
        anim = LED_ANIM[x0].get(k)
        pre = f'class="ob-led" style="animation-duration:{anim[0]}ms;animation-delay:{anim[1]}ms" ' if anim and v != 'office' else ''
        out.append(f'<circle {pre}cx="{fmt(X)}" cy="{fmt(Y)}" r="1.8" fill="{pal.GREEN if c == "G" else pal.LIGHT}"/>')
    return out


def rack_top(i=0, h=RACK[3]):
    x0 = RACKS[i]
    return (x0 + RACK[0] / 2, (RACK[1] + RACK[2]) / 2, h)


def cable_pair(pts, v, base_style='', flow_style='', join=True, colour=pal.AMBER):
    j = ' stroke-linejoin="round"' if join else ''
    base = f'stroke="{colour}" stroke-width="1.4" stroke-opacity="0.5" stroke-linecap="round"{j}'
    flow = f'stroke="{colour}" stroke-width="2" stroke-opacity="0.95" stroke-linecap="round"{j}'
    if v == 'office':
        return [line(pts, base), line(pts, flow + ' stroke-dasharray="2 7"')]
    bs = f'style="{base_style}" ' if base_style else ''
    fs = f'style="{flow_style}" ' if flow_style else ''
    return [line(pts, base, f'class="ob-cable" {bs}pathLength="100" '), line(pts, flow, f'class="ob-flow" {fs}')]


def cable(ap, v, rack_h=RACK[3], colour=pal.AMBER):
    """Up from the rack to the ceiling, along x (the back wall) then out along y to the AP (straight out when the AP
    is in line with the rack)."""
    x, y, z = rack_top(0, rack_h)
    ax, ay = ap
    pts = [(x, y, z), (x, y, CABLE_Z)] + ([(ax, y, CABLE_Z)] if ax != x else []) + [(ax, ay, CABLE_Z), (ax, ay, AP[2])]   # last bit up into the AP
    return cable_pair(pts, v, colour=colour)


GUEST = (pal.GUEST_LEFT, pal.GUEST_RIGHT, pal.SKY)       # guest Wi-Fi: blue where staff is orange


def ring(ap, r, op, colour=pal.AMBER):
    return [ellipse(r, *ap, AP[2], f'stroke="{colour}" stroke-width="1.1" stroke-opacity="{op}"')]


def access_point(ap, cols=HIGH):
    s, t, z = AP
    x, y = ap
    return box((x - s / 2, x + s / 2, y - s / 2, y + s / 2, z, z + t), cols, HIGH_EDGE)


def uplink(v, rack_h=RACK[3]):
    """Straight up from the rack to the tray. In the hero the flow dashes sit on a layer above everything, so the
    line stops where it meets the tray's front-bottom edge on screen (tray depth / 2 below its underside): it still
    reads as plugged in, and nothing runs across the tray or its tiles."""
    x, y, z = rack_top(0, rack_h)
    _x0, _x1, y0, y1, _z0, _z1 = tray_box()
    top = TRAY_Z - (y1 - y0) / 2 if v in HERO_CUTS else TRAY_Z
    return cable_pair([(x, y, z), (x, y, top)], v, 'animation-duration:350ms',
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
              ('f-l', 'f-r', 'f-t') if v in HERO_CUTS else ('', '', ''))
    m = (TILE - ICON) / 2
    ox, oy = w.p(x0 + m, y0 + m, tz1 + TILE_T)
    s = ICON / 24
    a, b = math.cos(math.radians(30)) * w.u * s, w.u / 2 * s
    cls = 'class="f-ic" ' if v in HERO_CUTS else ''
    out.append(f'<g {cls}transform="matrix({a:.4f} {b:.4f} {-a:.4f} {b:.4f} {fmt(ox)} {fmt(oy)})" fill="none" stroke="{pal.ON_AMBER if lit else pal.WHITE}" '
               f'stroke-width="2.0" {ROUND}>{ICONS[TILES[i]]}</g>')   # vector-effect sits on each icon shape (it isn't inherited)
    return out


def entrance():
    """Rug under the lounge and the entrance mat, flat on the floor, with two chevrons pointing in."""
    out = [poly([(x0, y0, 0), (x1, y0, 0), (x1, y1, 0), (x0, y1, 0)], f'fill="{fill}" {LEAF_EDGE}')
           for (x0, x1, y0, y1), fill in (RUG, MAT)]
    cx = (MAT[0][0] + MAT[0][1]) / 2
    for y in (14.75, 14.5):
        out.append(line([(cx - 0.5, y, 0), (cx, y - 0.5, 0), (cx + 0.5, y, 0)], f'stroke="{pal.SKY}" stroke-width="1.4" stroke-opacity="0.55" {ROUND}'))
    return out


def lounge():
    """Waiting area: the low table, then the sofa (arm, seat, arm, back: each split so the draw order is plain)."""
    out = []
    for b in [LOW_TABLE] + SOFA:
        out += box(b)
    return out


def nook():
    """Print nook on the left wall: the filing cabinet, then the printer in front of it."""
    out = cabinet()
    for b in PRINTER:
        out += box(b)
    x0, x1, y0, y1 = PAPER
    z = PRINTER[-1][5]
    return out + [poly([(x0, y0, z), (x1, y0, z), (x1, y1, z), (x0, y1, z)], f'fill="{pal.MUG_TOP}" fill-opacity="0.8"')]


def coffee():
    """Coffee counter: the counter, the machine (a lit button on its front), a mug."""
    counter, machine, mug = COFFEE
    out = box(counter) + box(machine)
    X, Y = w.p((machine[0] + machine[1]) / 2, machine[3], machine[5] - 0.25)
    return out + [f'<circle cx="{fmt(X)}" cy="{fmt(Y)}" r="1.8" fill="{pal.AMBER}"/>'] + box(mug, MUG)


def hero_meeting():
    """Teams room: the low cabinet under the screen, far chairs, the table, near chairs."""
    x0, x1, y0, y1, h = MEET_TABLE
    out = box(CREDENZA)                        # plain: drawer lines would crowd the chairs in front of it
    for x, y, f in [c for c in MEET_CHAIRS if c[2] == '+y']:
        for _n, b in chair(x, y, f, s=PROP_S):
            out += box(b)
    out += box((x0, x1, y0, y1, 0, h))
    for x, y, f in [c for c in MEET_CHAIRS if c[2] != '+y']:
        for _n, b in chair(x, y, f, s=PROP_S):
            out += box(b)
    return out


GLASS_STYLE = f'fill="{pal.SKY}" fill-opacity="0.09" stroke="{pal.SKY}" stroke-width="1" stroke-opacity="0.5"'


def meeting_glass_back():
    """The meeting room's back glass wall (y = y0): behind the room, so drawn before it."""
    x, y0, _y1, h = MEET_GLASS
    return [poly(wall_y(y0, WALL_T, x, 0, h), GLASS_STYLE)]


def meeting_glass_front():
    """Its side glass wall (x, out to y1) with the door, and the corner post: in front of the room. A front pane
    is drawn only when y1 stops short of the floor's open edge."""
    x, y0, y1, h = MEET_GLASS
    post = f'stroke="{pal.SKY}" stroke-width="1.6" stroke-opacity="0.7" {ROUND}'
    d0, d1, dh = MEET_DOOR
    front = [poly(wall_y(y1, WALL_T, x, 0, h), GLASS_STYLE)] if y1 < FLOOR[1] else []
    return front + [poly(wall_x(x, y0, y1, 0, h), GLASS_STYLE),
            poly(wall_x(x, d0, d1, 0, dh), f'fill="{pal.SKY}" fill-opacity="0.12" stroke="{pal.SKY}" stroke-width="1.4" stroke-opacity="0.85"'),
            line([(x, y0, 0), (x, y0, h)], post)] + ([line([(x, y1, 0), (x, y1, h)], post)] if front else [])


def plant(at):
    """Pot with a rim, then upright leaf blades of different heights (a snake plant), back to front."""
    cx, cy = at
    out = []
    for h, z0, z1 in POT:
        out += box((cx - h, cx + h, cy - h, cy + h, z0, z1))
    top = POT[-1][2]
    for dx, dy, z1 in sorted(BLADES, key=lambda b: b[0] + b[1]):
        out += box((cx + dx, cx + dx + 0.25, cy + dy, cy + dy + 0.25, top, z1), LEAF, LEAF_EDGE)
    return out


def ups():
    """Battery backup beside the rack: a dark box with a lit status LED on its front."""
    x0, x1, y0, y1, z0, z1 = UPS
    X, Y = w.p((x0 + x1) / 2, y1, z1 - 0.25)
    return box(UPS) + [f'<circle cx="{fmt(X)}" cy="{fmt(Y)}" r="1.8" fill="{pal.GREEN}"/>']


def reception():
    """Receptionist's chair, the counter and its top, then a monitor and a desk phone on it."""
    out = []
    for _n, b in chair(*RECEPTION_CHAIR, '+y', s=PROP_S):
        out += box(b)
    out += box(COUNTER) + box(COUNTER_TOP)
    top = COUNTER_TOP[5]
    mon, scr = monitor(*RECEPTION_MON, top, '+y', s=PROP_S, width=MON[2], height=MON[3])
    for _n, b in mon:
        out += box(b)
    out.append(screen_glass(w, scr, screen_ui(scr)))
    ph, ph_top = desk_phone(*RECEPTION_PHONE, top, '-y', s=PROP_S)
    for _n, b in ph:
        out += box(b)
    return out + [phone_face(w, ph_top)]


def card(v):
    sx, sy, bx = CARD_LINK
    x0, _, _, y1, _, z1 = tray_box()
    ex, ey = w.p(x0, y1, z1)
    rows = [('MICROSOFT 365', 87.8, 96.4), ('GOOGLE WORKSPACE', 121.4, 130.0)]
    out = [key_group('CLOUD WORKSPACE', 'Microsoft 365 or Google Workspace'),
           f'<polyline class="lt" points="{fmt(sx)},{fmt(sy)} {fmt(bx)},{fmt(sy)} {fmt(ex)},{fmt(ey)}" fill="none" stroke="{pal.SKY}" stroke-width="1.6" stroke-opacity="0.55" stroke-dasharray="3 5" {ROUND}/>',
           f'<rect class="lt" x="503.9" y="26.8" width="347.8" height="119.2" rx="16.8" fill="{pal.SOLID}" stroke="{pal.SKY}" stroke-width="1.6" stroke-opacity="0.6"/>',
           f'<text class="lt" x="525.5" y="54.8" font-family="{FONT}" font-size="16" font-weight="600" letter-spacing="0.12em" fill="{pal.GREY}">CLOUD WORKSPACE</text>']
    for i, (name, cy, ty) in enumerate(rows):
        g = f'<g class="lt ob-swap ob-swap-{i}">' if v != 'office' else '<g class="lt">'
        out.append(f'{g}<circle cx="532.2" cy="{cy}" r="6.2" fill="{pal.GREEN}"/><text x="545.9" y="{ty}" font-family="{FONT}" font-size="24" '
                   f'font-weight="600" letter-spacing="0.06em" fill="{pal.WHITE}">{esc(name)}</text></g>')
    out.append('</g>')
    return out


def label_text(elbow, side, k=1.0):
    """(text x, title baseline, subline baseline, anchor) for a label whose tail ends at elbow."""
    ex, ey = elbow
    sign, anchor = (-1, 'end') if side == 'left' else (1, 'start')
    tx = ex + sign * TAIL
    sub_gap = 28 if k == 1 else 26 * k               # compact: a touch tighter so two lines fit under the room
    return tx + sign * 12 * k, ey + 8 * k, ey + 8 * k + sub_gap, anchor


def compact_gaps():
    """Floor lines stop around the compact labels' text."""
    from shapely.geometry import box as box_shape
    k, out = COMPACT_K, []
    for _dot, elbow, _c, title, sub, side in COMPACT_LABELS:
        x, ty, sy, anchor = label_text(elbow, side, k)
        for text, base, size in ((title, ty, 24), (sub, sy, 19)):
            wd = COMPACT_TEXT_W[text] * k
            x0, x1 = (x - wd, x) if anchor == 'end' else (x, x + wd)
            out.append(box_shape(x0 - 6, base - size * k * 0.8, x1 + 6, base + size * k * 0.3))
        ex, ey = elbow
        out.append(box_shape(min(ex, x) - 4, ey - 4, max(ex, x) + 4, ey + 4))
    return out


def label(dot, elbow, colour, title, sub, side='left', k=1.0):
    dx, dy = w.p(*dot)
    ex, ey = elbow
    sign, anchor = (-1, 'end') if side == 'left' else (1, 'start')
    tx = ex + sign * TAIL
    if k != 1.0:                                     # compact cut: bigger text, same line weights
        x, ty, sy, anchor = label_text(elbow, side, k)
        return [f'<polyline class="lt" points="{fmt(dx)},{fmt(dy)} {fmt(ex)},{fmt(ey)} {fmt(tx)},{fmt(ey)}" fill="none" stroke="{colour}" stroke-width="2.6" stroke-opacity="0.65" stroke-linejoin="round"/>',
                f'<circle class="lt" cx="{fmt(dx)}" cy="{fmt(dy)}" r="8" fill="{colour}" stroke="{pal.PAGE}" stroke-width="3.5"/>',
                f'<text class="lt" x="{fmt(x)}" y="{fmt(ty)}" font-family="{FONT}" font-size="{24 * k:.3g}" font-weight="600" letter-spacing="0.06em" fill="{colour}" text-anchor="{anchor}" {HALO}>{esc(title)}</text>',
                f'<text class="lt" x="{fmt(x)}" y="{fmt(sy)}" font-family="{FONT}" font-size="{19 * k:.3g}" font-weight="400" letter-spacing="0" fill="{pal.GREY}" text-anchor="{anchor}" {HALO}>{esc(sub)}</text>']
    return [f'<polyline class="lt" points="{fmt(dx)},{fmt(dy)} {fmt(ex)},{fmt(ey)} {fmt(tx)},{fmt(ey)}" fill="none" stroke="{colour}" stroke-width="1.8" stroke-opacity="0.6" stroke-linejoin="round"/>',
            f'<circle class="lt" cx="{fmt(dx)}" cy="{fmt(dy)}" r="6" fill="{colour}" stroke="{pal.PAGE}" stroke-width="3"/>',
            f'<text class="lt" x="{fmt(tx + sign * 12)}" y="{fmt(ey + 8)}" font-family="{FONT}" font-size="24" font-weight="600" letter-spacing="0.06em" fill="{colour}" text-anchor="{anchor}">{esc(title)}</text>',
            f'<text class="lt" x="{fmt(tx + sign * 12)}" y="{fmt(ey + 36)}" font-family="{FONT}" font-size="21" font-weight="400" letter-spacing="0" fill="{pal.GREY}" text-anchor="{anchor}">{esc(sub)}</text>',
            '']   # the blank line the retired badge left, so the drawing stays byte for byte the same


# ---- assembly -------------------------------------------------------------------
def hero_groups(v):
    """The hero's own layout (see 'hero layout' above), back to front; the air above it is shared with groups()."""
    G = [('class="ob-i ob-fade" style="--d:0ms"', floor(v, None) + entrance()),
         ('class="ob-i ob-grow" style="--d:300ms;animation-duration:480ms"', back_wall(0, HERO_WIN)),
         ('class="ob-i ob-grow" style="--d:420ms;animation-duration:480ms"', left_wall(0, HERO_LEFT_WIN, MEET_TV, call=True)),
         ('class="ob-i" style="--d:775ms"', nook()),
         ('class="ob-i" style="--d:850ms"', coffee())]
    for (cx, cy), d in HERO_DESKS.items():
        G.append((f'class="ob-i" style="--d:{d}ms"', desk(cx, cy)))
    G += [('class="ob-i ob-fade" style="--d:1700ms;animation-duration:450ms"', glass_back(HERO_GLASS)),
          ('class="ob-i ob-grow" style="--d:1500ms;animation-duration:520ms"', rack(RACKS[0], v, *HERO_RACK)),
          ('class="ob-i" style="--d:1580ms"', ups())]
    for (cx, cy), d in HERO_DESKS_B.items():
        G.append((f'class="ob-i" style="--d:{d}ms"', desk(cx, cy)))
    G += [('class="ob-i ob-fade" style="--d:1700ms;animation-duration:450ms"', glass_front(HERO_GLASS)),
          ('class="ob-i ob-fade" style="--d:650ms;animation-duration:450ms"', meeting_glass_back()),   # rows A, B are behind the room
          ('class="ob-i" style="--d:700ms"', hero_meeting()),
          ('class="ob-i ob-fade" style="--d:950ms;animation-duration:450ms"', meeting_glass_front()),
          ('class="ob-i" style="--d:1650ms"', plant(PLANT_AT)),
          ('class="ob-i" style="--d:1700ms"', reception()),
          ('class="ob-i" style="--d:1750ms"', lounge())]
    if v == 'tablet':
        return air(v, G, HERO_APS, TABLET_LABELS, HERO_RACK[0], GUEST_AP, TABLET_K)
    if v == 'phone':
        return air(v, G, HERO_APS, [], HERO_RACK[0], GUEST_AP)
    return air(v, G, HERO_APS, HERO_LABELS, HERO_RACK[0], GUEST_AP)


def phone_data():
    """The phone captions' data, for the <svg>'s data-cloud and data-items: screen points and words."""
    items = [dict(t=title, s=sub, c=colour, x=round(w.p(*dot)[0], 1), y=round(w.p(*dot)[1], 1))
             for dot, _elbow, colour, title, sub, *_rest in PHONE_ITEMS]
    return f'{PHONE_CLOUD_DOT[0]:g},{PHONE_CLOUD_DOT[1]:g}', html.escape(json.dumps(items, separators=(',', ':')))


def phone_cloud(cloud):
    """The hero cloud part for the phone cut: the cloud and its sync lines as they are, without its label (home.js
    writes the phone's cloud caption)."""
    return cloud[:cloud.index('<g class="ob-i ob-lab co lbl" data-t="CLOUD WORKSPACE"')]


def groups(v):
    """(wrapper attrs for the animated versions, shapes) in draw order, back to front."""
    if v in HERO_CUTS:
        return hero_groups(v)
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
            G.append((f'class="ob-i ob-grow" style="--d:{1500 + 80 * i}ms;animation-duration:520ms"', rack(RACKS[i], v)))
        else:
            (cx, cy), d = item
            G.append((f'class="ob-i" style="--d:{d}ms"', desk(cx, cy)))
    return air(v, G, APS, LABELS)


def air(v, G, aps, labels, rack_h=RACK[3], guest=None, scale=1.0):
    """Everything above the floor plan, appended to G: a cable to each AP, Wi-Fi (aps[guest] in blue, smaller rings),
    uplink, tray and tiles, the cloud or card, labels (at size scale)."""
    for i, ap in enumerate(aps):
        G.append((f'class="ob-i ob-n" style="--d:{1900 + 80 * i}ms"', cable(ap, v, rack_h, GUEST[2] if i == guest else pal.AMBER)))
    for k, (r, op) in enumerate(RINGS):
        for i, ap in enumerate(aps):
            G.append(((f'class="ob-i ob-ring" style="--d:{RING_D[k][i]}ms"', f'class="ob-pulse" style="animation-delay:{RING_PULSE[k][i]}ms"'),
                      ring(ap, r * GUEST_RINGS, op, GUEST[2]) if i == guest else ring(ap, r, op)))
    for i, ap in enumerate(aps):
        G.append((f'class="ob-i" style="--d:{2250 + 70 * i}ms"', access_point(ap, GUEST if i == guest else HIGH)))
    G.append(('class="ob-i ob-n" style="--d:2450ms"', uplink(v, rack_h)))
    G.append(('class="ob-i" style="--d:2500ms"', box(tray_box(), TRAY_FACES, TRAY_EDGE)))
    for i, name in enumerate(TILES):
        attrs = f'class="ob-i ob-tile" data-tile="{name}" style="--d:{2620 + 70 * i}ms"' if v in HERO_CUTS else f'class="ob-i" style="--d:{2620 + 70 * i}ms"'
        G.append((attrs, tile(i, v)))
    if v in HERO_CUTS:
        hero_cloud = part('hero_cloud.svg').replace('{{CLOUD_SHAPES}}', cloud_shapes())
        if v == 'phone':
            hero_cloud = phone_cloud(hero_cloud)
        elif scale != 1.0:                   # the cloud label's words grow about their tail end; leader and dot stay
            a = hero_cloud.index('<text class="lt"', hero_cloud.index('data-t="CLOUD WORKSPACE"'))
            b = hero_cloud.index('<g class="num">', a)
            cx, cy = TABLET_CLOUD
            hero_cloud = (hero_cloud[:a] + f'<g transform="matrix({scale:g} 0 0 {scale:g} {fmt(cx * (1 - scale))} {fmt(cy * (1 - scale))})">\n'
                          + hero_cloud[a:b] + '</g>\n' + hero_cloud[b:])
        G.append((None, [hero_cloud]))
    elif v == 'compact':                     # no cloud card: the tray and its tiles read on their own
        for (dot, elbow, colour, title, sub, side), d in zip(COMPACT_LABELS, (2800, 2960)):
            G.append((f'class="ob-i ob-lab co lbl" data-t="{esc(title)}" data-s="{esc(sub)}" style="--d:{d}ms"', label(dot, elbow, colour, title, sub, side, COMPACT_K)))
        return G
    else:
        G.append(('class="ob-i ob-lab" style="--d:3020ms"', card(v)))
    for dot, elbow, colour, title, sub, d, *side in labels:
        G.append((f'class="ob-i ob-lab co lbl" data-t="{esc(title)}" data-s="{esc(sub)}" style="--d:{d}ms"', label(dot, elbow, colour, title, sub, *side, k=scale)))
    return G


HERO_FLOWS = []                          # the hero's flow layer, filled by render('hero'); written to hero-flows.svg
PHONE_FLOWS = []                         # the animated phone cut's, filled by render('phone'); office-compact-flows.svg
PHONE_STILL = []                         # the phone cut's drawing and dashes as render('phone') draws them; phone_still()


def ahead(text, ms):
    """Every build delay (--d) moved ms earlier: a part whose delay goes negative starts part way through its
    animation, or already finished."""
    return re.sub(r'--d:(\d+)ms', lambda m: f'--d:{int(m.group(1)) - ms}ms', text)


def split_flows(body):
    """The marching dashes (stroke-dashoffset) can't be composited, so each frame repaints the whole drawing under
    them. Move them to a second svg on its own layer: same box and viewBox, drawn last. Each keeps its group's class
    and --d, so its delay is unchanged."""
    over, out, last = [], [], 0
    for m in re.finditer(r'<polyline\b[^>]*class="ob-flow"[^>]*/>', body):
        cls, d = re.findall(r'<g class="(ob-i[^"]*)"[^>]*?style="(--d:\d+ms)"[^>]*>', body[:m.start()])[-1]
        out.append(body[last:m.start()])
        last = m.end()
        over.append(f'<g class="{cls}" style="{d}">{m.group(0)}</g>')
    out.append(body[last:])
    return ''.join(out), '\n'.join(over)


def render(v):
    BOXES.clear()
    out = []
    for attrs, shapes in groups(v):
        if attrs is None:                       # hero cloud: already wrapped
            out += shapes; continue
        if v in ('office', 'compact'):
            open_, close = (('<g class="co lbl"' + attrs.split('lbl"')[1].split(' style=')[0] + '>') if 'lbl"' in attrs else '<g>'), '</g>'
        elif isinstance(attrs, tuple):
            open_, close = f'<g {attrs[0]}>\n<g {attrs[1]}>', '</g>\n</g>'
        else:
            open_, close = f'<g {attrs}>', '</g>'
        out += [open_, *shapes, close]
    body = number_badges('\n'.join(out))
    title = esc(TITLES['office' if v == 'compact' else 'hero' if v in ('phone', 'tablet') else v])
    crop = ' '.join(f'{c:g}' for c in COMPACT_CROP)
    phone_crop = ' '.join(f'{c:g}' for c in PHONE_CROP)
    if v == 'compact':
        head = f'<svg xmlns="http://www.w3.org/2000/svg" id="plain" viewBox="{crop}" width="1200" height="900" role="img" aria-label="{title}">'
        style = font_style(body) + '\n<style>svg:target .lbl{display:none}</style>'
    elif v == 'phone':                      # inlined in the page like the hero: page fonts, hero.css for the motion and the tiles
        cloud_at, items = phone_data()
        head = (f'<svg xmlns="http://www.w3.org/2000/svg" class="ob ob-phone" viewBox="{phone_crop}" width="{PHONE_CROP[2]:g}" height="{PHONE_CROP[3]:g}" '
                f'role="img" aria-label="{title}" data-cloud="{cloud_at}" data-items="{items}" data-words="{PHONE_WORDS}">')
        style = '<style>' + part('hero.css') + '</style>'
    elif v == 'office':
        head = f'<svg xmlns="http://www.w3.org/2000/svg" id="plain" viewBox="0 0 1200 800" width="1200" height="800" role="img" aria-label="{title}">'
        style = font_style(body) + '\n' + key_css()
    else:
        head = f'<svg xmlns="http://www.w3.org/2000/svg" class="ob" viewBox="0 -130 1200 930" width="1200" height="930" role="img" aria-label="{title}">'
        style = '<style>' + part('hero.css') + '</style>'
        # hidden like its two paths: the link is off (data-link="none"), so it was showing parked at -99,-99 on wide screens
        body += f'\n<circle class="ob-link-end" r="6.5" fill="{pal.ON_AMBER}" stroke="{pal.AMBER}" stroke-width="3" cx="-99" cy="-99" display="none"/>'
    flows = []
    if v in HERO_CUTS + ('phone',):
        body, over = split_flows(body)
        if v == 'phone':
            body, over = ahead(body, PHONE_AHEAD), ahead(over, PHONE_AHEAD)
            PHONE_STILL[:] = [body, over]
        over, over_css = hoist_styles(over)
        size = f'viewBox="{phone_crop}" width="{PHONE_CROP[2]:g}" height="{PHONE_CROP[3]:g}"' if v == 'phone' else 'viewBox="0 -130 1200 930" width="1200" height="930"'
        cls = 'ob-over ob-phone' if v == 'phone' else 'ob-over'   # ob-phone: compact-cuts.css shows these on phones only
        flows = [f'<svg xmlns="http://www.w3.org/2000/svg" class="{cls}" {size} aria-hidden="true" focusable="false">',
                 f'<style>{over_css}</style>', over, '</svg>']
        if v == 'hero':
            HERO_FLOWS[:] = flows
        elif v == 'phone':
            PHONE_FLOWS[:] = flows
        elif v == 'tablet':                 # the page inlines one flow layer for both hero cuts, so they must agree
            assert flows == HERO_FLOWS, 'tablet and hero dashes differ: render hero first and keep the scene the same'
    body, css = hoist_styles(body)
    if css:
        style += f'\n<style>{css}</style>'
    if v in HERO_CUTS:
        # home.js inlines these in the page, so the drawing's parts would join the accessibility tree and its labels
        # be read after the image's name. Hide them: the <svg>'s role="img" and aria-label are what a screen reader gets.
        body = f'<g aria-hidden="true">\n{body}\n</g>'
    return '\n'.join([head, f'<title>{title}</title>', style, body, '</svg>'])


def phone_still():
    """The phone cut as a still (render('phone') first): the same scene and framing with its dashes, the build
    finished and nothing moving. Phones without script show it in an <img>, so it needs none of home.js's hooks or
    the animation CSS: its style="" attributes held timings only. No words, like the phone cut."""
    body, over = PHONE_STILL
    body = re.sub(r' style="[^"]*"', '', body + '\n' + over)
    head = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{" ".join(f"{c:g}" for c in PHONE_CROP)}" '
            f'width="{PHONE_CROP[2]:g}" height="{PHONE_CROP[3]:g}" role="img" aria-label="{esc(TITLES["office"])}">')
    return '\n'.join([head, f'<title>{esc(TITLES["office"])}</title>', '<style>.ob-flow{stroke-dasharray:2 7}</style>', body, '</svg>'])


if __name__ == '__main__':
    site = pathlib.Path(sys.argv[1])
    (site / 'assets/img/office.svg').write_text(render('office') + '\n', encoding='utf-8', newline='\n')
    # the card cut: the compact one without its labels or their letters (isogen.card). The compact cut itself is
    # no longer a file: the phone hero's still is hero-office-phone.svg, below.
    (site / 'assets/img/office-card.svg').write_text(card_cut(render('compact')) + '\n', encoding='utf-8', newline='\n')
    root = pathlib.Path(__file__).resolve().parent.parent
    for v, name in (('hero', 'hero-office.svg'), ('tablet', 'hero-office-tablet.svg'), ('phone', 'office-compact-build.svg')):
        (site / 'assets/img' / name).write_text(render(v) + '\n', encoding='utf-8', newline='\n')
    (root / 'src/components/home/hero-flows.svg').write_text('\n'.join(HERO_FLOWS) + '\n', encoding='utf-8', newline='\n')
    (site / 'assets/img/office-compact-flows.svg').write_text('\n'.join(PHONE_FLOWS) + '\n', encoding='utf-8', newline='\n')
    (site / 'assets/img/hero-office-phone.svg').write_text(phone_still() + '\n', encoding='utf-8', newline='\n')
