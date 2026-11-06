# Guide, not a pass mark: value range and local contrast against c2, and the stone's sun and shade in view 1.
# Lead-owned. Numbers can be matched while the picture is still wrong, and the eye decides.
# Usage: python3 -I test/gates/look.py <render.png> [more renders]; a file named view1.png also reports the stone.
import os, sys
import numpy as np
from PIL import Image
W = np.array([.2126, .7152, .0722])
def load(f):
    im = Image.open(f).convert('RGB')
    return np.asarray(im.resize((960, int(960 * im.height / im.width)), Image.LANCZOS), dtype=np.float32) / 255
def report(f):
    a = load(f); l = a @ W; p = np.percentile(l, [1, 5, 25, 50, 75, 95, 99])
    s = (a.max(2) - a.min(2)) / np.maximum(a.max(2), 1e-3)
    def hp(n):
        im = Image.fromarray((l * 255).astype(np.uint8)); b = im.resize((max(1, l.shape[1] // n), max(1, l.shape[0] // n)), Image.BOX).resize((l.shape[1], l.shape[0]), Image.BILINEAR)
        return float(np.std(l - np.asarray(b, dtype=np.float32) / 255))
    name = os.path.basename(f)[:16]
    print(f"{name:17s}" + ' '.join(f'{v:.2f}' for v in p) + f" | {np.percentile(s, 50):.2f} {np.percentile(s, 90):.2f} | {hp(2):.3f} {hp(8):.3f} {hp(32):.3f}")
def stone(f, boxes):
    a = load(f); h, w, _ = a.shape
    for name, (x0, y0, x1, y1) in boxes.items():
        q = a[int(y0 * h):int(y1 * h), int(x0 * w):int(x1 * w)].reshape(-1, 3) * 255; l = q @ W
        lo = np.median(q[l < np.percentile(l, 25)], axis=0); hi = np.median(q[l > np.percentile(l, 75)], axis=0)
        print(f"  {name:12s} shade {' '.join('%3d' % v for v in lo)}   sun {' '.join('%3d' % v for v in hi)}")
print(f"{'image':17s}p1   p5   p25  p50  p75  p95  p99  | sat50 sat90 | hp2   hp8   hp32")
report('refs/style/c2.png')
stone('refs/style/c2.png', {'rail, deck': (.22, .40, .62, .49), 'piers': (.27, .50, .72, .60), 'quay wall': (.06, .50, .17, .64)})
for f in sys.argv[1:]:
    report(f)
    if os.path.basename(f) == 'view1.png': stone(f, {'rail, deck': (.54, .43, .90, .50), 'piers': (.60, .50, .92, .58), 'quay wall': (.10, .52, .20, .65)})
