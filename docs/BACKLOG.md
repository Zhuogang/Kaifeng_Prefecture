# Look backlog

Known faults, biggest first within each group.

## The painted scenes

Whole-picture
- Reads as a painted animation background, but it's simpler than the targets. Brush character isn't matched, even where `test/gates/detail.py` passes. That gate measures how much detail there is, not how it's arranged.
- Frame rate on a real GPU is unmeasured. Shimmer is measured only on 10 frames from a fixed camera, in software.
- Portrait phones crop the scenes heavily, and the English gloss takes noticeable space there.

宣德楼
- The wall has swung between camouflage, plastic, granite and plain. It's plain now, with broad washes and the tree's shadow, and it lacks c1's lichen, stone blocks and streaks.
- Bracket sets read as stacked bars, not fans of arms. The roof has less tile weight than c1.
- Blossom is flatter than c1's, and the grass is plain.

州桥
- Bark is rich but too fluted. Boat wear is angular. Some blockiness remains on the quay's caps.
- The bridge and its bright reflection merge into one tan band, with a hard line at the reflected deck.
- Paving is greyer than c2, with weaker peach dapple.

## The earlier photoreal city

### 宣德楼 and halls (T4)
- Doors show faceted shading bands, and the rail layout should follow `ref1`.
- Masonry is pale and uniform. `ref1` has warm tone, coursing and staining. Frieze reads as line art, not deep carving.
- Lattice windows are grossly oversized from the terrace, and bay fills look like red grids.
- Vermilion is too flat and saturated. Needs wear, AO and dirt.
- The platform should dominate more in the front view; check its height against `ref1`.

### Flora (T3b)
- Willow crowns read as hard-edged leaf panels up close. Need separate whips of varied length with gaps.
- Cranes are still flat from close up. Lotus view shows horizontal banding.

### Light (TL)
- See `docs/tasks/TL2-look-round2.md`.

### After the final contrast pass (shots at `media/`)
- Shot 4: alleys and shadows go too black from the air, and the main palace court is a large bare plate. No reference-level density yet.
- Shot 2: brick contrast is harsh and regular up close. Far blossom line is thin. The 312 m avenue is still the emptiest view.
- Shot 7: vermilion is flat and over-saturated, with no worn paint. Blossom trees are sparse.
- Shot 9: blue hour reads thin. Few lights compared with `ref9`.
- Shot 6: carving is legible but stylised, well short of `ref6`. Relief repeats exactly.
- Willows close up, cranes close up, and 大庆殿 still has no ground mist reading in `high`.
- Shot 6 is slightly over budget at 6.03 M triangles in `preview`. The low tier is at 2.6 M against a 1.5 M target.
- No real-GPU frame rate has been measured. Baking isn't in use yet, so load time depends on JS build plus cloud noise generation.
