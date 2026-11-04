# Whole-world round 1: 御街 (T5b)

The lead saw the whole world together (render shots 2 and 7). The composition of shot 2 is good, so keep it. You also now own the `chazi` and corridor use within your module. You may read the rest. Fix, biggest first:

1. **The ground looks like sand dunes, not paving.** This is the biggest problem. In shot 2 and everywhere on the lanes the brick bond must be visible in the foreground, resolving gradually with distance, with real joints, tonal variation per brick and worn paths, as in `ref2`. The undulating dune-like shading has to go. It's the
   ground relief showing through, so flatten the walking surface.
2. **御廊 has no 铺作 and a huge blank wall (shot 7).** `ref7` has big brackets, a rhythm of bays and panelled walls with lattice and doors. Use real LOD0 bracket sets for corridor bays near the camera (instanced, with LOD switching by distance), and break the back wall with panels, posts, lattice windows and doors, at Song proportions. Fix the wall-head daylight slots you
   reported, either in your own wrapper or by a precise bug report.
3. **Integration bug:** 宣德楼's wing platforms overlap your planting and fence strip at the north end. End the rows cleanly short of the 宣德楼 complex, and let the forecourt read as a plaza.
4. Blossom LODs look coarse at mid distance. Use the best available LOD to at least 80 m.

`node test/gates/reachability.mjs` must pass for the avenue landmarks: fences and canals need real gaps and crossings. At least 5 compare rounds.
