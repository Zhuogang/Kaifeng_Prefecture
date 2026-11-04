# Whole-world round 1: city (T8b)

The lead saw the whole world together. **Shot 4 is the worst image in the project:** the city reads as rows of dark specks on a tan ground. `ref4` is a dense sea of grey tiled roofs with trees between them, fading into mist. Fix, biggest first:

1. **Roofs must fill the ground plane.** Houses are far too sparse and small, and the bare ground dominates. Real blocks are packed wall to wall with courtyards and lanes, so seen from above you mostly see roof. Raise density and size until little ground shows between roofs, mixing in tree clumps. Silhouettes must read as pitched roofs with ridges from 300 m,
   lit by the sun with visible shadow sides, not dark specks. Colour: grey tile with warm tonal variation, lifted by haze with distance.
2. **Rows look mechanical.** Break the regularity: varying block shapes, street kinks, varied orientation, sizes and heights, occasional bigger compounds.
3. **Haze over the city** is a flat orange band. `ref4` has a cool-grey to warm soft atmospheric falloff and river mist. Coordinate with the look values: don't edit `src/core/`, but tell the lead what you need.
4. **Shot 9 is wrong:** it's dark, and the avenue isn't in view. Reframe per `ref9`: from 宣德楼's east 朵楼 gallery, about 30 m up, looking south-east, with the railing and eaves framing the left, so the wide avenue fills the lower centre, its canals reflecting the dusk sky, and lanterns warming the corridor and windows. Blue hour needs its emissive window and lantern lights. Add those in your module (warm
   emissive windows at random, keyed to the `bluehour` preset, read from `engine`). It must not be too dark to read.

Keep budgets: ≤ 2 M triangles in frame, ≤ 40 draw calls. At least 5 compare rounds.
