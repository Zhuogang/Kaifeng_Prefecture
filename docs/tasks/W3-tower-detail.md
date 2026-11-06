# W3: tower detail and final touches

W2b is accepted. The surfaces no longer look plastic. **Accepted, don't change: stone, the deck, rails, the sky, the water, near leaves, the paving and shade, views 5 and 6.**

The client asked for more detail. The biggest gap to `c2` is now the towers, which take the eye in nearly every view. Put `refs/style/crops/c2-mid.jpg` beside a 1080p crop of view 2 and you'll see it: `c2`'s towers are full of crisp structure, and ours are large flat shapes. Still 州桥 only, with 宣德楼 locked.

You may spend geometry here: up to 1.4 M triangles in any view (today 1.08 M), with the same limit of 50 calls.

## 1. Roofs: tile rows must read

Our roofs are a nearly flat slate colour with a faint texture. In `c2` you can count the rows: each is a lit ridge beside a dark valley, running down the slope, with a row of tile ends along the eave, and a clear ridge line with its 鸱尾.

- Each tile row should read at view 2's distance, where the near tower's roof is about 500 px wide: a lit crest and a dark valley, with real contrast. Use the existing tile rows and `tileCoord`. Light and occlude them per fragment, and take marks off them, or nearly.
- Vary value row by row and along the slope: old tiles, some lighter patches, darker near the eaves. Sun on the slope facing it, cool shade on the other.
- A clear row of tile ends along the eave, and a stronger ridge line.
- Rows should fade out before they alias: no shimmer in views 1 or 7, where they're small.
- The small steps at the eave tips, which you found already exist, show clearly at this size. Fix them if it's cheap.

## 2. Brackets: dark gaps and lit faces

They're readable again, but they still read as a band of brown cobbles under a bright orange eave. In `c2` each set is distinct: bright warm faces, near-black gaps between sets, and shadow from the eave falling across the top of them.

- The gaps between and behind bracket members go much darker: dark umber, not mid brown. That dark is what gives this zone its depth. It's the main thing missing.
- Faces toward the sun are warm and bright, and the eave's real shadow falls across the upper part.
- Separate the layers: rafter ends, then brackets, then the beam below, with a dark line between each.
- If a hero tower's bracket geometry is too coarse for this at view 4's distance, where it's large, refine it. That's what the triangle budget is for.

## 3. Timber: dark accents, not a new hue

I measured columns against `c2`, and hue and brightness are about right, so don't shift them. It reads as flat tangerine because nothing dark sits next to it. Add dark lines where members meet, shadowed edges on beams and lintels, a darker, shaded balcony underside, and a slightly lighter worn edge on the corners. Slightly less saturation in the brightest areas is fine.

## 4. Tower walls: cream stone courses

Still blotchy, in cream and grey-brown patches. `c2`: cream ashlar, with fine, regular courses visible, a shade darker near the ground, above a clear stone plinth. Use `paintedStone` with courses at a size that reads in view 2. Remove the blotches. The doorway should be deep and dark, with a clear lintel.

## 5. Final touches

- **Trunk in view 3.** It's a bit flat and sandy now. Keep the form and stroke direction, but deepen it: many more dark umber furrows, darker overall by about 15%, and a few gold highlights on ridges. It should feel old and heavy like `c2`'s.
- **Boat.** The planks are back, but it's too pale and scratchy, like straw. Darker honey-brown overall, by about 20%, with fewer and smaller pale scratches. Keep the sun pools and plank separation.
- **Mid-distance willows.** Better, but chalky, and thin dark spikes stick out of the crown tops. Remove the spikes. Add depth: yellower and brighter at the top and sunny side, a darker olive lower and inside, still airy at the edges. `colour.py` for the tower willow has its green fraction at .09 against .02: move toward yellow.

## Keep

`node test/gates/views.mjs out/W3`, `perf.mjs` at most 480 ms on 州桥, `shimmer.py` under .05% on views 1, 2, 4 and 7, the specs, and `scroll.mjs` after `build.mjs`.

## Report

The usual format. Attach 1080p crops of a tower's roof and brackets in views 2 and 4 next to `c2-mid.jpg`, the trunk in view 3, the boat in view 1, and a mid willow. Say what's still furthest from `c2`.
