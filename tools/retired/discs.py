"""Report ellipse-like curves: centre, rx, ry, ratio (iso circle = 0.577)."""
import sys, re, math
from iso import load
t = open(sys.argv[1]).read()
_, shapes = load(t)
for s in shapes:
    if s.tag in ('polyline','path','polygon') and s.subs:
        pts = [p for sub in s.subs for p in sub]
        if len(pts) < 12 and not s.curved: continue
        if s.tag == 'path' and len(s.subs) > 3:   # grid disc: use the outline sub-path (longest)
            pts = max(s.subs, key=len)
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        cx = (max(xs)+min(xs))/2; rx = (max(xs)-min(xs))/2
        # cy from leftmost/rightmost points
        l = min(pts, key=lambda p: p[0]); r = max(pts, key=lambda p: p[0])
        cy = (l[1]+r[1])/2
        ry_b = max(ys)-cy; ry_t = cy-min(ys)
        print(f'L{s.line} {s.tag} n={len(pts)} c=({cx:.1f},{cy:.1f}) rx={rx:.1f} ry_bottom={ry_b:.1f} ry_top={ry_t:.1f} ratio={ry_b/rx if rx else 0:.3f}/{ry_t/rx if rx else 0:.3f} stroke={s.a.get("stroke")}')
