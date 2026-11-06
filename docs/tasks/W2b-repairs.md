# W2b: repair what the mark layer broke

W2 is a big step. **Stone, the deck, the rails, the sky, the water and views 4, 5 and 6 are accepted. Leave them alone.** The plastic look is gone from those surfaces. But the mark layer and the new shadows broke some other things. Most of them are the same fault: the layer was applied where it doesn't belong.

Compare with `refs/style/c2.png` and `refs/style/crops/`, at 1080p. Keep to 州桥, with 宣德楼 locked.

## 1. Brackets and fine timber: a regression, and the first priority

In W1 the bracket sets were readable. Now the area under the eaves in views 1, 2, 4 and 7 is a brown, chunky mush like bark. In `c2` each bracket is crisp and warm, with dark gaps between them. This is the main architectural detail of the scene, and the client asked for more detail.

- Members smaller than a mark can't take light per mark. Brackets, rafters, lattice, balcony rails and anything similarly fine go back to per-fragment light with crisp shadow and occlusion, and carry marks only as a faint modulation.
- They must end up at least as readable as `out/W1/`, and preferably better.
- The eave tips show a stair-stepped edge at the end of the roof, in view 2 most clearly. Check whether that's new, and fix it if it is.

## 2. Tower walls and timber are too dark

| | `c2` | Ours |
|---|---|---|
| Wall | 202 160 141 | 110 90 82 |
| Timber, median of the saturated pixels | 236 139 96 | 188 114 70 |

- The walls read as grey concrete. Most of it is shadow from the mid-distance willows standing in front of the towers. Those trees shouldn't cast on the towers: take them out of the shadow map, or otherwise stop it, since `c2` has its walls in sun. Keep the eave shadow at the top of the wall.
- In shade, plaster should still be warm: about 120 98 88 in `c2`, not grey-green. In sun it's cream, about 249 207 155.
- Timber: don't change its hue. It needs to be brighter in sun, and it should keep more warmth in shade, so that columns and beams glow red-orange the way they do in `c2`.

## 3. Hero trunk

It's flat tan with big dark blotches, like a giraffe, and it has lost its round form. The numbers match `c2` and the picture is wrong, which is exactly what we were warned about.

- **Form first:** the lit side is warm and the far side falls into cool dark shade. You should see a round trunk turning away from the sun.
- **Then bark:** long, narrow, overlapping strokes following the growth, several times finer than today's plates, in dark umber, warm brown and a few gold highlights on the ridges. See `refs/style/crops/c2-near.jpg`.
- Also the limbs in views 1 and 7.

## 4. Boat

It went dark and burnt, and its planks have gone. `c2`'s boat is honey-brown wood with clear planks and seats, and pools of sun.

- The expanded tree shade swallowed it. Let sun reach it: a large part of the hull and seats should be lit, in dappled pools.
- Planks, seats and ribs must read clearly, in warm mid-browns, lit about 185 150 110, shade about 90 70 50, and darkest only in gaps and deep inside. It's a boat in sunlight.
- The rough marks across it should be smaller and follow the planks.

## 5. Willows

Same failure as D4b: too saturated, too uniform, too solid. `colour.py` says near willow sat p50 .46 against .33 and tower willow luma p50 .48 against .61.

- **Near leaves (views 1, 3).** `c2` has real variety leaf to leaf. Give each leaf one of several pigments: about 15% golden yellow, 40% olive, 30% muted sage and 15% deep blue-green. Sun-facing and outer leaves lean gold, and inner ones lean deep. Today's are nearly one olive.
- **Mid-distance willows (views 1, 2, 3, 4, 5, 7).** These became dark shrubs. W2's "dark inner crown" was my instruction, and it was meant for the near tree only. In `c2` they're luminous yellow-green and airy, brightest at the top, with individual strands visible at the edges and sky or wall showing through. Bring back gaps. Their colour moves toward yellow, not green.

## 6. Shadow edges and shade on the ground

In view 3 the tree's shadow on the paving is broken into chunky, near-square blocks, and it looks pixelated. The shade is a single slate colour.

- At the shadow's edge, use irregular, elongated marks of several sizes, a little softer. It should read as dappled light through leaves, with some small pools of sun and some larger ones.
- Inside the shade, mix in warmer strokes of reflected light, so it's not one flat colour. The median can stay near 102 100 113.

## 7. Far trees

The rounded crowns in views 5 and 7 are the smoothest things left. Give them the same kind of soft dabs, at low contrast. Don't make them brighter or stronger.

## Keep

`node test/gates/views.mjs out/W2b`, `perf.mjs` at most 480 ms on 州桥, `shimmer.py` under .05% on views 1, 3, 4 and 7, the specs, and `scroll.mjs` after `build.mjs`. Report in the usual format, with `look.py` and `colour.py` on view 1. Attach 1080p crops of the brackets in view 2, the trunk in view 3, the boat in view 1, and a near and a mid willow. Say what's still the most plastic.
