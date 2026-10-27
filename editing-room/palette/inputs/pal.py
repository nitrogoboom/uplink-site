import math, json
def s2l(c): c/=255; return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
def l2s(c): c=max(0,min(1,c)); return 12.92*c if c<=0.0031308 else 1.055*c**(1/2.4)-0.055
def hex2rgb(h): h=h.lstrip('#'); return [int(h[i:i+2],16) for i in (0,2,4)]
def rgb2oklch(h):
    r,g,b=[s2l(x) for x in hex2rgb(h)]
    l=0.4122214708*r+0.5363325363*g+0.0514459929*b
    m=0.2119034982*r+0.6806995451*g+0.1073969566*b
    s=0.0883024619*r+0.2817188376*g+0.6299787005*b
    l,m,s=[x**(1/3) for x in (l,m,s)]
    L=0.2104542553*l+0.7936177850*m-0.0040720468*s
    a=1.9779984951*l-2.4285922050*m+0.4505937099*s
    bb=0.0259040371*l+0.7827717662*m-0.8086757660*s
    return L, math.hypot(a,bb), math.degrees(math.atan2(bb,a))%360
def oklch2lin(L,C,H):
    a=C*math.cos(math.radians(H)); b=C*math.sin(math.radians(H))
    l=(L+0.3963377774*a+0.2158037573*b)**3
    m=(L-0.1055613458*a-0.0638541728*b)**3
    s=(L-0.0894841775*a-1.2914855480*b)**3
    return [4.0767416621*l-3.3077115913*m+0.2309699292*s,-1.2684380046*l+2.6097574011*m-0.3413193965*s,-0.0041960863*l-0.7034186147*m+1.7076147010*s]
def ingamut(L,C,H): return all(-1e-4<=x<=1+1e-4 for x in oklch2lin(L,C,H))
def oklch2hex(L,C,H):
    lo,hi=0,C
    if not ingamut(L,C,H):
        for _ in range(30):
            mid=(lo+hi)/2
            if ingamut(L,mid,H): lo=mid
            else: hi=mid
        C=lo
    return '#'+''.join('%02X'%round(l2s(x)*255) for x in oklch2lin(L,C,H))
def lum(h): r,g,b=[s2l(x) for x in hex2rgb(h)]; return .2126*r+.7152*g+.0722*b
def cr(a,b): x,y=sorted([lum(a),lum(b)]); return (y+.05)/(x+.05)
STEPS=[50,100,200,300,400,500,600,700,800,900,950]
LS=[.97,.93,.87,.80,.72,.64,.56,.48,.40,.31,.24]
def ramp(anchor,name,taper=True,cmult=1.0,anchor_exact=True):
    L0,C0,H=rgb2oklch(anchor); C0*=cmult
    out=[]; near=min(range(len(LS)),key=lambda i:abs(LS[i]-L0))
    for i,(st,L) in enumerate(zip(STEPS,LS)):
        f=1.0
        if taper:
            if L>L0: f=1-0.7*((L-L0)/(1-L0))**1.5
            else: f=1-0.45*((L0-L)/L0)**1.5
        hx=oklch2hex(L,C0*f,H)
        if anchor_exact and i==near: hx=anchor.upper(); L=L0
        out.append(dict(step=st,hex=hx,anchor=(anchor_exact and i==near)))
    return dict(name=name,hue=round(H),anchor=anchor.upper(),L=round(L0,3),C=round(C0,3),steps=out)
blue='#1F75A6'; crim='#8D242E'; amber='#F4A340'; ok='#6FD3A0'
Lb,Cb,Hb=rgb2oklch(blue)
res={}
res['blue']=ramp(blue,'Logo blue')
res['crimson']=ramp(crim,'Logo crimson')
res['amber']=ramp(amber,'Amber (action)')
res['green']=ramp(ok,'Green (status)')
# teal neighbour: blue hue -35, mid chroma
tealanchor=oklch2hex(0.66,0.11,Hb-40); res['teal']=ramp(tealanchor,'Teal (neighbour)',anchor_exact=False)
# neutrals: blue hue, very low chroma
res['neutral']=dict(name='Navy neutrals',hue=round(Hb),anchor=None,steps=[dict(step=s,hex=oklch2hex(L,0.012+0.03*(1-L),Hb),anchor=False) for s,L in zip(STEPS,LS)])
# darker neutral extension for page bgs
navy=[oklch2hex(L,0.035,Hb) for L in (0.16,0.20,0.23,0.27)]
cur={'--c-bg':'#151E2C','--c-sky':'#7DB9E8','--c-accent':'#F4A340','--c-ok':'#6FD3A0','--c-alert':'#EE8A7C','--c-text':'#F1F4F8','--c-muted':'#A9B4C3','--iso-sky-top':'#9CCBF0','--iso-sky-right':'#5E9BCB','--iso-top':'#405169'}
info={k:[round(x,3) for x in rgb2oklch(v)] for k,v in cur.items()}
# proposed aligned values: keep L and C, move hue to blue hue (sky, iso-sky, bg, iso-top)
prop={}
for k in ['--c-bg','--c-sky','--iso-sky-top','--iso-sky-right','--iso-top','--c-muted']:
    L,C,H=rgb2oklch(cur[k]); prop[k]=oklch2hex(L,C,Hb)
res['current_oklch']=info; res['proposed']=prop; res['navy_dark']=navy
res['hues']={'blue':Hb,'crimson':rgb2oklch(crim)[2],'amber':rgb2oklch(amber)[2],'green':rgb2oklch(ok)[2],'blue_complement':(Hb+180)%360,'teal':Hb-40}
bg2=prop['--c-bg']
res['contrast']={n:{'on_cur_bg':round(cr(v,'#151E2C'),2),'on_new_bg':round(cr(v,bg2),2)} for n,v in {'logo blue':blue,'crimson':crim,'amber':amber,'sky (new)':prop['--c-sky'],'sky (current)':cur['--c-sky'],'text':cur['--c-text'],'muted (current)':cur['--c-muted'],'muted (new)':prop['--c-muted'],'blue-400':res['blue']['steps'][4]['hex'],'blue-300':res['blue']['steps'][3]['hex']}.items()}
res['contrast']['amber button label']=round(cr('#1B2130',amber),2)
res['contrast']['white on logo blue']=round(cr('#FFFFFF',blue),2)
print(json.dumps(res,indent=1))
for k in ['--c-bg','--iso-top','--c-sky']:
    L,C,H=rgb2oklch(cur[k]); print(k,[oklch2hex(L,C,H+(Hb-H)*t) for t in (0,.5,1)])
print('alert vs crimson', round(cr('#EE8A7C',crim),2))
