"""Generic geometry checks.
usage: python check.py <svgfile> [startline endline] [--step PX]   (lines for inline svg inside html)
Reports:
  (exits 1 on any finding; DOT lines only list where each leader dot sits; the floor grid, class="floor" on a shape or
   its group, is skipped: it is clipped round the objects, so its ends sit a hair from their edges by design)
  ANGLE  edges that are close to (but not exactly on) an iso axis (30/150/90 deg)
  SNAP   vertices of different shapes that almost (not exactly) coincide (two shapes on one source line count too)
  TJOIN  vertices that almost (not exactly) touch another shape's edge
  A vertex (or the part of an edge) that sits inside an opaque filled face drawn later can't be seen, so a near-miss
  there is not reported (SNAP or TJOIN).
  DOT    leader dots (.co circles) and what filled faces they sit on
Leader lines (in a .co group) and class="mark" (arrowheads, routes, 2D markers) cross the drawing on purpose, so
none of ANGLE, SNAP or TJOIN reads them; class="free" (parts tilted on purpose) skips ANGLE only.
Two narrow exceptions, both opt-in by the drawing:
  <g class="curve">  a curved surface cut into flat strips (the hero cloud's side wall). Its strips are not iso
                     edges (no ANGLE) and their outline points sit a couple of px apart by design, so SNAP and TJOIN
                     skip pairs where both shapes are in curve groups. Pairs with any other shape are still checked.
  --step PX          the drawing's props sit on a grid whose step renders under 2px (office: 0.0625 x 28.127 =
                     1.758px), so parts one step apart look like near-misses. A SNAP pair exactly one step apart
                     along an iso axis (within the 0.1px rounding of the file) is counted, not listed.
"""
import sys, math
from iso import load, classify
from shapely.geometry import Polygon, Point

def get_text(argv):
    t = open(argv[1], encoding='utf-8').read()
    if len(argv) > 3:
        lines = t.split('\n')[int(argv[2])-1:int(argv[3])]
        t = '\n'.join(lines)
        t = t[t.index('<svg'):]
    return t

def is_ui(sh):
    # skip 2D UI (rects/labels, curved paths, matrix-mapped icons)
    if sh.tag in ('rect', 'text', 'circle', 'ellipse'): return True
    if sh.curved: return True
    if any(len(sub) > 10 for sub in sh.subs): return True   # polyline curve approximations (rings, discs)
    if abs(sh.m[1]) > 1e-6 or abs(sh.m[2]) > 1e-6: return True   # icon mapped with matrix
    return False

def group_classes(sh):
    p = sh.el.getparent()
    return set((p.get('class') or '').split()) if p is not None else set()

def own_classes(sh):
    return set((sh.a.get('class') or '').split())

def is_leader(sh):
    return 'co' in group_classes(sh)

def is_curve(sh):
    return 'curve' in group_classes(sh)

def one_step(p, q, step):
    # q - p is one grid step along an iso axis: vertical, or 30 deg either side of horizontal
    dx, dy = q[0] - p[0], q[1] - p[1]
    for ax, ay in ((0, 1), (math.cos(math.pi / 6), 0.5), (math.cos(math.pi / 6), -0.5)):
        along, across = dx * ax + dy * ay, dx * ay - dy * ax
        if abs(abs(along) - step) < 0.15 and abs(across) < 0.15:
            return True
    return False

def is_floor(sh):
    # class="floor" on the shape or its group: the floor grid, clipped where objects stand, so its ends stop a hair
    # from their edges on purpose
    return 'floor' in own_classes(sh) | group_classes(sh)

def is_mark(sh):
    # class="mark": arrowheads, routes and other 2D markers drawn over the scene
    return 'mark' in own_classes(sh)

def is_free(sh):
    # class="free": parts tilted on purpose, like a laptop lid
    return 'free' in own_classes(sh)

def occluders(shapes):
    """Opaque filled faces in drawing order: (order, shape, polygon)."""
    out = []
    for k, s in enumerate(shapes):
        a = s.a
        if not (s.closed and s.subs and len(s.subs[0]) >= 3) or a.get('fill') == 'none' or is_leader(s) or is_mark(s):
            continue
        if min(float(a.get('fill-opacity', 1)), float(a.get('opacity', 1))) < 1:
            continue
        out.append((k, s, Polygon(s.subs[0]).buffer(0)))
    return out

def hidden(p, s, faces, order):
    """p is covered by an opaque face drawn after shape s (other than s), at least 0.15px inside it."""
    P = Point(p)
    return any(k > order[id(s)] and f is not s and poly.contains(P) and poly.exterior.distance(P) >= 0.15
               for k, f, poly in faces)

