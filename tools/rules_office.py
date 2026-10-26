from painter import resolve
def dims(b):
    x0,x1,y0,y1,_,_ = resolve(b, 0); return x1-x0, y1-y0, b['h']
def kind(b):
    w,d,h = dims(b)
    if b['fill'] in ('#2C3A4F','#3A4A61') : return 'tray'
    if abs(d-0.1)<0.02 and abs(h-0.65)<0.02: return 'monitor'
    if h < 0.06: return 'keyboard'
    if d < 0.09 and abs(h-0.8)<0.02: return 'chairback'
    if abs(w-1.7)<0.02 and abs(h-0.2)<0.02: return 'tile'
    if abs(h-0.125)<0.01 and abs(w-0.6)<0.02: return 'ap'
    if abs(h-0.45)<0.01 and w>20: return 'slab'
    return f'box{w:.2f}x{d:.2f}x{h:.2f}'
def z0(b):
    k = kind(b)
    return {'monitor':1.25,'keyboard':1.25,'chairback':0.8,'slab':-0.45}.get(k, None if k in ('tray','tile','ap') else 0.0)
def label(b): return kind(b)
