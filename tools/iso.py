"""Shared helpers: parse SVG shapes with absolute coords + source lines, iso math."""
import re, math
from lxml import etree

C30 = math.cos(math.radians(30)); S30 = 0.5

def matmul(a, b):
    # a,b = (a,b,c,d,e,f) svg matrices; returns a*b
    return (a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1],
            a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3],
            a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5])

def parse_tf(s):
    m = (1,0,0,1,0,0)
    if not s: return m
    for name, args in re.findall(r'(\w+)\(([^)]*)\)', s):
        v = [float(x) for x in re.split(r'[ ,]+', args.strip()) if x]
        if name == 'translate': t = (1,0,0,1,v[0], v[1] if len(v)>1 else 0)
        elif name == 'matrix': t = tuple(v)
        elif name == 'scale': t = (v[0],0,0,v[1] if len(v)>1 else v[0],0,0)
        elif name == 'rotate':
            a = math.radians(v[0]); t = (math.cos(a), math.sin(a), -math.sin(a), math.cos(a), 0, 0)
            if len(v) == 3:
                t = matmul(matmul((1,0,0,1,v[1],v[2]), t), (1,0,0,1,-v[1],-v[2]))
        else: continue
        m = matmul(m, t)
    return m

def app(m, p):
    return (m[0]*p[0]+m[2]*p[1]+m[4], m[1]*p[0]+m[3]*p[1]+m[5])

def nums(s):
    return [float(x) for x in re.findall(r'-?\d*\.?\d+(?:e-?\d+)?', s)]

def path_subpaths(d):
    """Return list of point lists for M/L/H/V/Z (+ relative). Curves -> endpoints only (flagged)."""
    toks = re.findall(r'[MLHVZCSQTAmlhvzcsqta]|-?\d*\.?\d+(?:e-?\d+)?', d)
    subs = []; cur = None; x = y = 0; cmd = None; i = 0; curved = False
    def num():
        nonlocal i; v = float(toks[i]); i += 1; return v
    while i < len(toks):
        t = toks[i]
        if re.match(r'[A-Za-z]', t): cmd = t; i += 1
        if cmd in 'Zz':
            if cur: subs.append(cur); x, y = cur[0]
            cur = None; continue
        if cmd in 'Mm':
            dx, dy = num(), num()
            x, y = (dx, dy) if cmd == 'M' else (x+dx, y+dy)
            if cur: subs.append(cur)
            cur = [(x, y)]; cmd = 'L' if cmd == 'M' else 'l'; continue
        if cmd == 'L': x, y = num(), num()
        elif cmd == 'l': x, y = x+num(), y+num()
        elif cmd == 'H': x = num()
        elif cmd == 'h': x += num()
        elif cmd == 'V': y = num()
        elif cmd == 'v': y += num()
        elif cmd in 'Cc':
            a = [num() for _ in range(6)]; curved = True
            x, y = (a[4], a[5]) if cmd == 'C' else (x+a[4], y+a[5])
        elif cmd in 'Aa':
            a = [num() for _ in range(7)]; curved = True
            x, y = (a[5], a[6]) if cmd == 'A' else (x+a[5], y+a[6])
        elif cmd in 'SsQq':
            a = [num() for _ in range(4)]; curved = True
            x, y = (a[2], a[3]) if cmd in 'SQ' else (x+a[2], y+a[3])
        else:
            i += 1; continue
        if cur is None: cur = [(x, y)]
        else: cur.append((x, y))
    if cur: subs.append(cur)
    return subs, curved

