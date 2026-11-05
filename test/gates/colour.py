#!/usr/bin/env python3
"""Colour balance of 州桥's water and willows against the target, region by region. Lead-owned.
Usage: python3 -I test/gates/colour.py <render.png> [<render.png> ...]
Prints the target first. It's a guide to where colour went wrong, and the eye still decides."""
import os, sys
import numpy as np
from PIL import Image

REGIONS = {
    'open water': (.35, .68, 1, .98),
    'under bridge': (.20, .62, 1, .76),
    'near willow': (.15, 0, .55, .45),
    'tower willow': (.84, .30, 1, .50),
}

def stats(path, box):
    image = Image.open(path).convert('RGB')
    w, h = image.size
    crop = image.crop((int(box[0] * w), int(box[1] * h), int(box[2] * w), int(box[3] * h))).resize((400, 160))
    a = np.asarray(crop).astype(float) / 255
    luma = a @ np.array([.2126, .7152, .0722])
    top, low = a.max(2), a.min(2)
    sat = (top - low) / np.maximum(top, 1e-4)
    d = top - low + 1e-6
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    hue = np.where(top == r, ((g - b) / d) % 6, np.where(top == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    return (*np.percentile(luma, [5, 50, 95]), *np.percentile(sat, [50, 90]),
            ((hue < 65) & (sat > .18)).mean(), ((hue >= 65) & (hue < 150) & (sat > .18)).mean(), ((hue >= 150) & (hue < 200) & (sat > .12)).mean())

def main(paths):
    target = os.path.join(os.path.dirname(__file__), '..', '..', 'refs', 'style', 'c2.png')
    for name, box in REGIONS.items():
        print(f'{name:13s} {"luma p5":>8s} {"p50":>5s} {"p95":>5s} {"sat p50":>8s} {"p90":>5s} {"warm":>5s} {"green":>6s} {"teal":>5s}')
        for label, path in [('target', target)] + [(os.path.basename(p), p) for p in paths]:
            print(f'{label[:13]:13s} ' + '{:8.2f} {:5.2f} {:5.2f} {:8.2f} {:5.2f} {:5.2f} {:6.2f} {:5.2f}'.format(*stats(path, box)))

if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1:])
