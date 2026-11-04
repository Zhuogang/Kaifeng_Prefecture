# 东京梦华: Art bible

Photoreal and cinematic like athenaion, with no people. Northern Song Kaifeng in the 宣和 era, around 1120,
late spring. Buildings first. Crowds come later, so leave street space for them but don't model any.

**Slice 1: the palace axis.** 宣德楼, 大庆殿 behind it, 御街 at its real width, 州桥 and the 汴河, ending at 朱雀门,
in about 1.4 km × 2 km, with inner-city roofs out to a hazy horizon. The test for each view: would it stop
someone scrolling, the way athenaion's shots do?

**Real over convenient.** The land is really flat and 御街 is really 312 m wide. These were deliberate
decisions. Don't shrink or dramatise them to make a shot easier.

## The look

- **Light:** low, warm morning sun from the south-east (az ≈ 120°, el ≈ 25°). Lit surfaces glow warm; shadows
  are cool blue-grey, never black. Later we can vary it by time of day, so don't bake the sun into albedo.
- **The land is flat.** It's the Yellow River plain, with no mountains, cliffs or waterfalls. Drama has to
  come from scale, repetition, deep eaves throwing long shadows, wet stone, water, river mist, aerial
  perspective over a kilometre of roofs, and big skies. Treat the sky as half of every wide shot.
- **Colour:** vermilion, deep green glaze, warm grey brick, white plaster (粉墙朱户), bluestone. Rich and
  natural, never neon, never washed out. Set numeric contrast targets from the approved references with
  `tools/colorstats.mjs`.
- **Wear:** this is a city in use. Rain streaks below eaves, sun-faded vermilion on south faces, moss on
  north-facing stone, polished paths in paving, soot. Nothing looks freshly painted or copy-pasted.

## Song, not Qing

Your default idea of "Chinese palace" is the Forbidden City, which is 600 years too late. This table is a
review gate.

| | Song: do this | Qing: wrong here |
|---|---|---|
| 铺作 | Large and structural, a big share of the facade's height. 1-2 补间 per bay. Real 昂 | Dense rows of tiny decorative clusters |
| Columns | Stout, with visible 侧脚 lean, 生起 rise to the corners, 梭柱 taper | Plumb, uniform, slender |
| Eaves | Very deep. The whole eave line curves up continuously from mid-facade | Straight eave with a sharp flick at the corner |
| Roof | Gentle 举折 curve (殿阁 rise 1/3) | Steeper 举架 |
| Ridge ends | 鸱尾 with upturned fin and 拒鹊子 on top (瑞鹤图) | 龙吻 with a dragon head |
| Tile colour | Deep green or grey-green glaze, 剪边 on some roofs | Imperial yellow |
| Painting | 五彩遍装 and 碾玉装 with soft 叠晕 on hero buildings, 丹粉刷饰 on lesser ones | 和玺 and 旋子 patterns |
| Walls | White or pink plaster with vermilion timber | Solid ox-blood red walls |
| Gate passages | Flat timber lintel, opening narrowing upward, battered masonry (`qingming_gate.jpg`) | Round brick arches |
| Balustrades | 勾阑 with 望柱, 云栱, 华版 (`jinming.jpg`) | Qing white marble with dragon-and-cloud post heads |
| Courtyards | Vast, plain, low walls and long galleries (廊) | Tiled monumental terraces everywhere |

## Places in slice 1

Tags: **[text]** 东京梦华录 (`docs/sources/dongjing_*.txt`), **[excavated]** archaeology reports,
**[painting]** `refs/historical/`, **[inferred]** our design decision.

**宣德楼** (origin, facing south)
- 列五门,门皆金钉朱漆: five vermilion doors with gold studs. [text]
- 壁皆砖石间甃,镌镂龙凤飞云之状: brick-and-stone walls carved with dragons, phoenixes and flying clouds.
  The terrace wall in `jinming.jpg` shows a dragon roundel of this kind. [text, painting]
- 覆以琉璃瓦: glazed tile roof, 鸱尾 and 拒鹊子 as in 《瑞鹤图》. [text, painting]
- 曲尺朵楼,朱栏彩槛,下列两阙亭相对,悉用朱红杈子: L-shaped wing towers with vermilion railings and two facing
  阙 pavilions, fenced in vermilion 杈子. [text]
