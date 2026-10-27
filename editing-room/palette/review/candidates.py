import sys; sys.path.insert(0,'.')
from measure import *
def fromlch(L,C,H):
    a=C*math.cos(math.radians(H)); b=C*math.sin(math.radians(H))
    l=(L+0.3963377774*a+0.2158037573*b)**3; m=(L-0.1055613458*a-0.0638541728*b)**3; s=(L-0.0894841775*a-1.2914855480*b)**3
    r=4.0767416621*l-3.3077115913*m+0.2309699292*s; g=-1.2684380046*l+2.6097574011*m-0.3413193965*s; bb=-0.0041960863*l-0.7034186147*m+1.7076147010*s
    return tuple(round(delin(x)) for x in (r,g,bb))+(1.0,)
H=lambda s:parse_color(s)
dbg,dband,dsolid=H('#0E1A27'),H('#14202D'),H('#222E3A'); dsurf2=over((242,247,253,.09),dbg)
lbg,lband,lsolid=H('#F2F7FD'),H('#E6ECF2'),H('#FFFFFF'); lsurf2=over((34,46,58,.045),lbg)
dacc=H('#FFAD51'); dsky=H('#97C8EA'); dok=H('#A9E9C3')
print("dark alert candidates")
for L,C,h in [(.74,.15,25),(.75,.14,27),(.76,.15,22),(.72,.16,25),(.77,.13,25)]:
    c=fromlch(L,C,h); s={k:v for k,v in [('acc',dacc),('ok',dok)]}
    print(hexs(c),L,C,h,'bg %.2f/%.0f solid %.2f/%.0f'%(wcag(c,dbg),abs(apca(c,dbg)),wcag(c,dsolid),abs(apca(c,dsolid))),
      ' acc dE '+' '.join('%s %.1f'%(k,dE(sim(c,k),sim(dacc,k))) for k in ['normal','protan','deutan','tritan']),
      ' ok dE '+' '.join('%.1f'%dE(sim(c,k),sim(dok,k)) for k in ['normal','protan','deutan','tritan']))
print("light accent-text candidates")
for L,C,h in [(.50,.11,64),(.51,.11,62),(.50,.105,66),(.49,.105,66)]:
    c=fromlch(L,C,h)
    print(hexs(c),L,C,h,'bg %.2f band %.2f surf2 %.2f/%.0f solid %.2f'%(wcag(c,lbg),wcag(c,lband),wcag(c,lsurf2),abs(apca(c,lband)),wcag(c,lsolid)))
lacc_t=fromlch(.50,.105,66); lok=H('#004F2E'); lsky=H('#005D8A')
print("light alert candidates vs accent-text", hexs(lacc_t))
for L,C,h in [(.47,.15,27),(.45,.15,25),(.535,.146,29),(.48,.16,25),(.46,.16,22)]:
    c=fromlch(L,C,h)
    print(hexs(c),L,C,h,'band %.2f'%wcag(c,lband),' acc '+' '.join('%s %.1f'%(k[:3],dE(sim(c,k),sim(lacc_t,k))) for k in ['normal','protan','deutan','tritan']),
      ' ok '+' '.join('%.1f'%dE(sim(c,k),sim(lok,k)) for k in ['normal','protan','deutan','tritan']))
print("light ok candidates")
for L,C,h in [(.376,.089,158),(.45,.11,155),(.48,.11,152)]:
    c=fromlch(L,C,h); al=fromlch(.47,.15,27)
    print(hexs(c),'band %.2f'%wcag(c,lband),' vs alert '+' '.join('%.1f'%dE(sim(c,k),sim(al,k)) for k in ['normal','protan','deutan','tritan']),' vs acc-t '+' '.join('%.1f'%dE(sim(c,k),sim(lacc_t,k)) for k in ['normal','protan','deutan','tritan']),' vs sky '+' '.join('%.1f'%dE(sim(c,k),sim(lsky,k)) for k in ['normal','tritan']))
print("edges")
for a in [.40,.42,.44,.46]:
    e=(242,247,253,a); print('dark',a,'bg %.2f solid %.2f surf %.2f'%(wcag(over(e,dbg),dbg),wcag(over(e,dsolid),dsolid),wcag(over(e,over((242,247,253,.05),dbg)),over((242,247,253,.05),dbg))))
for a in [.50,.54,.58]:
    e=(34,46,58,a); print('light',a,'bg %.2f band %.2f solid %.2f'%(wcag(over(e,lbg),lbg),wcag(over(e,lband),lband),wcag(over(e,lsolid),lsolid)))
fill=H('#FFAD51'); ink=H('#0E1A27')
print('light fill #FFAD51 ink %.2f/%.0f, fill vs bg %.2f, dE %.1f'%(wcag(ink,fill),abs(apca(ink,fill)),wcag(fill,lbg),dE(fill,lbg)))
for a in [.14,.18,.22]:
    t=over((255,173,81,a),lbg); print('light tint',a,'acc-text on tint %.2f'%wcag(lacc_t,t),'text %.2f'%wcag(ink,t))
# light iso sets
for name,(t,l,r) in {'blue':('#97C8EA','#4A93C1','#005D8A'),'green':('#82D6A6','#3BA16E','#00683F'),'amber':('#FFCD9B','#FFAD51','#C37600'),'box':('#FFFFFF','#D2D8DF','#BBC2C9')}.items():
    Ls=[oklab(H(x))[0] for x in (t,l,r)]; g=H('#E6ECF2')
    print(name,['%.2f'%x for x in Ls],'right~ground %.1f top~ground %.1f'%(dE(H(r),g),dE(H(t),g)))
