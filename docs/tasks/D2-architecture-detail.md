# D2: detail on the buildings and the bridge

The client approved the look ("everything is good") and wants it **more detailed**. This is the first of three detail rounds. It covers buildings and the stone bridge, in both scenes, because that's the largest visible gap against the targets.

**Add to what's there. Don't replace it.** Palette, composition, light and painterly character are approved. If a change makes something look different rather than more detailed, it's wrong.

## Compare like this

`python3 -I test/gates/crops.py c1 <view 0 render> out/D2/crops` stacks the target above your render, region by region (`hall`, `wall`, `near`, `tree`, `far` for c1, and `mid`, `near`, `tower`, `trunk`, `water` for c2). Render view 0 at **1920×1080** for this, because that's what the client sees. Open the crops and look. Close-up targets are in `refs/style/crops/`.

## The roofs: every hall, both scenes

Today they're smooth slate with faint lines. In the targets a roof is mostly tile rows.

- **Tile rows run down the slope as long ridged lines**, following the curve to the eave, with a lit top and a dark gutter. In `c1-hall` the main hall shows about 70 to 80 rows across its width. The lit side is cool blue-grey and the gutters are near ink.
- Light moves **across** the rows in long irregular patches, so some stretches are paler or darker, with occasional broken or uneven tiles. The rows should not read as a perfect comb.
- **Build the rows into the roof shading,** from a coordinate that follows each roof surface down the slope, with derivative filtering so they fade out cleanly when they get finer than about 1.5 pixels. Where a roof is large on screen, a real ridged profile in the lighting beats painted stripes.
- **Ridges are real geometry:** a thick main ridge with a visible top face and shaded side, and raised hip ridges coming down the corners. At the tip of a hip ridge, a few small nubs (see `c1-hall`, right end). No Qing dragons, no yellow. The 鸱尾 stay as they are.
- **Eave edge:** a row of drip tiles along every eave, as a dotted rim, then the vermilion fascia below, then a rhythm of rafter ends in the shade beneath.

## Brackets and the frame

Today they read as stacked bars. The targets have a clear structure, so match it:

- **At each column head, a stepped pyramid of arms.** About three tiers, widening upward. Each arm is a bar with a shaped, curved-off end, sitting on small square blocks (斗), and a lever projects outward toward the viewer through the middle. See `c1-hall`: it reads as a fan of arms, with dark gaps between the tiers.
- **Between columns, a smaller, lighter set,** on an inverted-V strut or small block. The rhythm of big and small sets across the front is a large part of the target's richness.
- **Colour:** vermilion faces, deep red-brown undersides, a warm lit edge. Occasional muted gold or green on blocks. Keep it subtle.
- **Beams:** two long tie beams run across the column heads, with flat corbels (雀替) where they meet the columns.
- **Columns:** round, with lit and shaded sides, and subtle vertical wear in the paint.
- **Behind the columns:** dark interior with panelled doors and lattice, not an empty dark box or a flat wall.
- **Rails on the terrace and galleries:** posts that rise above two rail bars, with a pale stone slab along the terrace edge beneath. Corridors get the same treatment, with tiled roofs.
- `c2-mid` and `refs/style/crops/c2-mid.jpg`: the towers need the same bracket pyramids and rail. The right tower has a stone-faced base with a tall dark-framed doorway and vermilion posts.

Use instancing and keep it in `src/paint/halls.js` and the batches, so all halls benefit. Keep the rule from `docs/YINGZAO.md`: these are big Song brackets, not dense Qing clusters.

## The bridge: 州桥

Today the piers and their bright reflection merge into one tan band with dark rectangles. In `c2-mid`, it's the opposite:

- **Paired piers of stacked stone blocks:** a wide one and a thin one, about four or five visible courses, with uneven blocks, lit fronts and shaded sides.
- **Real gaps:** between piers you see through to bright water and the far bank, with a dark shadowed underside of the deck above. This separation is the main point.
- **Deck:** two layers of long stone beams, with a cornice edge catching light, then a shadow line.
- **Balustrade:** regular square posts with caps, with solid carved panels between them. It's pale warm stone.
- **Water contact:** a dark line where each pier meets the water, so the piers stand in the water, not on it. In the reflection, pier colour must stay separate from pier to pier, with dark teal between. D4 handles water strokes, but this separation is yours, because it's what makes the bridge read.
- **The stone quay to the right of the bridge** has large ashlar courses in the same stone.

## Limits

- **Cost:** `node test/gates/perf.mjs` under **230 ms for 宣德楼 and 400 ms for 州桥**, per-pixel under 80 ms in each, at most 40 calls and 1.2 M triangles. The original 351 and 638 ms held 60 FPS on the client's RTX 3070 Laptop, so that's the ceiling for all three rounds, and later rounds need room.
- **Motion:** detail must be filtered. Fixed-camera `python3 -I test/gates/shimmer.py` under .05%, and fine rows and lattice must not crawl or sparkle along the path. Check with a clip through `tools/paint/clip.mjs` (adjust its output folder if you need to), and look at consecutive frames.
- **Wider angles:** the extremes sheet from `tools/paint/extremes.mjs` must still hold.
- **Don't regress:** `node --test test/*.spec.mjs`, `node tools/build.mjs` then `node test/gates/scroll.mjs`, and `?world=1` unchanged.

You own `src/paint/`, `src/modules/paint_*.js` and `tools/paint/`.

## Report

The usual format, plus: the crops you looked at and your honest comparison with the target for each, and perf gate output before and after.
