# python3 compare.py before.png after.png out.png [crop x0 y0 x1 y1 in before-pixels]
import sys
from PIL import Image, ImageDraw, ImageFont
a = Image.open(sys.argv[1]).convert('RGB'); b = Image.open(sys.argv[2]).convert('RGB')
if len(sys.argv) > 4:
    box = tuple(int(v) for v in sys.argv[4:8]); a = a.crop(box); b = b.crop(box)
W, H = a.size
pad = 40
im = Image.new('RGB', (W*2 + 30, H + pad), (12, 16, 24))
im.paste(a, (0, pad)); im.paste(b, (W + 30, pad))
d = ImageDraw.Draw(im)
f = None
for fp in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 'C:/Windows/Fonts/arialbd.ttf', '/Library/Fonts/Arial Bold.ttf'):
    try: f = ImageFont.truetype(fp, 26); break
    except Exception: pass
d.text((10, 6), 'BEFORE', fill=(244, 163, 64), font=f); d.text((W + 40, 6), 'AFTER', fill=(125, 185, 232), font=f)
im.save(sys.argv[3])
