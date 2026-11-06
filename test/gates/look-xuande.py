# Guide, not a pass mark: 宣德楼 against c1 on tight boxes that hold one material only. Lead-owned. The eye decides.
# A wide box lies: X1's near-rail box held paving and kerb, and its branch box held sky and flowers.
# Usage: python3 -I test/gates/look-xuande.py <render.png>  (fraction 0, 1920x1080)
import sys
import numpy as np
from PIL import Image
W = np.array([.2126, .7152, .0722])
# name: (box in c1 at 1672x941, box in our render at 1920x1080)
BOXES = {
    'paving': ((470, 680, 1640, 930), (540, 780, 1880, 1060)),
    'wall top third': ((620, 445, 1200, 500), (680, 510, 1370, 560)),
    'wall by doors': ((690, 545, 725, 625), (790, 640, 815, 700)),
    'door': ((745, 560, 800, 620), (1000, 630, 1060, 700)),
    'door lintel': ((600, 530, 690, 541), (830, 610, 935, 620)),
    'rail post face': ((190, 760, 250, 900), (215, 920, 265, 1040)),
    'bracket band': ((690, 310, 860, 350), (740, 345, 960, 395)),
    'column shaft': ((698, 365, 712, 415), (765, 415, 780, 465)),
    'bay interior': ((830, 370, 930, 395), (880, 425, 960, 460)),
    'roof slope': ((760, 225, 1000, 285), (800, 270, 1250, 310)),
    'main ridge': ((640, 206, 1040, 220), (800, 243, 1220, 256)),
    'bark trunk': ((33, 293, 110, 333), (40, 460, 110, 510)),
    'blossom': ((500, 0, 900, 110), (480, 0, 860, 100)),
}
def load(f):
    return np.asarray(Image.open(f).convert('RGB'), dtype=np.float32)
def span(a, box):
    x0, y0, x1, y1 = box
    p = a[y0:y1, x0:x1].reshape(-1, 3); o = np.argsort(p @ W); n = len(o)
    return [np.median(p[o[max(0, int(n * q) - n // 20):int(n * q) + n // 20 + 1]], axis=0).round().astype(int).tolist() for q in (.1, .3, .5, .7, .9)]
c = load('refs/style/c1.png')
print(f"{'region':16s} p10 / p30 / p50 / p70 / p90 by luminance")
for f in sys.argv[1:]:
    a = load(f)
    for name, (bc, bu) in BOXES.items():
        print(f"{name:16s} c1  " + ' / '.join(' '.join('%3d' % v for v in s) for s in span(c, bc)))
        print(f"{'':16s} us  " + ' / '.join(' '.join('%3d' % v for v in s) for s in span(a, bu)))
    # Hue spread on the wall: how far marks stray from one pigment. Percentiles above can't see this.
    r = c[445:525, 620:1200].reshape(-1, 3); u = a[510:590, 680:1370].reshape(-1, 3)
    print('wall R-B 5/50/95  c1', np.percentile(r[:, 0] - r[:, 2], [5, 50, 95]).round().tolist(), ' us', np.percentile(u[:, 0] - u[:, 2], [5, 50, 95]).round().tolist())
    print('wall G-B 5/50/95  c1', np.percentile(r[:, 1] - r[:, 2], [5, 50, 95]).round().tolist(), ' us', np.percentile(u[:, 1] - u[:, 2], [5, 50, 95]).round().tolist())
