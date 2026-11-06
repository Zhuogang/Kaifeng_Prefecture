# X3: the last shapes (one round)

X2 is accepted and merged. The paint is now close to the samples, and what still differs is shape. This is the **last round before
wrap-up**, so it's bounded: make one honest pass at each item below. **If an item doesn't clearly look better than today beside the sample, revert
that item and say so in your report.** Don't iterate past one pass, and don't start anything that isn't listed.

`out/X3-base/` holds today's renders (`view1.png` to `view7.png`, `xd/f0.png`). `out/X3-crops/` holds side-by-side crops. Look at them first.

## Not in scope

- **Water:** no edits to `paintedWater` or `src/paint/atmosphere.js`, and nothing added to the `reflected` batches. All of the new geometry below goes
  in the main batches only. The 州桥 reflection hashes must match today's, as `tools/paint/x2-proof.mjs` checks.
- Roof shape, bay counts, column positions, walls, the bridge, the boat, cameras, views, the scroll page, new buildings.
- `src/yingzao/` stays as it is, so `?world=1` can't change. Add new painted geometry under `src/paint/`.
- `zhouBark`, the tile recipes and the sun bake. New geometry reads the existing shade. It doesn't re-bake it.

Use new `engine.rng` labels, so that accepted geometry doesn't move.

## 1. Bracket sets (both scenes)

Today's source sets are squeezed into narrow stacks: "pine cones" on 宣德楼 and shallow dishes on 州桥, with plain wall between them. See `xd-hall.png` and the
two tower crops. In c1 and c2 the bracket band reads as one open timber structure.

Build the hero sets in a new `src/paint/bracket-sets.js`, instanced through `PaintInstances` as now, and keep the attributes the recipes read
(`paintPart`, `paintDetail`, `memberUV`, `memberSize`), so that `zhouFineTimber`, `xuandeFineTimber` and the X2 per-set colour keep working.

- **A column set:** a big bearing block on the column head, then three tiers of straight, chunky transverse arms, each about 35% wider than the one below. Arm ends are cut in two or
  three flat facets, not curved. Small blocks sit at each arm's centre and ends, and you can see through the set between arms.
- **Cantilevers:** one member per tier projects straight out at the set's centre, longest at the top, with a cut end facing out. These give the band its depth and catch the eave shade.
- **Width:** the top tier spans about 85% of the distance between neighbouring sets, so that adjacent sets nearly touch, as in c1. Height stays from lintel to eave soffit.
- **Beams:** two long horizontal beams run the full length of each front, through the sets at the lower and middle tiers. That's what ties the row together in c1 and c2.
- **Between columns:** on 州桥's towers each bay gets a full set of the same size, because its bays are about twice c2's pitch. On 宣德楼's main hall, keep the smaller between-column set,
  rebuilt as a two-tier version with a short post, and keep the inverted V if it still reads.
- **Corners:** a cluster on the diagonal. Keep X1b's short, shaded noses, with no orange thorns.
- **州桥's towers, lower level:** add a two-tier set at the head of each lower column, and a smaller one between them where there's a wall behind, carrying the balcony beam. c2 has this and we have nothing.
- **Which halls:** the hero towers on 州桥, and 宣德楼's main hall and two side pavilions. Mid-distance and distant halls stay as they are.

Don't change the colours. `python3 -I test/gates/look-band.py <view1> <xuande f0>` is a guide: 宣德楼's band is 70% dark gap against c1's 38%, and the tower band has 20% pale panel against c2's 10%.
Budget: at most 500 triangles per column set and 200 per smaller set.

## 2. Mid-distance willows (州桥)

They're curtains of thin pale strands, and you can see straight through them. c2's are rounded domes built from about five to seven broad overlapping lobes, each ending in a drooping fringe: bright yellow-green on the sun side
and top, cool grey-green in the valleys between lobes, nearly opaque except at the fringe. See the willows beside the towers in `out/X3-crops/c2-tower-2x.png`.

