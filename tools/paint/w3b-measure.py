"""W3b evidence: saturated red timber, native crops and accepted-region checks.
Run: python3 -I tools/paint/w3b-measure.py [out/W3b or its scout directory]
The brief supplies quantiles but no exact mask; this records one common HSV
selection for the reference, accepted W3 and W3b, with fixed tower rectangles.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

root = Path(sys.argv[1] if len(sys.argv) > 1 else 'out/W3b')
assert root == Path('out/W3b') or Path('out/W3b') in root.parents
reference_boxes = [(830, 220, 1140, 430), (1190, 95, 1672, 440)]
render_boxes = [(935, 245, 1280, 510), (1315, 120, 1900, 515)]


def timber(path, boxes):
    im = Image.open(path).convert('RGB')
    a = np.concatenate([np.asarray(im.crop(box)).reshape(-1, 3) for box in boxes]).astype(float) / 255
    top, low = a.max(1), a.min(1)
    delta = np.maximum(top - low, 1e-6)
    r, g, b = a.T
    hue = np.where(top == r, ((g - b) / delta) % 6,
                   np.where(top == g, (b - r) / delta + 2, (r - g) / delta + 4)) * 60
    saturation = (top - low) / np.maximum(top, 1e-6)
    mask = (hue >= 10) & (hue < 35) & (saturation > .4)
    return {'boxes': boxes, 'pixels': int(mask.sum()),
            'rgb_p25_p50_p75': np.percentile(a[mask] * 255, [25, 50, 75], axis=0).round(2).tolist(),
            'median_hue_degrees': round(float(np.median(hue[mask])), 2)}


def difference(a, b, box=None):
    a, b = Image.open(a).convert('RGB'), Image.open(b).convert('RGB')
    if box is not None:
        a, b = a.crop(box), b.crop(box)
    d = np.abs(np.asarray(a).astype(float) - np.asarray(b).astype(float))
    return {'box': box, 'mean_channel_difference': float(d.mean()),
            'maximum_channel_difference': int(d.max()), 'pixels_over_2_percent': float(100 * (d.max(2) > 2).mean())}


result = {'mask': 'HSV hue >= 10 and < 35 degrees; saturation > 0.40, native pixels',
          'c2': timber('refs/style/c2.png', reference_boxes),
          'W3': timber('out/W3b/baseline/view1.png', render_boxes),
          'W3b': timber(root / 'view1.png', render_boxes)}
for v in (5, 6):
    if (root / f'view{v}.png').exists():
        result[f'preserved-view{v}'] = difference(f'out/W3b/baseline/view{v}.png', root / f'view{v}.png')
if (root / 'view3.png').exists():
    result['preserved-trunk'] = difference('out/W3b/baseline/view3.png', root / 'view3.png', (200, 260, 500, 780))
for name, box in {'water': (1100, 730, 1850, 1040), 'near-leaves': (500, 0, 1050, 260),
                  'paving': (0, 940, 270, 1080), 'pier': (1310, 553, 1355, 620),
                  'deck': (920, 523, 990, 538), 'rail': (630, 493, 660, 548),
                  'rope': (196, 789, 322, 845), 'tile-rows': (1530, 184, 1710, 217),
                  'cream-courses': (1420, 405, 1450, 445)}.items():
    result['preserved-' + name] = difference('out/W3b/baseline/view1.png', root / 'view1.png', box)

dest = root / 'native-crops'
dest.mkdir(exist_ok=True)
for name, v, box in [('tower-view2', 2, (1155, 120, 1800, 570)), ('tower-view4', 4, (0, 0, 1120, 690)),
                      ('boat-view1', 1, (390, 740, 1095, 980)), ('mid-willow-view1', 1, (1640, 280, 1910, 560))]:
    im = Image.open(root / f'view{v}.png').convert('RGB')
    assert im.size == (1920, 1080)
    crop = im.crop(box)
    crop.save(dest / (name + '.png'))
    before = Image.open(f'out/W3b/baseline/view{v}.png').convert('RGB').crop(box)
    pair = Image.new('RGB', (crop.width * 2 + 12, crop.height + 26), '#d8d1c1')
    pair.paste(before, (0, 26))
    pair.paste(crop, (crop.width + 12, 26))
    draw = ImageDraw.Draw(pair)
    draw.text((6, 7), 'Accepted W3 - native 1080p crop', fill='#222222')
    draw.text((crop.width + 18, 7), 'W3b - native 1080p crop', fill='#222222')
    pair.save(dest / (name + '-before-after.png'))

(root / 'measurement.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
