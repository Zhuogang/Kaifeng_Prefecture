# Guide, not a pass mark: 宣德楼's regions against c1, unmasked. Lead-owned. The eye decides.
# Usage: python3 -I test/gates/look-xuande.py <render.png>
import sys
import numpy as np
from PIL import Image
W = np.array([.2126, .7152, .0722])
C1 = {'paving': (.28, .72, .98, .98), 'wall front': (.36, .47, .72, .55), 'left slope': (.30, .50, .35, .65), 'right slope': (.72, .50, .76, .65), 'door': (.365, .58, .40, .66), 'near rail': (.11, .72, .17, .95), 'hall band': (.30, .31, .72, .43), 'roof': (.33, .22, .70, .30), 'branch': (.03, .25, .14, .45), 'blossom': (.30, .0, .55, .12)}
US = {'paving': (.28, .72, .98, .98), 'wall front': (.25, .47, .85, .55), 'left slope': (.18, .50, .23, .65), 'right slope': (.82, .50, .87, .65), 'door': (.36, .58, .41, .66), 'near rail': (.11, .78, .15, .95), 'hall band': (.34, .30, .76, .45), 'roof': (.36, .24, .72, .30), 'branch': (.02, .30, .10, .50), 'blossom': (.25, .0, .45, .12)}
def load(f):
    im = Image.open(f).convert('RGB')
    return np.asarray(im.resize((1280, 720), Image.LANCZOS), dtype=np.float32)
def span(a, box):
    h, w, _ = a.shape; x0, y0, x1, y1 = box; p = a[int(y0 * h):int(y1 * h), int(x0 * w):int(x1 * w)].reshape(-1, 3); o = np.argsort(p @ W); n = len(o)
    return [np.median(p[o[max(0, int(n * q) - n // 20):int(n * q) + n // 20]], axis=0).round().astype(int).tolist() for q in (.1, .3, .5, .7, .9)]
c = load('refs/style/c1.png')
print(f"{'region':12s} p10 / p30 / p50 / p70 / p90")
for f in sys.argv[1:]:
    a = load(f)
    for name in C1:
        print(f"{name:12s} c1  " + ' / '.join(' '.join('%3d' % v for v in s) for s in span(c, C1[name])))
        print(f"{'':12s} us  " + ' / '.join(' '.join('%3d' % v for v in s) for s in span(a, US[name])))
