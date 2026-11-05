# S4: final polish, both scenes

You own `src/paint/` except `playback.js`, `src/modules/paint_xuande.js`, `src/modules/paint_zhouqiao.js` and `tools/paint/` except `scroll-*`. Write under `out/S4/`. Same budgets. At most 6 rounds.

S3 was the strongest round yet, and 州桥 now reads as a painting. **Don't touch what works**: bark, boat, willow, blossom, hall, sky and composition stay as they are.

**The table is now a guide, not the goal.** Pushing chroma up to the target is probably what made some surfaces iridescent. Where the table and your eye disagree, follow your eye, and say so in the report. `test/gates/detail.py` now also prints patchiness, as a diagnostic only.

The fixes, worst first:

1. **Far water reads as fish scales (州桥).** Under and just below the bridge, the water is broken into a regular mosaic of small cells. Compare it with c2 at the same spot: calm, with long horizontal strokes, and each column's reflection clear and continuous. In the water, stroke cells must be strongly stretched horizontally, about 8:1 to 16:1, foreshortening with distance. No isotropic cells anywhere in the water. Near the bridge the reflection is the main thing you see. Broken colour should modulate it gently, not chop it up. Keep the lower water's look, which is good.

2. **Iridescent stone (州桥 paving and coping, 宣德楼 avenue).** Pastel pink, blue and orange run across single stones, like an oil film. Broken colour in sunlit stone should stay within neighbouring warm hues: ochre, rose, warm grey. Cool colours belong only in shade. Reduce the amount there, and make each stone mostly one colour, with small variations.

3. **宣德楼's wall reads as sponge-painted granite.** Marks are small, uniform and evenly spread. c1's wall has big quiet areas and occasional clusters: broad washes about 2 to 6 m across, grey-olive patches in the upper band, rose-ochre lower, a few large stone blocks showing near the doors, and streaks running downward from the top edge. Remove most of the small dabs. Also cast the hero tree's soft dappled shadow across the wall's upper left, as c1 has, which S3 asked for and I can't see.

4. **宣德楼's avenue has lost its shade.** `avenue` measures p50 .62 against c1's .47, and R-B +.15 against +.03. It has gone overall peach. S2's separation was better: shade is warm grey-violet, and most of the area is shade. Sun patches are peach, smaller than the shade, and clearly brighter. Keep the leafy edges.

5. **Doors are pale orange.** Deeper vermilion, as in c1. Check the gold studs show at view 0's scale. If they don't, make them slightly larger.

6. **Small things.** Blocky squares at the top of 州桥's near quay wall, about x .09 to .15, y .50. And `boat` patchiness .63 is fine if it looks fine, so leave it unless you see a problem.

## Done means

- Each fix rated fixed, better or unchanged. Say honestly what's still below the targets.
- `out/S4/` holds compare images for both scenes, crops beside the target for far water, paving, wall and avenue, and motion sheets.
- Shimmer stays under .05%. The tests pass. Renders are byte-identical twice. Sub-path check passes. Budgets hold.
