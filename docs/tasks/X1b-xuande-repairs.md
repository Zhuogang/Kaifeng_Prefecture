# X1b: repair what X1 flattened on 宣德楼

The lead's verdict on X1, by eye against `refs/style/c1.png` and `out/X0/f0.png`:

- **Accepted, leave alone:** the paving and its dapple, the sky, the sun direction, the shaded left wing, door colour, the
  tree trunks by the wall, and the speed.
- **Worse than before X1:** the roof (plaid), the rails (salmon and blotchy), the hall band (flat, grey clay), and the
  branch (a smooth pale horn).

You matched the numbers I gave you. They were wrong: my near-rail box held paving and kerb, and my branch box held sky
and flowers. `test/gates/look-xuande.py` now uses tight boxes holding one material. Use it as a guide. **The eye decides:
compare native crops with c1 before reporting**, and if the numbers pass and the picture looks flat, the picture wins.

Touch only the `xuande` profile. No new systems. Don't touch the canal or its water shader. 州桥 stays pixel-identical to
`out/X0/`.

## 1. Roof: individual tile rows, no plaid

The wide blurred vertical bands, about 25 px at 1080p, come from the low-frequency `hash21`/`noise` row values added in
X1, and the relief reduced until the rows vanish.

c1 has one clean row every 12 to 14 px at 1080p, mid-slope on the hall. Each row has:
- a cool slate shaded side, about `105 112 128`
- a warm lit crest, about `178 160 148`, with a broken pale fleck along it, at most about `205 190 175`
- a thin dark gap to the next row, about `85 85 95`

So paint one row per 2 to 3 geometric rows, whichever lands near 13 px on the hall, with the pavilions' rows smaller in
proportion. Value differences from row to row stay within about 6%. A row's edge may wander by up to about .1 of its
pitch. Break the crest highlight with noise *along* the row. Fade to a flat wash as rows go under about 3 px, as W3 does,
so that it doesn't shimmer.

The hip slopes need the same rows: today the left corner is a dark smooth wedge and the right a plain one. The main
ridge needs two or three dark course lines instead of a smooth box.

Tight target, roof slope: `131 125 128 / 144 135 135 / 155 143 139 / 165 150 143 / 181 160 147`.

## 2. Hall band: saturated members against dark gaps

Today `XUANDE_TIMBER_GLSL` lifts shade toward a pale `149,118,110` at .42, with a blue tint, which greys everything. In
c1 the arms are saturated orange-red with lit top edges against dark gaps. Backing and bay interior are already right
(`108 75 67`): keep them, and make the members separate from them.

- Shade leans warm, not grey and not blue. Drop the blue from the tint on this profile.
- Bracket band target: `89 65 58 / 103 72 62 / 121 78 65 / 147 87 69 / 182 112 88`. Today it stops at `146 96 84`.
- Columns get a hot sunlit band, which is what makes them round. Target: `133 82 72 / 150 90 75 / 211 109 80 / 233 129 92 / 249 163 111`.
  Today they stop at `206 100 76`.
- Big beams get a clearly lit top or front edge, in the same orange as the columns' lit side.
- Corner brackets: the orange spikes pointing outward at the hall's and pavilions' corners read as thorns. Blunt them or
  shorten them, or take them down to the shadow tone. c1's corners are a deep shaded cluster with rounded cut ends. Use
  the cheapest thing that stops them reading as spikes.

## 3. Rails: crimson, not salmon

The flame-shaped pale blotches on every face have to go. They come from my wear numbers, so remove them.

- Faces are crimson. Tight post-face target: `105 53 48 / 112 56 52 / 128 67 62 / 149 74 70 / 162 81 77`.
- Top faces in sun are brighter and warmer, about `190 95 78`, with the tree's real shadow crossing them.
- Pigment variation on a face stays within about 6%, as long flat strokes running with the member: along each bar and
  rail, vertical on posts.
- Pale wear appears only as a thin lit edge on arrises, and never as patches.