- In `willowGeometry`'s non-hero path, group whips into lobes. Each lobe has a dome top, and its whips are short, roughly a third of the crown, so that upper fringes overlap the lobes below.
- Crowns may be up to 15% smaller than today, because they hide too much of the towers.
- Keep the shared wood as it is for the reflection. Draw new values from a new rng stream, and leave the stream the wood and bark use unchanged.
- Keep my pigment recipe in `materials.js` (`vLeafDetail.w>.5`), but make `paintDetail` carry lobe-level light, so that a lobe's top is lit and its underside and valley are cool. Target over the same box as X2: `122 130 99 / 139 147 107 / 172 165 101 / 209 189 104 / 237 210 109`. Numbers are a guide, and lobes are what matters.
- No more triangles than today across these trees. Check views 1, 4, 5 and 7 and the relocated tree in `relocationRanges`.

## 3. Hero trunk outline and limbs (州桥)

Our lower trunk is a wide column with one thick limb. c2's is narrower and twists, and forked limbs show through the leaves. See `out/X3-crops/left.png`.

- Landmarks at 1920x1080, view 1, fraction 0, right edge of the trunk: `x≈90` at `y=800`, `x≈145` at `y=600`, `x≈250` at `y=450`, and the main limb's upper edge near `x≈410` at `y=250`, leaving the top of the frame near `x≈550-650`. Today the lower trunk reaches about `x=200`.
- Reach these with the existing `paintDetail` morph on the hero wood, so that the mirror and sun bake keep the old source positions. The morph may move it more than X2's limit now. Add a slow S-twist, and two or three big lumps where limbs leave. It must still meet the roots and the ground.
- Add three to five tapered limbs forking off the trunk and main limb, each with one or two thinner branches, curving up into the crown, so that dark forked limbs show through the leaves as in c2. One should leave the trunk toward the left edge of the frame near `y=250-350`. These go in the main batch only, inside `heroRanges` so that they move with the tree in views 2 to 7. They use the existing bark kinds and stay out of the bake.
- Leaves stay where they are.
- Narrowing the trunk uncovers the near retaining wall, a flat brown face. Paint its face (the `[-14,.94,-10.8]` block) as big rough blocks in three or four courses, warm grey, with a darker foot, using the existing stone routine. Paint only. c2's wall is the guide.

## 4. 宣德楼's near blossom

The clusters on the hero branch read as dense stamped blobs. c1's are loose sprays of separate five-petal flowers on thin dark twigs, with sky between them.

- Hero branch only. Keep each cluster's position and replace its fill with about 8 to 14 larger open flowers plus a few buds and leaves, each with its own size, tilt and pigment, a paler centre and a darker throat. Vary the number and spread per cluster, so that no two match.
- Distant trees and ground petals stay as they are. No more triangles than today on the hero branch.

## Must hold

Run all of these and report the actual results:

- `node test/gates/views.mjs out/X3`: every check passes. 宣德楼's limit is widened to 30% for this round, only as a guard against global change. No near-black holes in any view.
- `node --test test/*.spec.mjs`
- `node tools/build.mjs`, then `node test/gates/scroll.mjs`
- `node test/gates/perf.mjs`: 州桥 at most 400 ms in software (it's about 345 to 385 today, so don't add per-pixel cost), at most 50 calls, 1.6 M triangles. Each scene's triangles grow at most 40 k.
- Shimmer under .05% with the camera still, in views 1, 2, 4 and 7 at fractions 0 and 1, and 24 path frames for view 1, opened and looked at.
- Water unchanged: reflection hashes match today's on both scenes.
- All seven views at 1080p, 宣德楼 at fractions 0, .5 and 1, and native crops beside c1 and c2 for bracket bands, mid willows, trunk and limbs, and blossom, in `out/X3/`: open each.

In your report, list per item: kept or reverted, and which thing still looks most unlike the sample. Don't say it's close if it isn't.
