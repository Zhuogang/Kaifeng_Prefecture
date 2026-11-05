# P2: 州桥, third round. Make view 0 read as `refs/style/c2.png`

P1 passed the technical gate and failed on looks. The whole-frame histogram already matches c2 within 0.02, and
the picture still doesn't look like c2, so global numbers are no longer useful. Don't tune a global grade this
round. Fix these local faults instead. Open c2 and your render side by side before each change.

You own `src/paint/`, `src/modules/paint_zhouqiao.js`. You may create `tools/paint/`. Budget stays at 1.2 M
triangles and 40 draw calls including the reflection pass.

## The lead's reading of P1, worst first

1. **Bridge columns look like stacks of toy blocks.** Each course alternates lavender and beige. This is the
   worst thing in the frame.
2. **Paving is a purple and yellow checkerboard** with tiles far too large. The post is a smooth soap bar.
3. **Composition is head-on and flat.** c2's strength is a bridge receding across the frame, a massive rooted
   trunk, and an open right side. Yours has a curtain of willow across the middle.
4. **Willow reads as fishbone.** Leaves splay at 45 degrees on both sides of every strand, at one size.
5. **The trunk is a dim band** behind the leaves, not the darkest and richest mass in the frame.
6. **Tower walls are flat grey panels** and the gate shows blown-out white. The 鸱尾 are stubby horns.
7. **Reflections are blurred blotches**, and the tower's reflection doesn't read as a red and orange building.

## 1. Composition: view 0 lays over c2

Compose the view to these landmarks, in image fractions of c2 (x from left, y from top). Move geometry, camera
and focal length freely. Nothing here needs to be geographically true. Save a 50% blend of render and c2 as
`out/P2/overlay.png` and look at it every round.

| Landmark | c2 position |
|---|---|
| Trunk base | x 0 to .06 at y .79, on the ground, with roots |
| Trunk | rises and leans right, about x .02 to .09 at y .40, main limb leaves the frame at top around x .28 to .35 |
| Near quay wall and its balustrade | x .05 to .20, top of balustrade y .52, wall foot y .70 at left, y .62 at right |
| Quay coping (near edge) | a diagonal from (.055, .71) to (.36, 1.0) |
| Mooring post | centred (.135, .76), top y .695, width about .05 |
| Boat | stern (.225, .715), bow (.545, .84), lowest hull (.46, .925) |
| Bridge, near end | at left, x about .08, parapet top y .43, columns reach the water at y .60 |
| Bridge, far end | joins far bank at x .87, parapet top y .47, waterline y .56 |
| Near tower | centre x .86, ridge y .125, eaves spanning x .72 to 1.0 at y .24, base y .47 |
| Far tower | centre x .59, ridge y .24, eaves x .51 to .67 at y .31, base y .43 |
| Willow canopy | top-left only. Whips reach y .50 around x .25 to .40, and y .25 around x .65 to .70 |
| Open | the centre and right of the water and bridge have no leaves in front of them, and the sky over x .45 to .7 is clear |

The dolly (views 1 to 8) may be shorter than 6 m if the composition needs it, but keep at least 3 m of travel,
so that the near trunk, the boat and the far bridge visibly separate.

## 2. Stone

- Stone is one warm material, cream-ochre where sunlit and warm brown-grey in shade. **Block-to-block hue
  variation goes almost to nothing.** Value varies a little. Lavender appears only inside cast shadow, and softly.
- Bridge columns read as single solid stone posts with a lit face, a shade face and a dark soffit above. Faint
  joints at most. Columns come in pairs per bent, as in c2. The soffit and the gaps between columns go dark.
- Parapet: clear posts and rails with a shadow line under the coping, not a pale noisy strip.
- Quay paving: stones about 0.5 to 0.8 m, slightly irregular in length, warm grey-brown, low saturation. Long coping
  stones along the water's edge with chipped, uneven edges.
- Near quay wall: rough coursed blocks with depth, moss near the waterline.
- Mooring post: chipped stone, bevelled top, weathered, with the rope wrapped around it and sagging to the boat.

## 3. Willow and trunk

- A strand is a long narrow tapering line of small lanceolate leaves that hang close to the strand, within about 25
  degrees of it, varying in size and missing here and there. No herringbone.
- Strands grow in clumps from visible branches. A clump shares a length and a colour family. Outer sunlit clumps are
  warm yellow-green and inner ones deep olive. Leave real gaps of sky.
- The trunk is massive, twisted, tapered and rooted, and the darkest, most saturated mass in the frame. Warm
  orange-ochre on the sun side, deep violet-brown on the shade side, heavy bark furrows that follow the growth.
  Two or three big limbs reach out with visible taper, so that the eye follows them into the leaves.

## 4. Water

- Columns meet their own reflections at the waterline, and the reflection is a recognisable mirrored image broken
  into horizontal strokes. Displacement stays small near the bridge and grows toward the viewer.
- The tower's reds and oranges read clearly on the right side of the water, around y .60 to .80.
- Jade green where trees and shade reflect, warm cream where sky reflects. Stroke pattern must not read as parallel
  wallpaper stripes.

## 5. Towers

- Masonry base in warm tan with quiet courses. No grey panels.
- Gate opening under a flat timber lintel: dark passage with a warm glow and a glimpse beyond. Not white.
- Proper 鸱尾 with 拒鹊子, adapted from `src/yingzao/ornament.js` if that fits the budget. Heavy shadow under the
  eaves. Keep the bracket richness you already have.

## 6. Regional values, as a check, not a goal

Measured from c2. Once the composition lands these regions hold the same things, so after view 0 looks right each
number should be within about 0.08. A miss tells you where to look. Don't grade to hit them.

| Region (x0, y0, x1, y1) | L p10 | L p50 | L p90 | Sat | R-B |
|---|---|---|---|---|---|
| trunk (0, .45, .09, .78) | .18 | .33 | .53 | .28 | +.11 |
| canopy (0, 0, .35, .35) | .23 | .46 | .81 | .39 | +.19 |
| sky (.45, 0, .7, .15) | .41 | .74 | .82 | .29 | +.03 |
| parapet (.25, .43, .8, .49) | .52 | .68 | .83 | .29 | +.22 |
| columns (.25, .50, .8, .57) | .34 | .52 | .80 | .28 | +.18 |
| water_mid (.45, .60, 1, .80) | .45 | .58 | .75 | .27 | +.16 |
| water_low (.6, .85, 1, 1) | .43 | .54 | .69 | .21 | -.05 |
| tower (.75, .2, .97, .45) | .34 | .54 | .82 | .34 | +.24 |
| paving (0, .82, .2, 1) | .39 | .44 | .70 | .17 | +.06 |

## 7. Housekeeping

- Move `src/paint/capture.mjs` and `src/paint/dist-proof.mjs` to `tools/paint/`, because `tools/build.mjs` ships all
  of `src/` and these Node scripts shouldn't reach `dist/`. Update their paths and output folder to `out/P2/`.
- `宣德楼` is next and reuses this toolkit. Keep stone, willow, water, roof and dapple as functions with parameters, and
  keep what's specific to this view in `composition.js` and the module.

## Done means

- At least 10 rounds. Say what changed in each. Check motion too: view 0, then views 1, 4 and 8.
- `out/P2/compare.png` (c2 beside view 0), `overlay.png`, `motion.png`, plus the final numbers for the table above.
- The tests pass, `?test=paint_zhouqiao` renders byte-identically twice, and the sub-path check still passes.
- Rate each of the seven faults as fixed, better or unchanged, honestly, with what's still wrong.
