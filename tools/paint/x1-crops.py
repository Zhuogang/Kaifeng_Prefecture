"""Native X1/reference crops and the lead's unmasked measurements.
Run: python3 -I tools/paint/x1-crops.py
"""
import contextlib
import io
import json
import runpy
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

root = Path('out/X1')
dest = root / 'native-crops'
dest.mkdir(exist_ok=True)
im = Image.open(root / 'f0.png').convert('RGB')
assert im.size == (1920, 1080)
reference = Image.open('refs/style/c1.png').convert('RGB')
items = [
    ('hall', (570, 180, 1490, 505), Image.open('refs/style/crops/c1-hall.jpg').convert('RGB')),
    ('wall-and-door', (650, 492, 1390, 735), Image.open('refs/style/crops/c1-wall.jpg').convert('RGB')),
    ('near-rail', (20, 810, 620, 1080), Image.open('refs/style/crops/c1-near.jpg').convert('RGB').crop((0, 140, 600, 393))),
    ('branch', (0, 100, 930, 600), reference.crop((0, 70, 630, 460))),
]
for name, box, ref in items:
    crop = im.crop(box)
    crop.save(dest / (name + '.png'))
    ref.save(dest / (name + '-c1.png'))
    pair = Image.new('RGB', (ref.width + crop.width + 16, max(ref.height, crop.height) + 28), '#d8d1c1')
    pair.paste(ref, (0, 28))
    pair.paste(crop, (ref.width + 16, 28))
    draw = ImageDraw.Draw(pair)
    draw.text((6, 8), 'c1 reference - native crop', fill='#222222')
    draw.text((ref.width + 22, 8), 'X1 fraction 0 - native 1080p crop', fill='#222222')
    pair.save(dest / (name + '-vs-c1.png'))

with contextlib.redirect_stdout(io.StringIO()):
    guide = runpy.run_path('test/gates/look-xuande.py')
table = {}
for label, path, boxes in [('c1', 'refs/style/c1.png', guide['C1']),
                           ('before', 'out/X1/baseline/f0.png', guide['US']),
                           ('X1', 'out/X1/f0.png', guide['US'])]:
    image = guide['load'](path)
    table[label] = {name: guide['span'](image, box) for name, box in boxes.items()}
result = {'method': 'Unmasked, unchanged lead look-xuande.py load/span at p10/p30/p50/p70/p90', 'regions': table}
base = json.loads((root / 'baseline-hash/render-metrics.json').read_text())['metrics']
now = json.loads((root / 'render-metrics.json').read_text())['metrics']
result['reflection'] = [{'fraction': a['fraction'], 'identical': a['reflection'] == b['reflection'],
                         'before': a['reflection'], 'after': b['reflection']} for a, b in zip(base, now)]
assert all(row['identical'] for row in result['reflection']), 'accepted canal reflection target is unchanged'
for label, box in [('near-canal', (60, 950, 140, 1000)), ('far-canal', (330, 760, 390, 780))]:
    before = np.asarray(Image.open(root / 'baseline/f0.png').convert('RGB').crop(box)).astype(float)
    after = np.asarray(im.crop(box)).astype(float)
    d = np.abs(before - after)
    result[label] = {'box': box, 'max_channel_difference': int(d.max()), 'mean_channel_difference': float(d.mean()),
                     'pixels_over_2_percent': float(100 * (d.max(2) > 2).mean())}
(root / 'measurements.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
