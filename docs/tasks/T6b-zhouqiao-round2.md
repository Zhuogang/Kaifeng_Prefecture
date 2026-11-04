# T6b: 州桥, round two

The lead compared your renders with `ref5` and `ref6`. The structure is right. Keep it. Fix these, biggest first. A separate agent (TL) is fixing global light and sky, so don't compensate for that in materials.

1. **Relief carving is the worst thing here.** It's blobby, with unreadable anatomy and big holes that look like eyes. `ref6` is the bar: a clear leaping winged horse with flowing mane and tail, feathered wings, a crane either side with long necks and spread wings, curling
   clouds between. Design the figures with careful 2D curves (head, neck, chest, legs, wing feathers as individual overlapping shapes), turn them into a high-resolution height field with rounded profiles and real undercut-looking depth, then make a displaced mesh for the big forms and a
   normal map for fine detail like feathers and chisel marks. Render a test of one 7.5 m group head-on and check it reads before anything else. Zero external assets still applies: you draw these curves in code.
2. **Water is a flat green sheet.** `ref5` has clear reflections of the bridge, sky and banks, broken by gentle ripples, with colour shifting by depth and angle. Add a planar reflection for the river when it's in view: low resolution, using LOD1 or simpler geometry, no shadows, so it stays within budget. Fresnel, small animated ripple
   normals driven by `engine.time`, murky silt-green at steep angles, dark wet band and contact darkening along walls and piers.
3. **Stone is uniform grey.** The embankment and piers need weathered bluestone with tonal variation, chipped arrises, dark rain streaks, water staining rising from the waterline, moss and algae, per `ref6`. Blocks should vary in size and sit slightly out of plane.
4. **The boat looks like a wicker basket.** Build it with real planks, ribs and thwarts, as in `ref5` and `qingming_detail.jpg`.
5. **Shot framing:** match `ref5` and `ref6` more closely so comparing them is meaningful. Lower, closer on the carving, with the boat and bollard in the foreground in shot 5.
6. **Balustrade and deck** are good. Add weathering and wear only.

Same acceptance and budgets as `docs/tasks/T6-zhouqiao.md`. At least 8 compare-and-fix rounds. Be blunt about what still falls short.
