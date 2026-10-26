# Painter-order check for the footer campus map. usage: python3 footer_painter.py <page url>  (needs a box() logger: window.__isoLog)
# Painter-order + poke-through check on the boxes the map generator actually drew (same logic as tools/painter.py).
import asyncio, sys, json, math
from shapely.geometry import Polygon
from shapely.ops import unary_union
from playwright.async_api import async_playwright
C=math.cos(math.pi/6); U=38
pr=lambda x,y,z: ((x-y)*C*U,(x+y)*U/2-z*U)
def sil(b):
    x,y,z,w,d,h=b['x'],b['y'],b['z'],b['w'],b['d'],b['h']
    F=[[(x,y+d,z),(x+w,y+d,z),(x+w,y+d,z+h),(x,y+d,z+h)],[(x+w,y,z),(x+w,y+d,z),(x+w,y+d,z+h),(x+w,y,z+h)],[(x,y,z+h),(x+w,y,z+h),(x+w,y+d,z+h),(x,y+d,z+h)]]
    return unary_union([Polygon([pr(*p) for p in f]).buffer(0) for f in F])
async def grab(url):
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1440,'height':900})
        await pg.add_init_script('window.__isoLog=[]'); await pg.goto(url); await pg.wait_for_timeout(400)
        L=await pg.evaluate('window.__isoLog'); await b.close(); return L
L=asyncio.run(grab(sys.argv[1]))
# one render only (render() builds once)
n=len(L); print('boxes logged',n)
bs=[dict(b, i=i, S=sil(b), E=(b['x'],b['x']+b['w'],b['y'],b['y']+b['d'],b['z'],b['z']+b['h'])) for i,b in enumerate(L) if b['k']!='plat']
eps=0.01; issues=0
for i,a in enumerate(bs):
    for b in bs[i+1:]:
        A,B=a['E'],b['E']
        if all(min(A[2*k+1],B[2*k+1])-max(A[2*k],B[2*k])>eps for k in range(3)):
            print('INTERSECT',a['k'],A,'<->',b['k'],B); issues+=1; continue
        ov=a['S'].intersection(b['S']).area
        if ov<0.5: continue
        front=None
        for k in range(3):
            if A[2*k+1]<=B[2*k]+eps: front='b'; break
            if B[2*k+1]<=A[2*k]+eps: front='a'; break
        if front=='a': print(f"ORDER {a['k']} {A} is in front of {b['k']} {B} but drawn first (overlap {ov:.0f}px²)"); issues+=1
        if front is None: print('NOSEP',a['k'],b['k']); issues+=1
print('issues',issues)
