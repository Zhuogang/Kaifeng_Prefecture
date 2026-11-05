#!/usr/bin/env python3
"""Target beside render, region by region, so detail can be judged at reading size. Lead-owned.
Usage: python3 -I test/gates/crops.py <c1|c2> <render.png> <out-dir> [region]
Regions are fractions of the frame, so view 0 at any 16:9 size lines up with the target.
Each output stacks the target region above the same region of the render."""
import os, sys
from PIL import Image

REGIONS = {
    'c1': {'hall': (.26, .16, .78, .50), 'wall': (.28, .46, .78, .72), 'near': (0, .62, .55, 1), 'tree': (0, 0, .35, .62), 'far': (.70, .40, 1, .75)},
    'c2': {'mid': (.05, .10, 1, .62), 'near': (0, .52, .60, 1), 'tower': (.68, .10, 1, .52), 'trunk': (0, 0, .30, 1), 'water': (.15, .55, 1, 1)},
}

def main(target, render_path, out, only=None):
    root = os.path.join(os.path.dirname(__file__), '..', '..', 'refs', 'style', target + '.png')
    wanted, render = Image.open(root).convert('RGB'), Image.open(render_path).convert('RGB')
    os.makedirs(out, exist_ok=True)
    for name, (x0, y0, x1, y1) in REGIONS[target].items():
        if only and name != only:
            continue
        box = lambda image: (int(x0 * image.width), int(y0 * image.height), int(x1 * image.width), int(y1 * image.height))
        a, b = wanted.crop(box(wanted)), render.crop(box(render))
        width = max(a.width, b.width, 1100)
        a = a.resize((width, a.height * width // a.width), Image.LANCZOS)
        b = b.resize((width, b.height * width // b.width), Image.LANCZOS)
        sheet = Image.new('RGB', (width, a.height + b.height + 6), (255, 255, 255))
        sheet.paste(a, (0, 0)); sheet.paste(b, (0, a.height + 6))
        path = os.path.join(out, f'{target}-{name}.jpg')
        sheet.save(path, quality=88)
        print(path)

if __name__ == '__main__':
    if len(sys.argv) < 4:
        sys.exit(__doc__)
    main(*sys.argv[1:5])
