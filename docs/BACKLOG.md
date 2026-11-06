# Look backlog

Known faults, biggest first within each group.

## The painted scenes

Whole-picture
- Reads as a painted animation background and is much closer to the targets after D1 to D4, but it's still cleaner and more regular than they are. Edges are crisper and marks less varied. `test/gates/detail.py` measures how much detail there is, not how it's arranged.
- The detailed version hasn't been measured on a real GPU. On high-DPI screens it now starts at a pixel ratio of up to 2, not 1.5. The adaptive quality ladder protects slower machines.
- Portrait phones crop the scenes heavily, and the English gloss takes noticeable space there.

宣德楼
- The wall is much richer but still plainer than c1. It has few distinct flaked stones, so it stays closer to a wash.
- Corner bracket clusters are spiky and busier than c1's. Tile rows are more regular.
- The bark is too fluted, and near-rail paint wear is restrained. Distant trees at the right are soft smooth domes.

州桥
- Stone is more regular than c2. Bridge piers and balustrade have less wear, and pale ghost piers show in the water just below the bridge.
- The boat is darker than c2's, with less dappled sunlight on it.
- The trunk is smoother than c2's. Paving dapple is a little busy.
- Willows by the towers cover more of them than in c2. The tower brackets are dense.

州桥's added views
- These are composed shots, and they cheat. The deck willow is moved in views 2 to 7, the far bank exists only in views 4 and 5, and the extra roofs, trees and willow whips only in view 7. The cross-fade hides the changes.
- 橋下 is the least painted: closer to a dim render than to gouache. Thin white glints follow the column reflections, and the ceiling is plain.
- The far bank's trees are soft smooth domes, as in the distance on 宣德楼.
- 橋側's near rail and 橋上's near paving are plainer than the near stone in view 1.

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
