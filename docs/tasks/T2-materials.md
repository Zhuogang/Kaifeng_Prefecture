# T2: Materials, 彩画 and roof ornaments

The quality target is the surfaces in `refs/generated/` (ref1 masonry and doors, ref3 tiles and 鸱尾, ref6 bluestone, ref7
weathered timber and brackets) and the real thing in `refs/historical/jinci_porch.jpg`. Athenaion's materials
(`/lambda/nfs/jo-dc/PROJECTS/experiments/athenaion/src/materials/`, `src/sculpt/`) are worth reading and porting from.

You own `src/materials/`, `src/yingzao/ornament.js`, `src/yingzao/paint.js` and `src/modules/materials.js`. Other agents are
working in this tree at the same time, so touch nothing else.

## Materials

All use `proceduralMaterial()`, are world-space, deterministic, and scale cost by `engine.quality`. Export a function per
family, with parameters for variation, so 50 buildings don't look stamped. Each must hold from 2 m to 500 m without visible
tiling or shimmer, so filter high frequencies by pixel footprint.

- `tile.js`: deep green glaze, glossy with per-tile hue and sheen variation, darker in the troughs, lichen and dirt toward the
  eaves. Variants: `green`, `grey` (板瓦 for common roofs), `jianbian` (剪边, green edging with grey field, per
  `jinci_side.jpg`). Takes tile coordinates from a vertex attribute.
- `timber.js`: cinnabar columns and beams, sun-faded on south faces (from world normal and height), cracked and chipped at the
  base, darker in recesses.
- `masonry.js`: warm grey brick in real bond with bluestone courses, a white lime band at the top, water staining and
  efflorescence at the base. Parameters for battered walls.
- `stone.js`: bluestone 青石, dressed and tool-marked, worn smooth on walking surfaces, algae below a given waterline.
- `paving.js`: coursed bluestone for 御道 (with cart ruts, repairs, drains) and brick for lanes. This is most of what you see
  on the 312 m avenue at 1.6 m eye height, so it has to be excellent. It takes a world-space layout function so T5 can
  control where courses and ruts run.
- `plaster.js`: warm white, patchy, rain-streaked, dirty splash zone at the base.
- `metal.js`: tarnished gilt for door studs, dark iron.

## 彩画: `src/yingzao/paint.js`

Song painting per `docs/sources/yingzao_第十四卷.txt`. A material hook keyed by member UVs and a member-type attribute, giving
`wucai` 五彩遍装 (hero buildings), `nianyu` 碾玉装 (cool blue-green with 叠晕), `danfen` 丹粉刷饰 (plain ochre-red with white
edges, for common buildings). Soft 叠晕 gradients, floral 华文 on beams, 卷杀 edges picked out. Weathered and faded per `ref7.png`.
Never Qing 和玺 or 旋子 patterns.

## Ornaments: `src/yingzao/ornament.js`

Each a function returning geometry at LOD0 and a cheap LOD1, placed on anchors T1 provides:

- `chiwei`: 鸱尾 per `refs/historical/ruihe_bright.jpg` and `refs/generated/ref3.png`: an upright fin curving inward, relief
  scales, **with `juquezi` 拒鹊子, the small fork on top**. Never a Qing 龙吻 dragon head.
- `chuishou` 垂兽, `dunshou` small ridge figures in a modest row per 《瑞鹤图》, `wadang` 瓦当 and `dishui` 滴水.
- `doorStuds`: instanced gold-studded door leaves, per `ref1.png`, as an actual door with rails and studs.
- `goulan`: 勾阑 balustrade per `docs/sources/yingzao_第三卷.txt` and `refs/historical/jinming.jpg`: 望柱, 云栱, 华版, as an
  instanced, path-following generator.
- `chazi`: 杈子 fence, vermilion and black variants, instanced along a line (`ref2.png` foreground).

No low-poly silhouettes at 2 m. Athenaion's SDF sculpting (`src/sculpt/`) is available if it's the right tool for the 鸱尾.

## Test module: `src/modules/materials.js`

`test(engine)`: a plain plinth wall of each material under the morning sun, plus each ornament. View 0 all materials at 8 m, 1
close at 2 m, 2 distance at 200 m (checks for shimmer and tiling), 3 ornaments at 4 m, 4 the 鸱尾 from below at telephoto,
like `ref3.png`, 5 a beam and bracket stack showing the three 彩画 styles side by side.

## Acceptance

- All views render with no page or shader errors, compared by you against the references.
- Deterministic: no `Math.random` or `Date`.
- Report each material's shader cost roughly (texture lookups, noise octaves). The target is an integrated GPU, so no
  material should need more than 5 octaves at distance.
- Report the triangle count of each ornament at LOD0 and LOD1.
