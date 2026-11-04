# T8: The city, walls and skyline

The sea of roofs is what makes a flat city epic. Targets: `refs/generated/ref4.png`, `ref9.png`. The test: from 宣德楼's gallery or 300 m up, a kilometre of grey roofs fades into warm haze with a flat horizon.

You own `src/modules/city.js`, `src/modules/walls.js`, `src/modules/tieta.js`, plus new files under `src/city/`. Use `buildHall` at LOD1 and LOD2, materials and `src/flora/` through their public APIs without editing them: report bugs instead. Append to `plan.js`, `shots.js` and `MODULE_ORDER`, re-reading right before you edit. Other agents are working at the same time.

## Build

- **Inner city** (`inferred`): about x ±1400, z ±1300, outside the palace and the avenue. A procedural street plan: not a rigid grid, with lanes, courtyards and cross streets lining up with the 御廊's openings (z every 150-250 m, read `plan.js` and `src/modules/yujie.js` when it exists). Thousands of houses, mostly 板瓦 grey tile with some thatch, one and two storeys, courtyard clusters with
  trees. Instanced, and varied in size, tone and orientation. A band of larger offices and halls near the avenue: 明堂颁朔布政府, 秘书省, 景灵东宫 and 景灵西宫 per the bible.
- It must hold at 200 m and read as texture at 1-3 km, and doesn't need to be walkable beyond blocking footprints at block level. Walkers on the avenue see it over the 御廊 roofs, so check that view.
- **汴河** continuing east and west to the city edge as a simple far water strip; T6 owns the central 1 km, so match it.
- **朱雀门** at z ≈ 1300 and the inner wall running east and west from it, around the whole inner city. Read the 宣德楼 module for the masonry approach. Simpler than 宣德楼, but it terminates the avenue's southward view, so it must hold at 300 m. `qingming_gate.jpg` is the reference: battered platform, flat timber lintels, hipped 城楼.
- **铁塔** (开宝寺塔) near the north-east corner of the inner city, around (1150, -1050). It still stands, so match reality: octagonal, 13 storeys, 55.88 m, dark brown glazed brick, slender. Hero level only as a far silhouette plus a decent mid-distance.
- **Beyond the wall,** far LOD city to about 4 km and farmland and tree lines to the horizon, so no empty plain shows from any view. Flat. No mountains.

Add validation shots 4 (`ref4`) and 9 (`ref9`, `time: 'bluehour'`).

## Acceptance

Compare side by side at least 5 rounds. Budgets at `preview`: the whole module ≤ 2 M triangles (shadows included) and ≤ 40 draw calls in frame. This is where budgets are won or lost, so aggressively batch by distance. World build for this module ≤ 15 s here. Be blunt about what falls short.
