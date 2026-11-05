#!/usr/bin/python3 -I
# Lead-owned. Shimmer on consecutive frames from a FIXED camera: a pixel that jumps one way and straight back between
# frames is flicker, not motion. Usage: python3 -I test/gates/shimmer.py <dir with f0000.png, f0001.png, ...>
import sys, glob
from PIL import Image
import numpy as np
frames = [np.asarray(Image.open(f).convert('RGB')).astype(float).mean(-1) for f in sorted(glob.glob(sys.argv[1] + '/f*.png'))]
rates = []
for a, b, c in zip(frames, frames[1:], frames[2:]):
    d1, d2 = b - a, c - b
    rates.append(100 * ((d1 * d2 < 0) & (abs(d1) > 20) & (abs(d2) > 20)).mean())
print(f'{len(frames)} frames; pixels reversing by more than 20 levels: mean {np.mean(rates):.3f}%, worst {max(rates):.3f}%')
