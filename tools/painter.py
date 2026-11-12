"""Painter-order + overlap check for box triples in an iso SVG.
usage: python painter.py file ox oy u rules.py   (rules.py defines z0(box)->float|None to skip, label(box))
Prints pairs whose screen silhouettes overlap but whose DOM order contradicts 3D depth,
and pairs whose 3D volumes intersect (poke-through). Exits 1 on any, when it finds no boxes, or when the rules
resolve none of them (z0 gives None for every box: usually a wrong ox, oy or u), so a check can't pass by checking nothing."""
import sys, math, importlib.util
from iso import load, W, C30
from shapely.geometry import Polygon
from shapely.ops import unary_union

def boxes(path, w, text=None):
    text = text or open(path, encoding='utf-8').read()
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

def errors(bs, eps=0.01):
    """Pairs of boxes in drawing order that poke into each other ('INTERSECT') or where the one drawn first is in
    front ('ORDER', when their silhouettes overlap). Each item: dict(box=(x0, x1, y0, y1, z0, z1), sil=its outline on
    screen). Yields (kind, a, b, overlap px²)."""
    for i, a in enumerate(bs):
        for b in bs[i + 1:]:
            A, B = a['box'], b['box']
            if all(min(A[2*k+1], B[2*k+1]) - max(A[2*k], B[2*k]) > eps for k in range(3)):
                yield 'INTERSECT', a, b, 0.0
                continue
            ov = a['sil'].intersection(b['sil']).area
            if ov < 0.5: continue
            # separating axis: who is in front (larger coordinate on separated axis)
            for k in range(3):
                if A[2*k+1] <= B[2*k] + eps: break                    # b in front: drawn after, as it should be
                if B[2*k+1] <= A[2*k] + eps:                          # a in front, but drawn first
                    yield 'ORDER', a, b, ov
                    break

def main():
    f, ox, oy, u, rules = sys.argv[1], *map(float, sys.argv[2:5]), sys.argv[5]
    spec = importlib.util.spec_from_file_location('rules', rules); R = importlib.util.module_from_spec(spec); spec.loader.exec_module(R)
    w = W(ox, oy, u)
    bs = boxes(f, w)
    if not bs:
        print(f'no box triples found in {f}: check ox, oy and u against the drawing', file=sys.stderr)
        return 1
    found = 0
    for b in bs:
        z = R.z0(b)
        b['box'] = None if z is None else resolve(b, z)
    for kind, a, b, ov in errors([x for x in bs if x['box'] is not None]):
        if kind == 'INTERSECT':
            print(f'INTERSECT L{a["line"]} {R.label(a)} {fmt(a["box"])}  <->  L{b["line"]} {R.label(b)} {fmt(b["box"])}')
        else:
            print(f'ORDER  L{a["line"]} {R.label(a)} is in front of L{b["line"]} {R.label(b)} but drawn before it (overlap {ov:.0f}px²)')
        found += 1
    checked = sum(b['box'] is not None for b in bs)
    print(f'-- {len(bs)} boxes, {checked} checked, {found} findings', file=sys.stderr)
    if not checked:
        print(f'the rules resolved none of the {len(bs)} boxes: check ox, oy and u against the drawing', file=sys.stderr)
        return 1
    return 1 if found else 0

def fmt(B): return f'x{B[0]:.2f}-{B[1]:.2f} y{B[2]:.2f}-{B[3]:.2f} z{B[4]:.2f}-{B[5]:.2f}'

if __name__ == '__main__':
    sys.exit(main())
