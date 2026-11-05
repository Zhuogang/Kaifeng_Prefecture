#!/usr/bin/python3 -I
# Lead-owned. Surface detail against a target: band-pass energy per region, for luma and for warm-cool chroma, at a
# fine band (about 2 to 6 px) and a medium band (about 6 to 24 px) at 1280x720. A ratio of 1 means the same amount of detail.
# Usage, from the repo root: python3 -I test/gates/detail.py <c1|c2> <render.png>
import sys
from math import ceil
from PIL import Image
import numpy as np
SC = dict(
  c2=dict(trunk=(0,.45,.09,.78), limb=(.1,.08,.28,.25), parapet=(.25,.43,.8,.49), columns=(.25,.50,.8,.57), water_mid=(.45,.60,1,.80),
          water_low=(.6,.85,1,1), tower=(.75,.2,.97,.45), paving=(0,.82,.2,1), boat=(.25,.74,.5,.86)),
  c1=dict(hero_trunk=(0,.12,.12,.42), roof=(.33,.25,.70,.30), hall=(.34,.34,.70,.45), wall=(.33,.48,.73,.555), doors=(.365,.575,.705,.665),
          left_trees=(0,.40,.28,.68), avenue=(.40,.72,.95,.98), canal=(.02,.75,.15,.95), rail=(.13,.80,.27,.97)))
def load(path): return Image.open(path).convert('RGB').resize((1280, 720), Image.LANCZOS)
def blur(a, s):
    r = int(ceil(s * 3)); k = np.exp(-np.arange(-r, r + 1) ** 2 / (2 * s * s)); k /= k.sum()
    a = np.apply_along_axis(lambda m: np.convolve(m, k, 'same'), 0, a)
    return np.apply_along_axis(lambda m: np.convolve(m, k, 'same'), 1, a)
def bands(image):
    a = np.asarray(image).astype(float) / 255
    out = []
    for channel in (.2126 * a[..., 0] + .7152 * a[..., 1] + .0722 * a[..., 2], a[..., 0] - a[..., 2]):
        g1, g3, g9 = blur(channel, 1.0), blur(channel, 3.0), blur(channel, 9.0)
        out += [g1 - g3, g3 - g9]
    return out
def patchiness(band):
    # How unevenly fine marks are spread: the variation of local mark energy over its mean, per region. Even speckle is low. Patches are high.
    return blur(np.abs(band), 10.0)
scene, render = sys.argv[1], sys.argv[2]
T, R = bands(load(f'refs/style/{scene}.png')), bands(load(render))
print(f"{'region':11s}  ratio Lfine Lmed Cfine Cmed   (keep each between .7 and 1.3)   patchiness target render ratio (at least .7)")
worst = []; PT, PR = patchiness(T[0]), patchiness(R[0]); low = 0
for name, (x0, y0, x1, y1) in SC[scene].items():
    s = (slice(int(y0 * 720), int(y1 * 720)), slice(int(x0 * 1280), int(x1 * 1280)))
    ratios = [r[s].std() / t[s].std() for t, r in zip(T, R)]
    worst += [x for x in ratios if x < .7 or x > 1.3]
    pt, pr = PT[s].std() / PT[s].mean(), PR[s].std() / PR[s].mean(); low += pr / pt < .7
    print(f"{name:11s}        " + '  '.join(f'{x:4.2f}' + ('*' if x < .7 or x > 1.3 else ' ') for x in ratios) + f'      {pt:4.2f} {pr:4.2f} {pr / pt:4.2f}' + ('*' if pr / pt < .7 else ''))
print(f'{len(worst)} of {4 * len(SC[scene])} outside .7 to 1.3; {low} of {len(SC[scene])} too even')
