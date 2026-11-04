# 《营造法式》 rules (李诫, 1103)

Song architecture is close to parametric, and this is the spec. Numbers below were checked against the raw
text in `docs/sources/yingzao_*.txt` (Wikisource). Read 卷四 and 卷五 there for anything not covered here.
`test/yingzao.spec.mjs` enforces these values.

**Two different 分, a common trap.** The 材分 module 分 is 1/15 of a 材's height, so it varies with grade. In
the 侧脚 and 举折 rules, 分 is the ordinary length unit, 0.1 寸. Units: 1 尺 = 10 寸 = 100 分(length) =
1000 厘. Use `CHI = 0.312` m.

## 材 (卷四)

| 等 | 广 × 厚 (寸) | 用于 |
|---|---|---|
| 1 | 9 × 6 | 殿身九间至十一间 |
| 2 | 8.25 × 5.5 | 殿身五间至七间 |
| 3 | 7.5 × 5 | 殿身三间至五间, 厅堂七间 |
| 4 | 7.2 × 4.8 | 殿三间, 厅堂五间 |
| 5 | 6.6 × 4.4 | 殿小三间, 厅堂大三间 |
| 6 | 6 × 4 | 亭榭, 小厅堂 |
| 7 | 5.25 × 3.5 | 小殿, 亭榭 |
| 8 | 4.5 × 3 | 殿内藻井, 小亭榭铺作多者 |

- 材 is 15 分(module) high and 10 分 thick. 栔 is 6 × 4 分. 足材 = 材 + 栔 = 21 分 high.

## 铺作 (卷四)

- Named by 出跳: 1 跳 四铺作, 2 五铺作, 3 六铺作, 4 七铺作, 5 八铺作.
- 每跳之长,心不过三十分,传跳虽多,不过一百五十分: each 跳 ≤ 30 分, total ≤ 150 分.
- 当心间须用补间铺作两朵,次间及梢间各用一朵: central bay 2 补间 sets; other bays 1. Spaced evenly. Where bay
  widths are uneven, the difference per set is at most 1 尺.
- Lengths in 分: 华栱 (两卷头, 足材, 单材 on 补间) 72; 泥道栱 62; 瓜子栱 62; 令栱 72; 慢栱 92.
- 栱头: 栱 are 材 section. Ends cut with 卷杀: 泥道 and 慢栱 4 瓣, 瓜子 4 瓣, 令栱 5 瓣. 栱头上留六分,下杀九分.
- 枓: 栌枓 32 × 32 分 and 20 分 high; on corner columns, 36 分 square.

## 柱 (卷五)

- 径: 殿阁 两材两栔至三材 = 42-45 分; 厅堂 两材一栔 = 36 分; 余屋 一材一栔至两材 = 21-30 分.
- 生起, corner column above central 平柱 (若十三间殿堂则角柱比平柱生高一尺二寸…): 13 间 1.2 尺; 11 间 1.0 尺;
  9 间 0.8 尺; 7 间 0.6 尺; 5 间 0.4 尺; 3 间 0.2 尺. Intermediate columns rise progressively.
- 侧脚, column head leans inward: front faces 1 分 per 尺 of column length (1%); side faces 8 厘 per 尺 (0.8%).
- 梭柱 卷杀: divide the column into 3; the top third tapers in 3 steps so the head matches the 栌枓 base, 4
  分(module) in on each side; the bottom third matches the middle.
- 柱下櫍: 3 分 larger each side, 10 分 thick.

## 阑额 (卷五)

- 广加材一倍,厚减广三分之一: 30 × 20 分. 如不用补间铺作,即厚取广之半: 30 × 15 分.

## 檐 (卷五)

- 如椽径三寸,即檐出三尺五寸;椽径五寸,即檐出四尺至四尺五寸: measured from 橑檐方 centre. Interpolate between.
- 每檐一尺,出飞子六寸: 飞子 projection = 0.6 × 檐出, added beyond it.
- 若一间生四寸,三间生五寸,五间生七寸: eaves grow outward toward the corner, starting from the 次角柱's 补间
  铺作. 1 间 4 寸; 3 间 5 寸; 5 间 7 寸; 五间以上,约度随宜加减 (we use 7 + 1 per 2 further 间).

## 举折 (卷五)

**举 (ridge height H above 橑檐方 back, D = 前后橑檐方心 distance):**

| Class | H | `juHeight` key |
|---|---|---|
| 殿阁楼台 | D / 3 | `diange` |
| 筒瓦厅堂 | D / 4 × 1.08 | `tongwa_tingtang` |
| 筒瓦廊屋, 瓪瓦厅堂 | D / 4 × 1.05 | `tongwa_langwu`, `banwa_tingtang` |
| 瓪瓦廊屋 | D / 4 × 1.03 | `banwa_langwu` |

**折 (the concave profile):** 以举高尺丈每尺折一寸,每架自上递减半为法. For a slope with N 架 of equal plan width:

1. Start at the ridge, P₀ = (0, H). The eave point is E = (D/2, 0).
2. For i = 1…N-1: draw a straight line from Pᵢ₋₁ to E. Pᵢ is on that line at the i-th purlin's x, lowered by
   dᵢ, where d₁ = H/10 and each following d is half the previous one.
3. Note the line is redrawn from the new point each time (逐缝取平,皆下至橑檐方背), not from the ridge.

Text's example: H = 2 丈 gives d = 2 尺, 1 尺, 5 寸, 2.5 寸. Worked case in `test/yingzao.spec.mjs`.

## Other sources in `docs/sources/`

- 卷三: 石作, 壕寨 (筑城之制), 殿阶基, 重台钩阑
- 卷十二, 卷十三: 瓦作 (结瓦, 鸱尾, 兽头, 垒屋脊), 泥作
- 卷十四: 彩画作 (五彩遍装, 碾玉装, 青绿叠晕棱间装, 解绿装, 丹粉刷饰)
- 卷十五: 砖作 (用砖, 须弥坐, 城壁), 窑作 (琉璃瓦)
- 卷十九: 功限 (城门道)
