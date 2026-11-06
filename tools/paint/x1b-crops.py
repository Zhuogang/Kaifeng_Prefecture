"""Native X1b/reference crops and the lead's unmasked measurements.
Run: python3 -I tools/paint/x1b-crops.py
"""
import contextlib
import io
import json
import runpy
import os
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

root = Path(os.environ.get('X1B_RENDER', 'out/X1b'))
assert root == Path('out/X1b') or Path('out/X1b') in root.parents
dest = root / 'native-crops'
dest.mkdir(exist_ok=True)
im = Image.open(root / 'f0.png').convert('RGB')
assert im.size == (1920, 1080)
reference = Image.open('refs/style/c1.png').convert('RGB')
items = [
    ('roof', (550, 180, 1510, 345), reference.crop((450, 145, 1340, 310))),
    ('hall-band', (575, 340, 1480, 495), reference.crop((460, 305, 1340, 440))),
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
    draw.text((ref.width + 22, 8), 'X1b fraction 0 - native 1080p crop', fill='#222222')
    pair.save(dest / (name + '-vs-c1.png'))

with contextlib.redirect_stdout(io.StringIO()):
    guide = runpy.run_path('test/gates/look-xuande.py')
table = {}
for label, path, boxes in [('c1', 'refs/style/c1.png', {name: pair[0] for name, pair in guide['BOXES'].items()}),
                           ('before', 'out/X1b/baseline/f0.png', {name: pair[1] for name, pair in guide['BOXES'].items()}),
                           ('X1b', str(root / 'f0.png'), {name: pair[1] for name, pair in guide['BOXES'].items()})]:
    image = guide['load'](path)
    table[label] = {name: guide['span'](image, box) for name, box in boxes.items()}
result = {'method': 'Unmasked, unchanged lead look-xuande.py load/span at p10/p30/p50/p70/p90', 'regions': table}
baseline = json.loads((Path('out/X1b/baseline/render-metrics.json')).read_text())
current = json.loads((root / 'render-metrics.json').read_text())
assert baseline['flowerGeometry'] == current['flowerGeometry'], 'flower positions, normals, UV, wind and indices are unchanged'
result['flowerGeometryUnchanged'] = True
if baseline.get('mirrorProof') and current.get('mirrorProof'):
    assert baseline['mirrorProof']['legacy'] == current['mirrorProof']['legacy'], 'reflection source is unchanged after removing only the new limb vertices/indices'
    result['legacyReflectionSourceUnchanged'] = True
    result['newLimbVertices'] = current['mirrorProof']['newLimbVertices']
base = baseline['metrics']
now = json.loads((root / 'render-metrics.json').read_text())['metrics']
result['reflection'] = [{'fraction': a['fraction'], 'identical': a.get('reflection') == b.get('reflection'),
                         'before': a.get('reflection'), 'after': b.get('reflection')} for a, b in zip(base, now)]
# The brief permits only the new limbs in the reflection; inspect separately.
for label, box in [('near-canal', (60, 950, 140, 1000)), ('far-canal', (330, 760, 390, 780))]:
    before = np.asarray(Image.open(Path('out/X1b/baseline/f0.png')).convert('RGB').crop(box)).astype(float)
    after = np.asarray(im.crop(box)).astype(float)
    d = np.abs(before - after)
    result[label] = {'box': box, 'max_channel_difference': int(d.max()), 'mean_channel_difference': float(d.mean()),
                     'pixels_over_2_percent': float(100 * (d.max(2) > 2).mean())}
(root / 'measurements.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
