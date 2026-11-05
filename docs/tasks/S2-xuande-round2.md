# S2: 宣德楼, second round, and restore 州桥's water

You own `src/paint/`, `src/modules/paint_*.js`, `tools/paint/`. Write under `out/S2/`. Same budgets: 1.2 M triangles, 40 draw
calls per scene.

The composition of `paint_xuande` is roughly right. As a picture it's a blockout, well behind 州桥. Regional numbers match c1
and it still doesn't look like c1, so **ignore the regional table this round** and compare crops of c1 with crops of your
render, at full size, region by region. Bring it to the same level as 州桥's best.

**Lead's correction:** the door width in S1 was wrong. Use the door numbers below.

## 宣德楼 faults, worst first

1. **The wall reads as camouflage.** Tan and olive blotches at high contrast. And it isn't battered: it reads as one straight
   band across the frame.
   - Low-contrast warm ochre, with only slow large-scale variation, faint vertical stains and seepage, darker just
     under the top edge and at the foot. No thresholded blotches.
   - Massing: a central trapezoid protruding from the side walls by at least 3 m. Top x .335 to .72 at y .46, foot x .295 to
     .77 at y .669. Its sloping ends must be visible as separate planes in shade.
2. **Hero bark is black and cream camouflage**, and the same material gives 州桥's trunk topographic contour lines.
   - Fix it in the shared material. Bark is strongly anisotropic, stretched about 8:1 along the growth direction, using the
     branch's own axis. Three tones: charcoal-brown crevice, mid brown, warm tan ridge. Highlights only on the sun-facing
     side. Low contrast on the shade side. No isotropic thresholded noise.
   - Remove the thin black limbs that cross the sky at top-left like wires.
3. **The hall is brown panels under a thin frieze.** c1 is an open colonnade.
   - Bracket sets are the main feature. Separate, large, stacked clusters, y .316 to .365, each about .05 wide, about 55% of
     column height. Enlarge them with a scale in paint-only code. Don't change `src/yingzao/rules.js`, and mark it `// inferred:`.
   - Columns y .365 to .455. Dark interior with a little warm glow, balcony rail y .424 to .455. No full-height panels.
   - Roof taller and heavier: ridge y .235, eave edge y .30 to .33, tips turning up gently, with hip ridges and clear tile rows.
4. **Doors are crowded and orange.** Centres x .385, .46, .535, .61, .685. Each door .044 wide, lintel .06 wide. Lintel top y .564,
   foot y .669. Deep crimson leaves, thick dark lintel, recessed reveal casting shadow, and plenty of wall between doors.
5. **The ground beyond the rails is an empty cream plain with a hard horizon**, and the right side is a blue-grey plane.
   - Soft grass and earth under the groves, with hazy trees and distant roofs covering the horizon join, as c1 has at y .45 to .5
     around x .9 to 1.0 and x .1. No visible edge between ground and sky.
6. **The avenue is cow-hide.** Patches too large and hard-edged, shade too blue, sun too cream, sandpaper grain.
   - Pattern about 40% smaller with leafy edges and soft penumbra. Shade is warm grey-violet. Sun is peach. Faint slab joints,
     no grain. More and larger fallen petals near the camera.
7. **The sky is scratched with diagonal streaks.** Remove or nearly remove the brush overlay on backdrops, in both scenes, since
   the painting already has its own brushwork. Warm it toward c1's peach.
8. **Groves are blobs on black stumps.** Slender dark trunks that fork into visible branches, open flower masses with gaps, and
   deeper rose in the undersides.
9. **Hero blossom:** add larger individual five-petal flowers nearest the camera, dark twigs, a few leaves, deep rose inside clusters.
10. **Rails too orange and thin.** Hue toward crimson, heavier sections, lit tops, a detailed near post.
11. **Canal is a green patch with an odd kerb.** A band running across the left, stone kerb on both sides, jade water, soft pink
    reflections.
12. **Side tower 鸱尾 read as horseshoes**, and the main ones as grey hooks. Make them read as upright fish-tail forms at this
    scale, per `refs/historical/` and `src/yingzao/ornament.js`.

## 州桥: restore the water, nothing else

S1 made the water dim. `water_mid` p50 is .37 against c2's .58, p90 .45 against .75, and the picture lost its glow. P3's lower
water was better. Don't multiply reflections darker.

- Mix the reflection into a **bright jade pigment** at about L .55, so that bright columns come down and dark objects come up.
- Column reflections read as soft warm tan, not teal rods.
- Find and remove the bright teal-white patches at about (.57, .71) and (.83, .70).
- The trunk base ends in a flat cut on the paving. Root it, with flare and roots gripping the ground.

Report the `c2` regional table for `water_mid` and `water_low`. Don't change other things in this scene, except through the shared
bark and sky fixes above.

## Done means

- At least 10 rounds, listing what changed in each.
- `out/S2/` holds compare and overlay for 宣德楼, compare for 州桥, full-size crops of wall, hall, avenue and hero tree beside the same
  crops of c1, and motion sheets for both.
- The tests pass, both scenes render byte-identically twice, the sub-path check passes.
- Rate each of the 12 faults, and the water, as fixed, better or unchanged. Say honestly what's still below c1.
