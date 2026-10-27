import numpy as np, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from iso import load, C30
def gfit(P):
    x,y=P[:,0],P[:,1]
    M=np.c_[x*x,x*y,y*y,x,y];A,B,C,D,E=np.linalg.lstsq(M,np.ones(len(x)),rcond=None)[0]
    den=4*A*C-B*B; cx=(B*E-2*C*D)/den; cy=(B*D-2*A*E)/den
    ang=0.5*np.degrees(np.arctan2(B,A-C))
    k=1+A*cx*cx+B*cx*cy+C*cy*cy
    ev=np.linalg.eigvalsh(np.array([[A,B/2],[B/2,C]])); r=np.sqrt(k/ev)
    return cx,cy,r,ang
for f in sys.argv[1:]:
    _,sh=load(open(f).read())
    for s in sh:
        if s.tag in ('path','polyline') and not s.curved:
            subs=[a for a in s.subs if len(a)>4]
            if not subs: continue
            P=np.array([p for a in subs for p in a])
            X,Y=P[:,0],P[:,1]; a=X/C30; b=2*Y; Q=np.c_[(a+b)/2,(b-a)/2]
            cx,cy,r,ang=gfit(Q)
            print(f'{os.path.basename(f):14s} L{s.line} floor-ellipse centre(r,l)=({cx:.1f},{cy:.1f}) radii={r[0]:.1f},{r[1]:.1f} axis={ang:.1f}deg screen-centre=({(cx-cy)*C30:.1f},{(cx+cy)/2:.1f})')
