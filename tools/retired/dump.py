"""Dump an iso SVG in world units.
usage: python dump.py file.svg ox oy u [start end]
For each polygon: face type and world coords of each vertex given the face plane.
 top face   -> needs z: printed as (x-y, x+y-2z) pairs 'a/b' and also x,y assuming z from box partner
 left face  (plane y=const, R+V edges)
 right face (plane x=const, L+V edges)
Box triples (left,right,top in a row) are resolved exactly using the shared front-bottom edge.
"""
import sys, math
from iso import load, classify, W

def face_type(pts):
    ks = set()
    for i in range(len(pts)):
        k, d, o, ln = classify(pts[i], pts[(i+1) % len(pts)])
        if k is None: continue
        if o > 0.3: return '?'
        ks.add(k)
    if ks <= {'R', 'L'}: return 'T'
    if ks <= {'R', 'V'}: return 'Y'   # plane y = const (front-left wall)
    if ks <= {'L', 'V'}: return 'X'   # plane x = const (front-right wall)
    return '?'

def main():
    f = sys.argv[1]; ox, oy, u = map(float, sys.argv[2:5])
    text = open(f).read()
    off = 0
    if len(sys.argv) > 6:
        a, b = int(sys.argv[5]), int(sys.argv[6])
        text = '\n'.join(text.split('\n')[a-1:b]); text = text[text.index('<svg'):]; off = a - 1
    w = W(ox, oy, u)
    _, shapes = load(text)
    for s in shapes:
        if s.tag in ('polygon', 'polyline', 'line', 'path') and s.subs and not s.curved and len(s.subs[0]) <= 12:
            P = s.subs[0]
            ft = face_type(P) if s.tag == 'polygon' else '-'
            ab = ' '.join(f'{(X-ox)/(C*u):.2f}/{(Y-oy)/(u/2):.2f}' for X, Y in P)
            print(f'L{s.line+off:<4} {s.tag[:4]} {ft} {s.fill or s.a.get("stroke",""):8} {s.a.get("class","")[:14]:14} ab: {ab}')
        elif s.tag == 'circle':
            X, Y = s.c
            print(f'L{s.line+off:<4} circ   r={s.r} {s.fill:8} {s.el.getparent().get("class","")[:14]:14} ab: {(X-ox)/(C*u):.2f}/{(Y-oy)/(u/2):.2f}')
        elif s.tag == 'text':
            print(f'L{s.line+off:<4} text   {s.text[:30]!r} at {s.c[0]:.1f},{s.c[1]:.1f}')

C = math.cos(math.radians(30))
main()
