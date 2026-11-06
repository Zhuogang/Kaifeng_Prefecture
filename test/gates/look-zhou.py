# Guide, not a pass mark: 州桥 view 1 against c2 on tight boxes that hold one material only. Lead-owned. The eye decides.
# Usage: python3 -I test/gates/look-zhou.py <view1.png> [--sheet out.png]  (view 1, fraction 0, 1920x1080)
import sys
import numpy as np
from PIL import Image, ImageDraw
W = np.array([.2126, .7152, .0722])
# name: (box in c2 at 1672x941, box in our render at 1920x1080)
BOXES = {
    'tower roof': ((1300, 165, 1520, 195), (1530, 185, 1700, 220)),
    'tower brackets': ((1290, 212, 1600, 240), (1480, 250, 1780, 275)),
    'tower column': ((1346, 325, 1359, 400), (1483, 380, 1492, 490)),
    'tower wall': ((1309, 337, 1343, 406), (1415, 395, 1465, 480)),
    'bridge piers': ((560, 470, 1240, 545), (420, 540, 1640, 620)),
    'quay kerb': ((225, 800, 330, 860), (370, 918, 478, 980)),
    'trunk': ((30, 400, 110, 600), (40, 520, 160, 820)),
    'mid willow': ((1120, 310, 1225, 418), (1664, 332, 1860, 478)),
}
def load(f):
    return np.asarray(Image.open(f).convert('RGB'), dtype=np.float32)
def span(a, box):
    x0, y0, x1, y1 = box
    p = a[y0:y1, x0:x1].reshape(-1, 3); o = np.argsort(p @ W); n = len(o)
    return [np.median(p[o[max(0, int(n * q) - n // 20):int(n * q) + n // 20 + 1]], axis=0).round().astype(int).tolist() for q in (.1, .3, .5, .7, .9)]
args = [a for a in sys.argv[1:] if a != '--sheet']
sheet = args.pop() if '--sheet' in sys.argv else None
c = load('refs/style/c2.png'); a = load(args[0])
print(f"{'region':16s} p10 / p30 / p50 / p70 / p90 by luminance")
for name, (bc, bu) in BOXES.items():
    print(f"{name:16s} c2  " + ' / '.join(' '.join('%3d' % v for v in s) for s in span(c, bc)))
    print(f"{'':16s} us  " + ' / '.join(' '.join('%3d' % v for v in s) for s in span(a, bu)))
if sheet:
    # The boxes drawn on both images, so a box that holds the wrong thing shows up. Check this before trusting a number.
    ic = Image.open('refs/style/c2.png').convert('RGB'); iu = Image.open(args[0]).convert('RGB')
    for im, k in ((ic, 0), (iu, 1)):
        d = ImageDraw.Draw(im)
        for name, b in BOXES.items():
            d.rectangle(b[k], outline=(255, 0, 255), width=2); d.text((b[k][0] + 3, b[k][1] + 3), name, fill=(255, 255, 255))
    h = 700; a1 = ic.resize((int(ic.width * h / ic.height), h)); a2 = iu.resize((int(iu.width * h / iu.height), h))
    o = Image.new('RGB', (a1.width + a2.width + 8, h)); o.paste(a1, (0, 0)); o.paste(a2, (a1.width + 8, 0)); o.save(sheet)
