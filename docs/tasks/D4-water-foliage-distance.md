# D4: water, foliage and distance

This is the last detail round. The buildings, bridge and near stone are now good, so leave what's working alone. Look at `out/gate-D3/both.jpg`, and compare at 1920×1080 with `test/gates/crops.py` and `refs/style/crops/`.

## First, four faults left over from D3

1. **州桥's kerb stones and mooring post look like pale soap.** They've lost their stone. In `c2-near`, kerb stones are rough mid-tone stone with warm lit tops and shaded sides, and leaf dapple crossing them. Use the D3 recipe with a darker base (about `#a89a84` on faces, about `#d8c8a8` on lit tops), and make the dapple fall across them.
2. **州桥's paving is a plain pink surface.** Give it slabs and joints like 宣德楼's, warm peach in light and cool violet in shade, as in `c2-near`.
3. **Pale grey-green blocks behind the trees at the far right of 宣德楼** (about x .93, y .5 of the frame in view 0, and more visible at wider angles). Find out what these are. They don't read as anything. Replace them with what `c1-far` shows: soft distant tree masses and a few far rooftops, fading into warm haze.
4. **宣德楼's near-rail posts have even vertical stripes** like a barcode. Make the wear irregular, and along the rail's length as dry-brush, not parallel stripes.

## Water

Today it has big smooth wobbling shapes. The target's water (`c2-near`, `c2-water`) is made of many small horizontal strokes over a deep colour.

- **Strokes:** two or three layers of elongated horizontal dashes, about 15:1 to 25:1, in deep teal (about `#2f6f66`) and pale jade (about `#a9cbb5`), small and dense in the distance, longer and broader close up. They sit in water-plane perspective. They drift slowly, and must not flicker or shimmer.
- **Depth of colour:** the foreground is deeper and more saturated teal than today, and it lightens toward the far bank. Today's water is too pale and milky.
- **Reflections:** smaller-scale distortion. Today's large distortion is what makes the blobs. Reflections should be **vertical smears broken up by horizontal ripple dashes**, darker and less saturated than what they reflect. Piers and towers keep separate columns of colour with teal between them. The bridge shouldn't produce a second pale copy of itself, or a solid orange band.
- **Boat:** a dark contact shadow below the hull, with warm streaks from the hull's reflection, as in `c2-near`.
- **宣德楼's canal** uses the same shader, so it benefits too. In `c1-near`, it reflects blossom, trees and rails in soft vertical smears.

## Foliage

- **Near willow (`c2-mid`, `trunk`):** today's leaves are thin grey-green dashes. In the target they're lance-shaped spears, wider and more varied, in three clear values: backlit yellow-green (about `#c9c56a`), mid (about `#8fa04e`), dark (about `#4d6b3a`). They're grouped along whips, with interior whips darker. Make near leaves about 1.5 times wider and warmer, and keep each whip's silhouette.
- **Mid-distance willows:** they read as shaggy lumps with a hard outline. Give them a domed volume, with a lit top, a dark interior, a drooping fringe of whips and a trunk just visible.
- **Blossom (`c1-tree`):** keep the flowers. Add twigs threading through the clusters, deep-pink shadow inside the clusters, buds and a few tiny fresh green leaves. Add more depth, so it doesn't read as one flat layer.
- **Background blossom trees:** more of them, receding along both banks into haze, as in the target. A few petals on the ground beneath them.
- **Grass in 宣德楼:** a flat green field today. Paint it with overlapping tufts and brush marks in yellow-green and olive, lit edges, and the odd scatter of fallen petals. Keep the value and colour family, so it doesn't draw attention.

## Distance

- **州桥 (`c2-mid`):** in the target, a rich cluster of roofs sits in warm haze left of the towers, among round trees in tan and olive. Add two or three more halls and some broadleaf trees, in layers that fade with distance. Use real tile rows on the nearer ones. Add a small pavilion roof at the base of the right tower if it fits, as in `c2-mid`.
- **宣德楼 (`c1-far`, `tree`):** far bank tree rows and hints of roofs above the side walls.

## Limits

- **Add. Don't restyle.** The palette, light and composition stay.
- `node test/gates/perf.mjs`: at or under **351 ms for 宣德楼 and 638 ms for 州桥**, per-pixel under 80 ms. At most 50 calls and 1.6 M triangles. These are the original costs that held 60 FPS on the client's RTX 3070 Laptop, so this is a hard ceiling. A 3070 is mostly limited by fragment work, so avoid heavy overdraw from extra foliage layers: use fewer, larger, well-placed leaves rather than a lot more of them.
- **Motion:** water strokes and leaves stay calm. `python3 -I test/gates/shimmer.py` under .05% on 10 fixed-camera frames, and no sparkling on the water. Look at the clip.
- **Reflections at the lower adaptive-quality rungs** must still look reasonable. Check one.
- `tools/paint/extremes.mjs` holds, in particular that distant additions hold at wide angles. `node --test test/*.spec.mjs` and `node test/gates/scroll.mjs` pass.
- Render view 0 at 1920×1080 and look at the crops before reporting. Report honestly against the target, crop by crop.

You own `src/paint/`, `src/modules/paint_*.js` and `tools/paint/`.
