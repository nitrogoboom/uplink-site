"""Painter-order + overlap check for box triples in an iso SVG.
usage: python painter.py file ox oy u rules.py   (rules.py defines z0(box)->float|None to skip, label(box))
Prints pairs whose screen silhouettes overlap but whose DOM order contradicts 3D depth,
and pairs whose 3D volumes intersect (poke-through)."""
import sys, math, importlib.util
from iso import load, W, C30
from shapely.geometry import Polygon
from shapely.ops import unary_union

def boxes(path, w, text=None):
    text = text or open(path).read()
    _, shapes = load(text)
    polys = [s for s in shapes if s.tag == 'polygon' and len(s.subs[0]) == 4]
    out = []; i = 0
    while i < len(polys) - 2:
        P = [p.subs[0] for p in polys[i:i+3]]
        A = [((X-w.ox)/(C30*w.u), (Y-w.oy)/(w.u/2)) for X, Y in P[0]]
        B = [((X-w.ox)/(C30*w.u), (Y-w.oy)/(w.u/2)) for X, Y in P[1]]
        if all(math.isclose(A[1][k], B[1][k], abs_tol=0.02) for k in (0, 1)) and all(math.isclose(A[2][k], B[2][k], abs_tol=0.02) for k in (0, 1)):
            h = (A[1][1] - A[2][1]) / 2
            out.append(dict(line=polys[i].line, idx=i, fill=polys[i].fill, A=A, B=B, h=h,
                            sil=unary_union([Polygon(p).buffer(0) for p in P])))
            i += 3
        else:
            i += 1
    return out

def resolve(b, z0):
    a1, b1 = b['A'][1]; s1 = b1 + 2*z0
    x1 = (a1 + s1)/2; y1 = (s1 - a1)/2
    x0 = b['A'][0][0] + y1; y0 = x1 - b['B'][0][0]
    return (x0, x1, y0, y1, z0, z0 + b['h'])

def main():
    f, ox, oy, u, rules = sys.argv[1], *map(float, sys.argv[2:5]), sys.argv[5]
    spec = importlib.util.spec_from_file_location('rules', rules); R = importlib.util.module_from_spec(spec); spec.loader.exec_module(R)
    w = W(ox, oy, u)
    bs = boxes(f, w)
    for b in bs:
        z = R.z0(b)
        b['box'] = None if z is None else resolve(b, z)
    eps = 0.01
    for i, a in enumerate(bs):
        for j, b in enumerate(bs):
            if j <= i or a['box'] is None or b['box'] is None: continue
            ov = a['sil'].intersection(b['sil']).area
            A, B = a['box'], b['box']
            inter = all(min(A[2*k+1], B[2*k+1]) - max(A[2*k], B[2*k]) > eps for k in range(3))
            if inter:
                print(f'INTERSECT L{a["line"]} {R.label(a)} {fmt(A)}  <->  L{b["line"]} {R.label(b)} {fmt(B)}')
                continue
            if ov < 0.5: continue
            # separating axis: who is in front (larger coordinate on separated axis)
            front = None
            for k in range(3):
                if A[2*k+1] <= B[2*k] + eps: front = 'b'; break
                if B[2*k+1] <= A[2*k] + eps: front = 'a'; break
            if front == 'a':   # a should be drawn after b, but a comes first in DOM
                print(f'ORDER  L{a["line"]} {R.label(a)} is in front of L{b["line"]} {R.label(b)} but drawn before it (overlap {ov:.0f}px²)')

def fmt(B): return f'x{B[0]:.2f}-{B[1]:.2f} y{B[2]:.2f}-{B[3]:.2f} z{B[4]:.2f}-{B[5]:.2f}'

if __name__ == '__main__':
    main()
