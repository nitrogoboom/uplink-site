"""Replace a stretched floor oval with a true iso circle (same grid, same knockouts around labels).
usage: python tools/roundify.py name   (edits site/assets/img/<name>.svg in place)
Needs site/ served on port 8765 for bboxes.js:  python tools/serve.py"""
import sys, os, re, json, math, subprocess
import numpy as np
TOOLS = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(TOOLS)
sys.path.insert(0, TOOLS)
from shapely.geometry import LineString, Polygon, box, MultiLineString
from shapely.ops import unary_union
from iso import C30, fmt

name = sys.argv[1]
path = os.path.join(ROOT, 'site', 'assets', 'img', f'{name}.svg')
t = open(path).read()
lines = t.split('\n')
g = re.search(r'translate\(([-\d.]+),([-\d.]+)\)', lines[2]); TX, TY = float(g.group(1)), float(g.group(2))
L4 = lines[3]
paths = re.findall(r'<path d="([^"]*)"([^>]*)/>', L4)
assert len(paths) == 2, len(paths)
grid_d, outline_d = paths[0][0], paths[1][0]

def to_rl(x, y):            # local screen -> floor (r,l), px units along axes
    a = x / C30; b = 2*y
    return ((a+b)/2, (b-a)/2)
def to_xy(r, l):
    return ((r-l)*C30, (r+l)/2)

# --- current oval (fit in r,l space) ---
P = []
for m in re.finditer(r'M([^M]*)', outline_d):
    P += [tuple(map(float, q.split(','))) for q in re.findall(r'-?[\d.]+,-?[\d.]+', m.group(1))]
Q = np.array([to_rl(*p) for p in P])
x, y = Q[:,0], Q[:,1]
A, B, Cc, D, E = np.linalg.lstsq(np.c_[x*x, x*y, y*y, x, y], np.ones(len(x)), rcond=None)[0]
den = 4*A*Cc - B*B; cr = (B*E - 2*Cc*D)/den; cl = (B*D - 2*A*E)/den
k = 1 + A*cr*cr + B*cr*cl + Cc*cl*cl
rads = np.sqrt(k / np.linalg.eigvalsh(np.array([[A, B/2], [B/2, Cc]])))
R = float(np.sqrt(rads[0]*rads[1]))           # same floor area as the oval
print(f'{name}: oval centre (r,l)=({cr:.1f},{cl:.1f}) radii {rads[0]:.1f}x{rads[1]:.1f} -> circle R={R:.1f}')

# --- grid spacing/phase from existing grid lines ---
rs, ls = [], []
for x1, y1, x2, y2 in re.findall(r'M(-?[\d.]+),(-?[\d.]+)L(-?[\d.]+),(-?[\d.]+)', grid_d):
    p, q = to_rl(float(x1), float(y1)), to_rl(float(x2), float(y2))
    if abs(p[0]-q[0]) < 0.5: rs.append((p[0]+q[0])/2)
    elif abs(p[1]-q[1]) < 0.5: ls.append((p[1]+q[1])/2)
def lattice(vals):
    v = np.array(sorted(vals)); d = np.diff(v); step = float(np.median(d[d > 1]))
    phase = float(np.median(((v - v[0] + step/2) % step) - step/2) + v[0])
    return step, phase
sr, pr = lattice(rs); sl, pl = lattice(ls)
print(f'  grid step r={sr:.2f} l={sl:.2f}')

# --- knockouts: label text boxes (+5px), measured in the browser ---
bbs = json.loads(subprocess.check_output(['node', os.path.join(TOOLS, 'bboxes.js'), '8765', name]))
holes = unary_union([box(b['x']-5, b['y']-5, b['x']+b['w']+5, b['y']+b['h']+5) for b in bbs if b['w'] > 0])

# circle in screen space
N = 144
circ = [to_xy(cr + R*math.cos(2*math.pi*i/N), cl + R*math.sin(2*math.pi*i/N)) for i in range(N)]
disc = Polygon(circ)

def segs(geom):
    if geom.is_empty: return []
    if geom.geom_type == 'LineString': return [list(geom.coords)]
    return [list(g.coords) for g in geom.geoms if g.geom_type == 'LineString']

out = []
def add_line(p, q):
    ln = LineString([p, q]).intersection(disc)
    ln = ln.difference(holes)
    for s in segs(ln):
        if LineString(s).length > 1.5:
            out.append(f'M{fmt(s[0][0])},{fmt(s[0][1])}L{fmt(s[-1][0])},{fmt(s[-1][1])}')
n0 = math.floor((cr - R - pr)/sr); n1 = math.ceil((cr + R - pr)/sr)
for n in range(n0, n1+1):
    r = pr + n*sr
    add_line(to_xy(r, cl - R - 5), to_xy(r, cl + R + 5))
n0 = math.floor((cl - R - pl)/sl); n1 = math.ceil((cl + R - pl)/sl)
for n in range(n0, n1+1):
    l = pl + n*sl
    add_line(to_xy(cr - R - 5, l), to_xy(cr + R + 5, l))
new_grid = ''.join(out)
ring = LineString(circ + [circ[0]]).difference(holes)
arcs = segs(ring) if ring.geom_type != 'MultiLineString' else [list(g.coords) for g in ring.geoms]
# merge arcs that meet at the start point
new_out = ''.join('M' + 'L'.join(f'{fmt(px)},{fmt(py)}' for px, py in a) for a in arcs)
t = t.replace(f'd="{grid_d}"', f'd="{new_grid}"', 1).replace(f'd="{outline_d}"', f'd="{new_out}"', 1)
open(path, 'w').write(t)
print(f'  wrote {len(out)} grid segments, {len(arcs)} outline arcs')
