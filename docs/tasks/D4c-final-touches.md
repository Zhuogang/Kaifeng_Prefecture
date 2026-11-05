# D4c: final touches to 州桥

The water and willows are now very good. **Do not change their colour or the reflection strength.** `python3 -I test/gates/colour.py <render>` must stay where it is. This is a small round, with four items. Compare with `out/gate-D4b/pair.jpg`, where the target is on top.

1. **The hard diagonal line across the water.** It runs just below the bridge, from about (.10, .68) to (.87, .61) of the frame in view 0, where the reflection of the deck ends and the reflected sky begins. Nothing in the target's water has a long hard edge. Break it up in the reflection lookup: a stroke-based **vertical** offset in where the reflection is sampled, strongest at grazing angles, so that any long horizontal edge in the reflection breaks into overlapping dashes. It mustn't change the colour balance or make the reflection blobby again.

2. **Kerb stones and mooring post are still pale and soapy.** In `refs/style/crops/c2-near.jpg`, they're rough mid-tone stone. The largest difference is value. Faces are mid grey-brown, and only the tops catch warm light. Make kerb faces about `#8f8372`, tops about `#cdbd9f`, and use D3's stone recipe with stronger mottling at this close range, plus chipped, irregular edges along the geometry where you can afford it. Leaf dapple should cross them visibly. The mooring post is two stacked rough blocks, with the same treatment.

3. **Paving in front of the trunk.** It's still a large plain surface. Make the slabs smaller and more visible, with worn mottling inside them, thin dark joints and the odd small tuft of moss in a joint. Strong peach dapple on cool violet shade, as in the target.

4. **The flat pale bank right of the bridge** (about x .85 to 1, y .68 to .74 in view 0). It reads as a bare sand-coloured plane. In `refs/style/crops/c2-mid.jpg`, that's coursed stone quay wall going down to the water. Give it a quay face, with coping and water at its foot, in the same stone as the wall under the balustrade. If it's visible at wide angles, check there too.

If there's room, the boat could have a little more dappled sunlight across it, as the target has. That's optional.

## Limits

As in D4b: `test/gates/perf.mjs` at or under 351 and 638 ms, per-pixel under 80 ms, 50 calls, 1.6 M triangles, shimmer under .05%, extremes hold, tests and scroll gate pass. Don't touch 宣德楼: its render should stay pixel-identical. Render view 0 at 1920×1080 and look at it. Keep this short.