class Shape:
    def __init__(self, el, m, line):
        self.el = el; self.tag = etree.QName(el).localname; self.m = m; self.line = line
        self.a = dict(el.attrib); self.subs = []; self.closed = False; self.curved = False
        t = self.tag
        if t in ('polygon', 'polyline'):
            v = nums(self.a.get('points', ''))
            self.subs = [[app(m, (v[k], v[k+1])) for k in range(0, len(v)-1, 2)]]
            self.closed = t == 'polygon'
        elif t == 'line':
            self.subs = [[app(m, (float(self.a['x1']), float(self.a['y1']))), app(m, (float(self.a['x2']), float(self.a['y2'])))]]
        elif t == 'path':
            subs, self.curved = path_subpaths(self.a.get('d', ''))
            self.subs = [[app(m, p) for p in s] for s in subs]
            self.closed = 'z' in self.a.get('d', '').lower()
        elif t == 'rect':
            x, y, w, h = (float(self.a.get(k, 0)) for k in ('x', 'y', 'width', 'height'))
            self.subs = [[app(m, p) for p in [(x, y), (x+w, y), (x+w, y+h), (x, y+h)]]]; self.closed = True
        elif t == 'circle':
            self.c = app(m, (float(self.a['cx']), float(self.a['cy']))); self.r = float(self.a['r'])
        elif t == 'ellipse':
            self.c = app(m, (float(self.a['cx']), float(self.a['cy']))); self.rx = float(self.a['rx']); self.ry = float(self.a['ry'])
        elif t == 'text':
            self.c = app(m, (float(self.a.get('x', 0)), float(self.a.get('y', 0))))
            self.text = ''.join(el.itertext())
    def edges(self):
        for s in self.subs:
            n = len(s)
            for k in range(n - (0 if self.closed else 1)):
                yield s[k], s[(k+1) % n]
    @property
    def fill(self): return self.a.get('fill', '')
    def __repr__(self):
        return f'<{self.tag} L{self.line} {self.a.get("class","")} fill={self.fill}>'

def load(text):
    """text = full svg markup. returns (root, shapes)."""
    parser = etree.XMLParser(remove_comments=False, huge_tree=True)
    root = etree.fromstring(text.encode(), parser)
    shapes = []
    def walk(el, m):
        if not isinstance(el.tag, str): return
        name = etree.QName(el).localname
        if name in ('style', 'title', 'defs', 'clipPath', 'mask'): return
        m2 = matmul(m, parse_tf(el.get('transform')))
        if name in ('polygon', 'polyline', 'line', 'path', 'rect', 'circle', 'ellipse', 'text'):
            shapes.append(Shape(el, m2, el.sourceline))
        for c in el: walk(c, m2)
    walk(root, (1,0,0,1,0,0))
    return root, shapes

ISO_DIRS = {'R': 30.0, 'L': 150.0, 'V': 90.0}   # R: right-down, L: left-down (== right-up reversed)

def classify(p, q):
    dx, dy = q[0]-p[0], q[1]-p[1]
    ln = math.hypot(dx, dy)
    if ln < 1e-9: return None, 0, 0, 0
    ang = math.degrees(math.atan2(dy, dx)) % 180
    best = None; bd = 999
    for k, a in ISO_DIRS.items():
        d = abs((ang - a + 90) % 180 - 90)
        if d < bd: bd, best = d, k
    off = ln * math.sin(math.radians(bd))
    return best, bd, off, ln

class W:
    """World->screen for a generator-style iso drawing: screen = o + ((x-y)*C30*u, (x+y)*u/2 - z*u)."""
    def __init__(self, ox=0.0, oy=0.0, u=23.0):
        self.ox, self.oy, self.u = ox, oy, u
    def p(self, x, y, z=0):
        return (self.ox + (x - y)*C30*self.u, self.oy + (x + y)*self.u/2 - z*self.u)
    def s(self, x, y, z=0):
        X, Y = self.p(x, y, z)
        return f'{fmt(X)},{fmt(Y)}'
    def pts(self, *P):
        return ' '.join(self.s(*q) for q in P)
    def box(self, x0, x1, y0, y1, z0, z1):
        """(left, right, top) point strings in the generator's vertex order."""
        L = self.pts((x0,y1,z0),(x1,y1,z0),(x1,y1,z1),(x0,y1,z1))
        R = self.pts((x1,y0,z0),(x1,y1,z0),(x1,y1,z1),(x1,y0,z1))
        T = self.pts((x0,y0,z1),(x1,y0,z1),(x1,y1,z1),(x0,y1,z1))
        return L, R, T

def fmt(v):
    v = round(v + 0.0, 1)
    if v == 0: v = 0.0
    return f'{v:.1f}'