- Massing: battered masonry platform ~12 m tall, 7-bay main hall above, U-shaped plan opening south, overall
  width ~120 m, 阙亭 projecting ~60 m forward. [inferred, from 景龙门 and the scroll's gate]
- 景龙门 (excavated inner-city gate, a useful comparison): ~60 m wide, ~19.3 m deep, three passages each
  ~5.6 m wide, brick-faced. [excavated]

**Palace behind** (toward -Z)
- South wall along z = 0, with 左掖门 and 右掖门 flanking 宣德楼. [text]
- 大庆殿: 入宣德楼正门,乃大庆殿,庭设两楼,如寺院钟楼: main hall in a huge court with two bell-tower-like
  pavilions. Double-eave hipped roof, 9+ bays, on a stone 殿阶基, with long side galleries. Hall centred
  around z ≈ -320. Size and position [inferred].
- 文德殿, 垂拱殿, 紫宸殿 and others as LOD1 roofs beyond. Palace extent about x ±350, z 0 to -650. [inferred]

**御街** (slice 1 covers z = 0 to ~1300, along +Z)
- 约阔二百余步,两边乃御廊: at least 200 paces wide, so **312 m** (1 步 = 5 尺). [text, as a single constant in
  `plan.js`]
- Full length 七八里, about 4-4.5 km, from 宣德楼 past 州桥 and 朱雀门 to 南薰门. [secondary source] Slice 1 stops at
  朱雀门. Record 南薰门 at z ≈ 4200 in `plan.js` for later slices.
- Cross-section from the centreline. The order is from the text; the widths are [inferred]:
  - |x| < 30: central 御道 (中心御道,不得人马行往)
  - 30-42: brick-lined 御沟 with lotus leaves (砖石甃砌御沟水两道,宣和间尽植莲荷). Late spring means leaves, not
    flowers.
  - 42-52: banks planted with peach, plum, pear and apricot in blossom (近岸植桃李梨杏,杂花相间)
  - 52: row of vermilion 杈子 (路心又安朱漆杈子两行)
  - 52-148: open paved lane where people walk (行人皆在廊下朱杈子之外)
  - 148: black 杈子 (各安立黑漆杈子)
  - 148-156: 御廊, an open-fronted timber corridor with roof
- **The main composition problem of this slice.** 312 m with no people can read as an empty airfield. Solve it
  without narrowing the avenue: long perspective lines from canals, fences and tree rows; paving with real
  structure (coursed bluestone on the 御道, brick in the lanes, drains, worn cart ruts, repairs); the rhythm of the
  御廊 bays; long morning shadows; and the 州桥 阙 as mid-distance landmarks. Budget for it: this ground fills most of
  every view from the avenue, so it must hold up at 1.6 m eye height.
- South of the gate: 明堂颁朔布政府 and 秘书省 opposite the 掖门; 景灵东宫 and 景灵西宫 along the avenue. [text]
- At the river the avenue funnels to 州桥's deck: narrowing over the last ~40 m on each bank, since a 312 m road
  can't cross a ~30 m bridge. [inferred]

**朱雀门** (z ≈ 1300, inner-city south wall) 正南曰朱雀门,左曰保康门,右曰新门. [text] Position [inferred] from
the inner wall's 约二十里 perimeter. It terminates the slice's southward view. Build it as a gate on a battered
platform, like 宣德楼 but simpler, with the inner-city wall running east and west from it. South of it can be
LOD2 for now.

**州桥** (天汉桥, centre z ≈ 400, crossing the 汴河) **It is not an arch bridge.** The arch visible at the site today
is a Ming rebuild on the Song abutment. [excavated]
- Position ~400 m south of 宣德楼. [secondary source, weak: keep as one constant in `plan.js`]
- 低平不通舟船: low and flat, boats can't pass under. [text]
- 其柱皆青石为之,石梁石笋楯栏: bluestone columns, stone beams, stone balustrade. 桥下密排石柱: closely set stone
  columns underneath. [text]
- Span ~25 m north-south, deck ~30 m wide, slightly cambered, square bluestone paving. [excavated]
- 近桥两岸,皆石壁,雕镌海马水兽飞云之状: carved stone walls along both banks. Excavated: ~3.3 m tall, repeating
  groups ~7.5 m long of one 海马 and two cranes among clouds, ~25-30 m per wall, on the banks to each side of
  the bridge. [text, excavated]
- 州桥之北岸御路,东西两阙,楼观对聳: twin 阙 towers on the north bank at the road. [text]

**汴河:** east-west at z ≈ 400, ~25 m wide at the bridge. Slow and silt-green. Moored timber boats without
crew (`qingming_detail.jpg`). Willows on both banks.

**City beyond:** procedural inner-city blocks behind the 御廊, mostly 板瓦 grey tile with some thatch, at
LOD1/LOD2. It only has to hold up as a sea of roofs.

**开宝寺塔 (铁塔):** the skyline landmark to the north-east, outside the walkable slice. Octagonal, 13 storeys,
55.88 m, brown glazed brick, begun 1049. It still stands, so match it closely. [excavated/extant]

**Cranes:** 20 red-crowned cranes (《瑞鹤图》, 1112) circling 宣德楼's roof, two perched on the 鸱尾. Procedural and
always present, not tied to a shot.

## Materials

- **Glazed tile:** deep green, glossy, with per-tile hue variation, and 筒瓦 ribs that read at distance.
- **Vermilion timber:** cinnabar, sun-faded on south faces, cracked at the base, darker in recesses.
- **Masonry platform:** warm grey brick bonded with bluestone courses, carved panels, a white lime band at the
  top. Dark water staining and efflorescence at the base.
- **Bluestone (青石):** dark blue-grey, dressed and tooled, worn smooth on walking surfaces, algae at the
  waterline.
- **Plaster:** warm white, patchy, rain-streaked, with a dirty splash zone at the base.
- **Gold studs:** tarnished gilt, warm, not chrome.
- **Water:** silt-green with sky reflections, murky rather than turquoise.

## Vegetation

Willow is the signature (`jinming.jpg`, `qingming_*.jpg`: pollarded gnarled trunks with long drooping
whips). Also peach, plum, pear and apricot in blossom on 御街, lotus leaves in the 御沟, 槐 and 柏 in palace
courts. No cypress, olive or palm from athenaion's world.

## Reference shots

`refs/generated/ref1…ref9.png` are the look targets once approved. They define mood and quality. Where one
contradicts this document on architecture, this document wins.
