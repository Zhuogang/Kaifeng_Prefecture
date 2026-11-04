# T3: Trees, lotus and cranes

Procedural, instanced, and light enough for an integrated GPU. Athenaion's generators
(`/lambda/nfs/jo-dc/PROJECTS/experiments/athenaion/src/vegetation/`, `src/flora/`, `src/materials/foliage.js`) are worth reading
and porting from, but none of its species belong here: no cypress, olive or umbrella pine.

You own `src/flora/`, `src/modules/flora.js` and `src/modules/cranes.js`. Other agents are working in this tree at the same time,
so touch nothing else.

## Species

Each exports `build…({ seed, height, … })` returning `{ lod0, lod1, lod2 }`, plus an instancer that scatters a list of positions with
per-instance variation (scale, rotation, tint, blossom density, wind phase), so nothing looks copy-pasted.

- **Willow 柳,** the signature tree. Pollarded, gnarled, thick lumpy trunk with a burst of long, thin, drooping whips, per the Song
  scroll (`refs/historical/qingming_gate.jpg`, `jinming.jpg`) and `refs/generated/ref5.png`. Whips sway in wind through a vertex
  shader. Fresh late-spring yellow-green.
- **Blossom trees** for 御街: peach, plum, pear and apricot, in the same generator with species parameters. Peach and plum pink,
  pear and apricot white. Modest size (5-7 m), open branching, sparse new leaf, dense flowers (`refs/generated/ref2.png`, `ref7.png`).
  Fallen petals as a ground decal or instanced scatter around each tree, and on water.
- **Palace trees:** 槐 (rounded broadleaf) and 柏 (dark, tall, gnarled conifer), per `refs/generated/ref4.png`.
- **Lotus:** floating leaves only, it's late spring: no flowers. Instanced round leaves with a notch, slight upturned edge, varied
  size and tilt, sitting on the water surface for the 御沟.
- **Grass tufts and weeds** in paving cracks and at wall bases: instanced, sparse.

## Cranes: `src/modules/cranes.js`

Twenty red-crowned cranes, per `refs/historical/ruihe_bright.jpg` and `refs/generated/ref3.png`: white body, black flight feathers and
neck, red crown, long trailing legs. 18 in flight, wheeling in a loose flock around a given centre and height in a deterministic
looping path driven by `engine.time`, wings flapping through a vertex shader. 2 perched on given anchor points. Always present, and
never tied to a shot. Export `addCranes(engine, { center, radius, height, perches })`. Keep them under 100k triangles in total, with a cheap
far version, because they'll usually be small in frame. Bird anatomy must read properly at 15 m.

## Test module: `src/modules/flora.js`

`test(engine)`: view 0 a hero willow at 12 m; 1 a willow row along a line at 60 m; 2 one of each blossom tree at 15 m; 3 a blossom row
at 150 m on the flat plain; 4 palace trees at 25 m; 5 a lotus patch on a simple water plane at 4 m; 6 close on a willow from 2 m, looking
up through the whips; 7 the crane flock from below against the sky, telephoto, with a 2 m crane at 15 m in frame.

## Acceptance

- All views render with no page or shader errors, compared by you against the references.
- Budgets at explore quality: one LOD0 tree ≤ 60k triangles; a row of 100 blossom trees at 150 m ≤ 200k triangles and ≤ 6 draw calls;
  LOD2 ≤ 100 triangles per tree. Report the numbers.
- Alpha-tested foliage must not shimmer badly at distance. Check view 3 specifically.
- Deterministic: wind and flight are driven only by `engine.time`.
