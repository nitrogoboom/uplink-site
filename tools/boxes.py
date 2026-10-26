"""Resolve box triples (Y-face, X-face, Top) into world extents.
usage: python boxes.py file ox oy u [start end] [--z0 L=val ...]
For each triple prints x0..x1, y0..y1, z0..z1 assuming base z0 (default 0; override per first-line with Lnn=z).
Also: given a base z0, resolution is exact (front-bottom corner shared by Y and X faces).
"""
import sys, math
from iso import load, W, C30

def ab(w, P):
    return [((X - w.ox)/(C30*w.u), (Y - w.oy)/(w.u/2)) for X, Y in P]

def main():
    args = [a for a in sys.argv[1:] if '=' not in a]
    ov = {int(a.split('=')[0][1:]): float(a.split('=')[1]) for a in sys.argv[1:] if '=' in a}
    f = args[0]; ox, oy, u = map(float, args[1:4])
    text = open(f).read(); off = 0
    if len(args) > 5:
        s, e = int(args[4]), int(args[5]); text = '\n'.join(text.split('\n')[s-1:e]); text = text[text.index('<svg'):]; off = s-1
    w = W(ox, oy, u)
    _, shapes = load(text)
    polys = [s for s in shapes if s.tag == 'polygon' and len(s.subs[0]) == 4]
    i = 0
    while i < len(polys) - 2:
        A, B, T = (ab(w, p.subs[0]) for p in polys[i:i+3])
        # Y face: (x0,y1,z0),(x1,y1,z0),(x1,y1,z1),(x0,y1,z1); X face: (x1,y0,z0),(x1,y1,z0),(x1,y1,z1),(x1,y0,z1)
        if all(math.isclose(A[1][k], B[1][k], abs_tol=0.02) for k in (0, 1)) and all(math.isclose(A[2][k], B[2][k], abs_tol=0.02) for k in (0, 1)):
            line = polys[i].line + off
            z0 = ov.get(line, 0.0)
            a1, b1 = A[1]                       # front-bottom corner x1,y1
            s1 = b1 + 2*z0                      # x1+y1
            x1 = (a1 + s1)/2; y1 = (s1 - a1)/2
            x0 = A[0][0] + y1                   # Y face left: a = x0 - y1
            y0 = x1 - B[0][0]                   # X face back: a = x1 - y0
            h = (A[1][1] - A[2][1])/2
            # check top face consistency
            tz = z0 + h
            t00 = (x0 - y0, x0 + y0 - 2*tz)
            err = math.dist(t00, T[0])
            print(f'L{line:<4} {polys[i].fill:8} x {x0:6.2f}..{x1:6.2f}  y {y0:6.2f}..{y1:6.2f}  z {z0:5.2f}..{tz:5.2f}  (w{x1-x0:.2f} d{y1-y0:.2f} h{h:.2f}){"  TOP-MISMATCH %.2f" % err if err > 0.03 else ""}')
            i += 3
        else:
            i += 1

main()
