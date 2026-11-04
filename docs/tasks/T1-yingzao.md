# T1: The 《营造法式》 hall generator

Every timber building in the city comes from this. It's the most important code in the project, and its look decides
whether this reads as Song or as a theme park. Compare against `refs/historical/jinci_side.jpg`,
`refs/historical/jinci_porch.jpg` and `refs/generated/ref7.png`.

You own `src/yingzao/` except `ornament.js` and `paint.js` (T2 owns those), plus `src/modules/hall.js`. Other agents
are working in this tree at the same time, so touch nothing else.

## 1. Rules: `src/yingzao/rules.js` (pure, no three.js)

Implement `docs/YINGZAO.md` so `test/yingzao.spec.mjs` passes. That test defines the exports: `CHI`, `CAI_GRADES`
(`guangCun`, `houCun`), `fen(grade)` (metres), `QI_GUANG_FEN`, `QI_HOU_FEN`, `ZUCAI_FEN`, `shengqi(bays)` (metres),
`cejiao(lengthM, 'front'|'side')`, `columnDiameterFen(klass)`, `laneFen(hasBujian)`, `eaveOut(rafterDiameterM)`,
`feiziOut(eaveOutM)`, `wingOut(bays)`, `juHeight(depthM, roofClass)`, `zheDrops(H, n)`, `zheProfile(halfDepth, H, n)`,
`puzuoName(tiao)`, `TIAO_MAX_FEN`, `TIAO_TOTAL_MAX_FEN`, `bujianCount('dangxin'|'ci'|'shao')`, `GONG_FEN`, `LUDOU_FEN`.

## 2. Layout: `src/yingzao/layout.js` (pure)

`hallLayout(spec)` returns all positions, so they can be tested without rendering. `test/hall-layout.spec.mjs` defines
the required shape: `columns` (`x, z, baseY, topY, headX, headZ, perimeter, corner`), `sets` (`kind`: `zhutou`, `bujian` or
`zhuanjiao`, with `side`: `north`, `east`, `south` or `west`, and `x, y, z`), `liaoyanSpan`, `ridgeRise`, `section`,
`eave` (`out, feizi, wing`). Hall centred on the origin, front facing +Z (south).

## 3. Geometry: `src/yingzao/hall.js`

`buildHall(spec, engine)` returns `{ lod0, lod1, lod2, footprint }`, three `THREE.Group`s and a footprint for walk
collision. Accept `roof` (`wudian` 四阿, `xieshan` 九脊, `xuanshan` 不厦两头), `eaves` (1 or 2, where 2 adds a 副阶
surround), `interior` (column grid inside), `platform` (height, plan margin), `tile` (`tongwa`, `banwa`), and a bay fill for
each bay (`open`, `door`, `lattice`, `wall`). Take materials as a parameter, with simple defaults, since T2 is writing the
real ones.

Real construction at LOD0, because people will stand under it:

- **Columns:** 侧脚, 生起, 梭柱 taper in 3 steps, 櫍 and stone base.
- **Beams:** 阑额 at `laneFen`, 普拍方, 橑檐方, all following the 生起 rise.
- **铺作:** actually stack the parts: 栌斗, 华栱, 泥道栱, 瓜子栱, 慢栱, 令栱, 耍头, 散斗, 昂 for 下昂造. Real 卷杀 on the 栱
  ends. Separate 柱头, 补间 and 转角 sets, with real 45° corner members. Instance each set type.
- **Roof:** the surface follows `zheProfile` in section, and rises along the eave with 生起 and the 翼角 growth, so the eave
  line curves up continuously from mid-facade, not a flick at the corner. Exposed 椽 and 飞子 under the eave with the
  section's curve, real 角梁, 燕颔版 and 狼牙版 at tile level.
- **Tiles:** 筒瓦 ribs that read at 300 m, individual tile seams and 瓦当/滴水 at 5 m. Choose the cheapest way to get that.
- **Ridges:** 正脊, 垂脊, 戗脊 as stacked courses. Export anchor points for ridge ornaments (`anchors.chiwei`,
  `anchors.chuishou`); T2 places the ornaments.

LOD1: merged, no individual brackets, silhouette and eave depth preserved, bracket band suggested. LOD2: silhouette only,
under 500 triangles, for 500 m and beyond. No popping of the overall shape between LODs.

## 4. Test module: `src/modules/hall.js`

`test(engine)` builds a 7 × 4 bay double-eaved 四阿 殿 on a 2 m platform, grade 2, 六铺作, returning views: 0 three-quarter at
40 m; 1 frontal at 60 m; 2 eye level under the eave at 3 m looking up into the 铺作; 3 close on a corner, showing the 转角
set and 翼角; 4 aerial at 80 m; 5 LOD1 at 150 m; 6 LOD2 at 500 m. It also takes `?hall=small` for a 3 × 2 单檐 歇山 and
`?hall=corridor` for a 10 × 1 单檐 悬山 open corridor, both needed later.

## Acceptance

- `node --test test/yingzao.spec.mjs test/hall-layout.spec.mjs` passes.
- All 7 views render with no page or shader errors. Look at each one and iterate. Your eye is part of the job.
- Budget: the hero hall at LOD0 is ≤ 600k triangles and ≤ 60 draw calls. LOD1 ≤ 30k and ≤ 10 draw calls. Report the numbers.
- It reads as Song, per the table in `docs/ART_BIBLE.md`: stout leaning columns, big brackets that take up a large share of
  the facade's height, very deep eaves, gentle roof, continuous eave curve. If a view looks like the Forbidden City, or like a
  roof placed on a box, it isn't done.
- List everything you marked `// inferred:`.