def main():
    argv, step = list(sys.argv), None
    if '--step' in argv:
        i = argv.index('--step'); step = float(argv[i + 1]); del argv[i:i + 2]
    text = get_text(argv)
    off = int(argv[2]) - 1 if len(argv) > 3 else 0
    _, shapes = load(text)
    geo = [s for s in shapes if s.subs and not is_ui(s) and not is_floor(s)]
    faces, order = occluders(shapes), {id(s): k for k, s in enumerate(shapes)}
    out = []
    # ANGLE
    for s in geo:
        if is_leader(s) or is_mark(s) or is_free(s) or is_curve(s): continue   # leaders, markers, tilted parts and curves are off-axis by design
        for p, q in s.edges():
            k, d, o, ln = classify(p, q)
            if k is None or ln < 3: continue
            hor = min(abs(math.degrees(math.atan2(q[1]-p[1], q[0]-p[0])) % 180), 180 - abs(math.degrees(math.atan2(q[1]-p[1], q[0]-p[0])) % 180))
            if 0.12 < o and d < 10 and ln > 3:
                out.append(f'ANGLE L{s.line+off} {s.tag} {k} off={o:.2f}px ang_err={d:.2f} len={ln:.1f} {p[0]:.1f},{p[1]:.1f}->{q[0]:.1f},{q[1]:.1f}')
    # SNAP and TJOIN: leaders and marks cross the drawing by design
    solid = [not (is_leader(s) or is_mark(s)) for s in geo]
    verts = []
    for i, s in enumerate(geo):
        if not solid[i]: continue
        for sub in s.subs:
            for p in sub: verts.append((p, i))
    grid = {}
    for v in verts:
        grid.setdefault((int(v[0][0]//3), int(v[0][1]//3)), []).append(v)
    seen = set(); stepped = 0
    for (gx, gy), vs in grid.items():
        cand = []
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1): cand += grid.get((gx+dx, gy+dy), [])
        for a in vs:
            for b in cand:
                if a[1] == b[1]: continue   # by shape, not source line: one line often holds a whole box
                if is_curve(geo[a[1]]) and is_curve(geo[b[1]]): continue
                d = math.dist(a[0], b[0])
                if 0.15 < d < 2.0:
                    key = tuple(sorted([(round(a[0][0],1), round(a[0][1],1)), (round(b[0][0],1), round(b[0][1],1))]))
                    if key in seen: continue
                    seen.add(key)
                    if step and one_step(a[0], b[0], step):
                        stepped += 1; continue
                    if hidden(a[0], geo[a[1]], faces, order) or hidden(b[0], geo[b[1]], faces, order): continue
                    out.append(f'SNAP  L{geo[a[1]].line+off}/L{geo[b[1]].line+off} d={d:.2f} {a[0][0]:.1f},{a[0][1]:.1f} vs {b[0][0]:.1f},{b[0][1]:.1f}')
    # TJOIN (vertex near other shape's edge); faces that share the vertex and edge would list it twice
    tjoins = set()
    for i, s in enumerate(geo):
        if not solid[i]: continue
        for sub in s.subs:
            for p in sub:
                for j, t in enumerate(geo):
                    if j == i or not solid[j] or (is_curve(s) and is_curve(t)): continue
                    for a, b in t.edges():
                        ln = math.dist(a, b)
                        if ln < 4: continue
                        ux, uy = (b[0]-a[0])/ln, (b[1]-a[1])/ln
                        tpar = (p[0]-a[0])*ux + (p[1]-a[1])*uy
                        if tpar < 1 or tpar > ln-1: continue
                        dperp = abs((p[0]-a[0])*uy - (p[1]-a[1])*ux)
                        if 0.15 < dperp < 1.2:
                            foot = (a[0] + ux * tpar, a[1] + uy * tpar)
                            if hidden(p, s, faces, order) or hidden(foot, t, faces, order): continue
                            line = f'TJOIN L{s.line+off}->L{t.line+off} d={dperp:.2f} pt {p[0]:.1f},{p[1]:.1f}'
                            if line not in tjoins: tjoins.add(line); out.append(line)
    # DOTS
    faces = [s for s in geo if s.closed and s.fill not in ('none', '') and len(s.subs[0]) >= 3]
    for s in shapes:
        if s.tag == 'circle' and s.el.getparent() is not None and 'co' in (s.el.getparent().get('class') or '').split():
            hits = []
            for f in faces:
                try:
                    P = Polygon(f.subs[0])
                    if P.buffer(0).contains(Point(s.c)):
                        hits.append(f'L{f.line+off}:{f.fill}')
                    elif P.buffer(0).distance(Point(s.c)) < 3:
                        hits.append(f'near L{f.line+off}:{f.fill}(d={P.buffer(0).distance(Point(s.c)):.1f})')
                except Exception: pass
            out.append(f'DOT   L{s.line+off} at {s.c[0]:.1f},{s.c[1]:.1f} on: {hits[-3:]}')
    print('\n'.join(out))
    found = sum(1 for o in out if not o.startswith('DOT'))   # DOT lines list where each leader dot sits: not findings
    print(f'-- {len(geo)} geometric shapes, {found} findings' + (f', {stepped} SNAP pairs one {step}px step apart (not listed)' if step else ''), file=sys.stderr)
    return 1 if found else 0

sys.exit(main())
