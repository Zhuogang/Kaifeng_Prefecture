# X2: fine detail on 州桥, and bracket sets that don't repeat

宣德楼 is accepted (`1c2a971`). Its roof, timber and bark recipes in `src/paint/xuande-strokes.js` are now better than 州桥's,
so bring 州桥 up to them, using `refs/style/c2.png`'s pigments. Read the current `xuande-strokes.js` first: the lead hand-tuned
it after X1b. Stains take whole flakes, bracket sets darken toward the eave, and sweeps across the roof are 2D.

## Not in scope

- **Water:** no edits to `paintedWater` or anything else on the water surface. The client said the water is fine. The
  `reflection:true` materials stay as they are, so the water must look the same.
- Cameras, views, the scroll page, new scenes or buildings, and the banks. No new systems.
- Views 5 and 6 keep what `towerDetailView()` gives them today.

## How to judge

`python3 -I test/gates/look-zhou.py <view1.png> --sheet <out.png>` measures view 1 at fraction 0 and 1920x1080 on tight boxes,
and the sheet draws those boxes so you can see what they hold. It's a guide. **Compare native crops with c2 before reporting.**
If the numbers pass and the picture looks flatter or dirtier, the picture wins. A value below is a target for a region, not
for every pixel in it.

## 1. Tower roofs

Today they read as smooth slate. c2 has clear rows with warm lit crests and slate sides, in a much lighter overall range.

- Target: `101 107 123 / 132 131 140 / 158 149 151 / 179 164 157 / 199 189 177`. Today: `99 104 110 / 107 113 119 / 116 122 129 / 128 135 143 / 138 146 154`.
- Port the crest, side, gap, broken-fleck and 2D sweep structure of `XUANDE_ROOF_GLSL`, in c2's cooler pigments.
- Paint a run per enough source rows to land near 9 px on the near tower in view 1. Fade rows as W3 does, so that they don't shimmer.
- Ridges get a lighter lit top and thin dark courses. The hip ridges carry a warm lit edge.

## 2. Tower timber and walls

Today gaps are umber and members are a little brown. c2's gaps are violet-grey and its members are orange-red.

- Bracket band target: `86 75 80 / 100 82 83 / 123 88 83 / 142 95 85 / 193 117 87`. Today: `64 49 44 / 64 49 44 / 107 70 56 / 141 91 69 / 167 108 83`.
- Eave shade gathers at the top of each set, and cut ends catch the sun lower down, as in `xuandeFineTimber`.
- Columns are round: a shaded side, a hot band, no flat fill. Target: `159 98 89 / 180 110 96 / 233 130 91 / 247 145 96 / 250 179 128`. Today: `150 75 52 / 222 105 65 / 225 107 66 / 226 108 67 / 227 109 67`.
- Frieze panels between the sets are pale in c2, and we painted them dark. Upper level about `170 152 134`, lower level about
  `186 147 132`, each stepping down in eave shade. This replaces the panel colour W3b gave kind 103 on the towers.
- Sunlit tower walls are brighter. Target: `246 201 146 / 249 205 151 / 250 208 155 / 250 211 158 / 252 215 164`. Today: `202 167 130 / 214 179 140 / 219 183 143 / 223 186 145 / 228 189 148`. Keep the coursing and the shaded side.

## 3. Bracket sets that differ (both scenes)

Every set is the same colour and the same shape, and that repetition is what makes the row look manufactured. The per-instance
colour already reaches the shader through `bracketInstances...add(matrix,pigment)`, but the fine-timber paths ignore it.

- Give each set its own value, within about 7%, and hue, with R against B within about 3%, from a new `engine.rng` label.
- Vary each set's eave-shade edge a little, so they don't darken at one height.
- Keep it quiet: the row should look hand-painted, not patchy.

宣德楼 gets this too and nothing else: its views gate allows 3% of pixels to change, enough for the bracket sets alone.

## 4. Hero trunk

Today it's smooth with long fine flutes, like a carved column. Its percentiles are already close, so what's wrong is its shapes.

- c2 has broad plates, about 3:1 along the growth rather than 20:1, separated by deep fissures about `46 39 32`, with gold on the
  sun side reaching about `181 134 97`, and p90 `160 125 95` overall. Today p90 is `130 105 80`. Warm brown, not the slate of 宣德楼's branch.
- Add low-frequency lumps along the hero trunk and main limbs, as in `blossom.js`'s `heroRepairRng`, moving radius and centre by up to about
  8%, so that the silhouette stops being a smooth curve. Use a new rng label, keep the reflection's old trunk as X1b did, and leave leaves where they are.
- It's visible in six of the seven views. Check each: no holes, and nothing swimming.

## 5. Mid-distance willows

Today they're even, pale, flat bushes. c2's have bright yellow on the sun side, cool grey-green in shade, and dark gaps between strands.

- Target: `122 130 99 / 139 147 107 / 172 165 101 / 209 189 104 / 237 210 109`. Today: `117 96 70 / 140 134 78 / 155 149 86 / 170 163 93 / 190 179 105`.
- Whole whips differ from each other, and whole lobes of the crown differ: lit on the sun side and up top, cool and darker below.
- Change pigment and light only, with a new pigment stream, so that accepted geometry doesn't move.

## 6. Stone

- **Quay kerb and mooring post:** today they're uniformly sunlit and pale, with faint X-shaped lines on each block that have to go. c2's are mostly
  in the tree's shade with a few sun patches, in mottled warm grey. Target: `100 91 91 / 116 103 99 / 133 123 131 / 150 138 144 / 235 193 158`.
  Today: `197 168 139 / 215 185 156 / 221 189 157 / 226 192 158 / 232 197 161`. Extend the composed dapple that the paving uses onto them, in the views where the tree is overhead.
- **Bridge piers:** today they're too evenly lit. c2's have a darker shade side, sun only on sun-facing faces, and visible block courses. Target: `100 85 70 / 114 101 91 / 138 129 113 / 205 173 142 / 246 199 142`.
  Today: `91 80 70 / 127 117 100 / 180 163 136 / 233 196 155 / 247 204 150`. The box also holds the dark gaps between piers.

## Must hold

Run all of these and report the actual results:

- `node test/gates/views.mjs out/X2`: every check passes. 宣德楼 stays within its 3%, and each 州桥 view has no near-black holes.
- `node --test test/*.spec.mjs`
- `node tools/build.mjs`, then `node test/gates/scroll.mjs`
- `node test/gates/perf.mjs`: 州桥 at most 400 ms in software, at most 50 calls and 1.6 M triangles
- Shimmer under .05% with the camera still, in views 1, 2, 4 and 7 at fractions 0 and 1, and 24 path frames for view 1, opened and looked at
- Water unchanged: the reflection pass hashes match today's, as your X1 proof checked
- All seven views at 1080p and native crops beside c2 for tower, trunk, mid willow, kerb and bridge, in `out/X2/`: open each

In your report, say which thing still looks most unlike c2. Don't say it's close if it isn't.