Look at `out/X1/native-crops/near-rail-vs-c1.png` afterwards. c1's rail looks like a few broad strokes of one red.

## 4. Doors and wall

- **Door colour is right.** Reduce its flame texture to quiet vertical plank strokes, within about 4%.
- **Lintels** are dark brown and should be brick orange. Target about `183 103 88`, p90 `205 123 96`.
- **Jambs:** the side posts disappear into the battered wall about 60% of the way down, so they look like they hang from
  the lintel. c1 has a dark reveal running the full door height with no post outside it. Make the reveal read as full
  height with the least geometry.
- **Grey halo:** every door has a smudgy grey patch around the frame and above the lintel. Find its source, probably the
  contact AO at .85, whose radius is large at this distance. The wall by a door should get only a crisp thin cast shadow
  from the lintel and frame, falling away from the sun. Contact AO on this profile should stay in real crevices.
- **Wall: more than one pigment.** Today it's one peach with camouflage patches. Its value and hue both spread too little:
  - Value, top third: `196 156 130 / 212 165 132 / 223 171 134 / 231 177 137 / 240 186 144`
  - Value, by the doors, lighter than the top, the reverse of today: `220 170 133 / 234 180 133 / 238 183 135 / 242 189 143 / 249 203 156`
  - Hue: R-B from 59 to 104 and G-B from 22 to 49 (5th to 95th percentile), against ours at 82 to 101 and 35 to 44. The
    gate prints these.
  - c1's wall carries olive-moss stains, about `165 150 110`, in drifts across the upper third; lavender-grey patches, about
    `175 165 165`; and pale cream stones, about `245 205 165`, low down. Distribute them regionally with low-frequency noise,
    so that some areas are mossy and some clean. Never scatter them evenly: even scatter is camouflage.
  - Flakes are about half their current size, with a thin slightly darker edge on some, so that some read as stones.
  - A soft leaf shadow from the existing dapple crosses the wall's top-left corner, as in c1.

## 5. Branch: dark bark, and a silhouette that forks

- **Colour.** Tight target: `72 57 51 / 88 70 66 / 91 75 76 / 95 81 83`. The body is a dark, slightly violet brown, with shade near
  `70 62 72`. Gold, about `170 115 65`, appears only as broken patches on the upper and sun side, over about 15% of the visible
  bark. Add a few dark knots and fissures, about `35 28 28`. See `c1` at around x 0 to 260, y 80 to 380: broad flat planes of
  slate and gold, not long stripes.
- **Silhouette.** Today it's one smooth tapered tube, like a horn. Keep the arc and its position, and add:
  - low-frequency lumps along it, moving radius and centre by up to about 15%
  - three to five real limbs forking from the upper arc, starting at .35 to .6 of the local radius and tapering into the
    existing flower clusters, so that the shape forks as in c1
- Use a new `engine.rng` label or `detailRng` for all of this, so that the accepted flowers stay exactly where they are. No
  new flowers.
- **Blossom hue:** c1's flowers are salmon-coral where ours lean magenta. Shift the hero's pinks and their shade pigment toward
  salmon, about `233 151 147` at the median, changing colour values only. Don't change sizes or how many are drawn.

The canal's reflection may pick up the new limbs. That's the one permitted change to it.

## Must hold

Run all of these and report the actual results:

- `node test/gates/views.mjs out/X1b`: every check passes, and 州桥 is pixel-identical at fractions 0, .5, 1 in `out/X0/`
- `node --test test/*.spec.mjs`
- `node tools/build.mjs`, then `node test/gates/scroll.mjs`
- `node test/gates/perf.mjs`: 宣德楼 at most 400 ms in software
- Shimmer under .05% with the camera still at fractions 0 and 1, and 24 path frames, opened and looked at
- Native crops beside c1 for roof, hall band, wall and doors, near rail and branch, in `out/X1b/native-crops/`: open each

In your report, say which thing still looks most unlike c1. Don't say it's close if it isn't.
