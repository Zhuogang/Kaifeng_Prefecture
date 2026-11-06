# Guide, not a pass mark: how much of each bracket band is lit timber, pale panel or dark gap. Lead-owned. The eye decides.
# Usage: python3 -I test/gates/look-band.py <zhou-view1.png> <xuande-f0.png>  (fraction 0, 1920x1080)
import sys
import numpy as np
from PIL import Image
W = np.array([.2126, .7152, .0722])
def row(name, f, box):
    x0, y0, x1, y1 = box
    p = np.asarray(Image.open(f).convert('RGB'), dtype=np.float32)[y0:y1, x0:x1].reshape(-1, 3)
    lum, warm = p @ W, p[:, 0] - p[:, 2]
    print(f"{name:24s} pale panel {((lum > 125) & (warm < 55)).mean():.2f}  lit timber {((warm >= 30) & (lum > 85) & (lum <= 165)).mean():.2f}  dark gap {(lum < 85).mean():.2f}")
row('c2 tower upper band', 'refs/style/c2.png', (1275, 205, 1605, 245))
row('us tower upper band', sys.argv[1], (1465, 235, 1755, 280))
row('c1 hall band', 'refs/style/c1.png', (560, 310, 1300, 350))
row('us hall band', sys.argv[2], (640, 345, 1270, 395))
