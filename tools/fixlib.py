import re, sys
from iso import W, fmt, C30

class Edit:
    def __init__(self, path):
        self.path = path; self.t = open(path).read(); self.n = 0; self.log = []
    def rep(self, old, new, count=1, note=''):
        c = self.t.count(old)
        if c != count:
            raise SystemExit(f'[{self.path}] expected {count} match(es), found {c}: {old[:120]!r}')
        self.t = self.t.replace(old, new); self.n += 1
        if note: self.log.append(note)
    def points(self, old_pts, new_pts, count=1, note=''):
        self.rep(f'points="{old_pts}"', f'points="{new_pts}"', count, note)
    def save(self):
        open(self.path, 'w').write(self.t)
        print(f'{self.path}: {self.n} edits')
        for l in self.log: print('  -', l)

def shift(pts, dx, dy):
    out = []
    for p in pts.split():
        x, y = map(float, p.split(','))
        out.append(f'{fmt(x+dx)},{fmt(y+dy)}')
    return ' '.join(out)
