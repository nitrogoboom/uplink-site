"""Generic geometry checks.
usage: python check.py <svgfile> [startline endline] [--step PX]   (lines for inline svg inside html)
Reports:
  (exits 1 on any finding; DOT lines only list where each leader dot sits)
  ANGLE  edges that are close to (but not exactly on) an iso axis (30/150/90 deg)
  SNAP   vertices of different shapes that almost (not exactly) coincide
  TJOIN  vertices that almost (not exactly) touch another shape's edge
  DOT    leader dots (.co circles) and what filled faces they sit on
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

def is_leader(sh):
    p = sh.el.getparent()
    return p is not None and 'co' in (p.get('class') or '').split()

def is_curve(sh):
    p = sh.el.getparent()
    return p is not None and 'curve' in (p.get('class') or '').split()

def one_step(p, q, step):
    # q - p is one grid step along an iso axis: vertical, or 30 deg either side of horizontal
    dx, dy = q[0] - p[0], q[1] - p[1]
    for ax, ay in ((0, 1), (math.cos(math.pi / 6), 0.5), (math.cos(math.pi / 6), -0.5)):
        along, across = dx * ax + dy * ay, dx * ay - dy * ax
        if abs(abs(along) - step) < 0.15 and abs(across) < 0.15:
            return True
    return False

def is_free(sh):
    # class="mark" (arrowheads, 2D markers) or class="free" (parts tilted on purpose, like a laptop lid)
    return bool({'mark', 'free'} & set((sh.a.get('class') or '').split()))

def main():
    argv, step = list(sys.argv), None
    if '--step' in argv:
        i = argv.index('--step'); step = float(argv[i + 1]); del argv[i:i + 2]
    text = get_text(argv)
    off = int(argv[2]) - 1 if len(argv) > 3 else 0
    _, shapes = load(text)
    geo = [s for s in shapes if s.subs and not is_ui(s)]
    out = []
    # ANGLE
    for s in geo:
        if is_leader(s) or is_free(s) or is_curve(s): continue   # leaders, markers, tilted parts and curves are off-axis by design
        for p, q in s.edges():
            k, d, o, ln = classify(p, q)
            if k is None or ln < 3: continue
            hor = min(abs(math.degrees(math.atan2(q[1]-p[1], q[0]-p[0])) % 180), 180 - abs(math.degrees(math.atan2(q[1]-p[1], q[0]-p[0])) % 180))
            if 0.12 < o and d < 10 and ln > 3:
                out.append(f'ANGLE L{s.line+off} {s.tag} {k} off={o:.2f}px ang_err={d:.2f} len={ln:.1f} {p[0]:.1f},{p[1]:.1f}->{q[0]:.1f},{q[1]:.1f}')
    # SNAP
    verts = []
    for i, s in enumerate(geo):
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
                if a[1] == b[1] or geo[a[1]].line == geo[b[1]].line: continue
                if is_curve(geo[a[1]]) and is_curve(geo[b[1]]): continue
                d = math.dist(a[0], b[0])
                if 0.15 < d < 2.0:
                    key = tuple(sorted([(round(a[0][0],1), round(a[0][1],1)), (round(b[0][0],1), round(b[0][1],1))]))
                    if key in seen: continue
                    seen.add(key)
                    if step and one_step(a[0], b[0], step):
                        stepped += 1; continue
                    out.append(f'SNAP  L{geo[a[1]].line+off}/L{geo[b[1]].line+off} d={d:.2f} {a[0][0]:.1f},{a[0][1]:.1f} vs {b[0][0]:.1f},{b[0][1]:.1f}')
    # TJOIN (vertex near other shape's edge)
    for i, s in enumerate(geo):
        for sub in s.subs:
            for p in sub:
                for j, t in enumerate(geo):
                    if j == i or (is_curve(s) and is_curve(t)): continue
                    for a, b in t.edges():
                        ln = math.dist(a, b)
                        if ln < 4: continue
                        ux, uy = (b[0]-a[0])/ln, (b[1]-a[1])/ln
                        tpar = (p[0]-a[0])*ux + (p[1]-a[1])*uy
                        if tpar < 1 or tpar > ln-1: continue
                        dperp = abs((p[0]-a[0])*uy - (p[1]-a[1])*ux)
                        if 0.15 < dperp < 1.2:
                            out.append(f'TJOIN L{s.line+off}->L{t.line+off} d={dperp:.2f} pt {p[0]:.1f},{p[1]:.1f}')
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
