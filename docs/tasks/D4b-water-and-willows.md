# D4b: restore 州桥's water and willows

宣德楼 is now good. Leave it, and leave the D4 distance additions and stone fixes, alone. Only 州桥's water and willows change here.

**This correction is on me.** D3's water colours matched the target almost exactly, and my D4 brief told you to go deeper teal and darker. Look at the numbers, from `python3 -I test/gates/colour.py <render>`:

| Open water | luma p50 | p95 | warm | green | teal |
|---|---:|---:|---:|---:|---:|
| Target | .55 | .74 | .33 | .21 | .17 |
| D3 | .54 | .74 | .33 | .28 | .19 |
| D4 | .49 | .58 | .15 | .13 | .50 |

D3's water is in `git show 924dd1e:src/paint/atmosphere.js`. Read it. Don't run any git command that writes.

## 1. Water

Reflections are the main subject of this water. They were the best thing in the target, and D4 lost them.

- **Bring back D3's reflection strength and colour balance,** so that `colour.py` lands near the target in both water regions (within about .05): warm about .33 in open water and .50 under the bridge, teal back under .25, and luma p95 about .74.
- **Keep from D4 only what doesn't cost that:** the smaller-scale distortion, vertical smearing, and hull contact shade. Strokes **modulate** the reflection: about ±12% in value, plus small horizontal offsets in where the reflection is sampled. They must never be an opaque overlay of teal. If a teal stroke hides a reflection, it's wrong.
- **What must be visible in `c2-water` and `c2-near`:** warm cream and gold columns below each pier, reaching well into the water, with teal between them. The green of the willows reflected on the left. Sky-pale patches. Warm orange below the towers. The big shapes in D3 were too blobby, so that's what the smaller distortion is for: smaller wobble, same colour.
- The bridge still shouldn't become a solid orange band or a second sharp copy of itself.

## 2. Mid-distance willows

The two willows by the towers are now smooth green balloons, and it's the worst thing in the picture. Nothing in the target looks smooth. Every visible part of the crown has to be whips and leaf strokes.

- The inner dome, if you keep it at all, is **dark interior only**: low value, unlit, and almost entirely covered by whips. No smooth lit surface may show anywhere, at any path fraction or look corner.
- Target: a domed overall shape from the arrangement of many drooping whips, with lit yellow-green tops, dark gaps inside and a soft fringe at the bottom.
- D3's colours were right here. `colour.py` `tower willow`: saturation p50 about .38. D4 is .49.

## 3. Near willow

D4's wider leaves are good. The colour went lime and the density dropped.

- Saturation p50 about **.33** in `near willow` (target .33, D3 .28, D4 .46), and luma p50 about .57 (D4 .64). Use the numbers. My hex colours in D4 were only approximate, and your lighting pushes them further.
- Bring back density. D4 fell to 873,000 triangles, so there's lots of room. In the target, whips overlap densely, with olive darks between lit strokes.
- Dark whips must be **interleaved** through the tree. At the top centre there's now a distinct block of dark green whips that reads as a separate object.

## Limits

The D4 limits still apply: `test/gates/perf.mjs` at or under 351 and 638 ms, per-pixel under 80 ms, 50 calls, 1.6 M triangles, shimmer under .05%, extremes hold, tests and scroll gate pass. Render view 0 at 1920×1080, and look at `c2-mid`, `c2-water`, `c2-near` and `c2-trunk` before reporting. Include `colour.py`'s output in the report.
