# T7: 大庆殿 and the palace

Build the palace behind 宣德楼 from `docs/ART_BIBLE.md`. Targets: `refs/generated/ref8.png`, `ref4.png`. Where they disagree with the bible, the bible wins: no bells, 9+ bays, a much larger court.

You own `src/modules/palace.js`, plus new files under `src/palace/`. Use `buildHall`, `goulan`, `src/flora/` through their public APIs without editing them: report bugs instead. Append to `plan.js`, `shots.js` and `MODULE_ORDER`, re-reading right before you edit. Other agents are working at the same time.

## Build

- 大庆门 on the axis, entering a vast plain paved court. **大庆殿**, around z ≈ -320, 9+ bays, double-eaved 四阿, on a tiered 殿阶基 with 勾阑 and 踏道, 挟屋 either side if it helps. Bay fill with Song lattice at the right scale, not oversized red grids. Two tower pavilions in the court (庭设两楼,如寺院钟楼), with no bells.
- 左右长庆门 and long 廊 galleries around the court. The scale should feel huge and empty at eye level, per `ref8`'s mood.
- Beyond and around, at LOD1: 文德殿, 紫宸殿, 垂拱殿 and further courts with walls and galleries, out to about x ±350, z -650. Palace trees (槐, 柏) in courts. It has to read properly from the air (`ref4`) and over walls, and needn't be fully walkable beyond the 大庆殿 court.
- Footprints for walking. Connect to 宣德楼's rear: leave a route from the gate through 大庆门 into the court (read `src/modules/xuande.js`, don't edit it).

Add validation shot 8 matching `ref8`.

## Acceptance

Compare side by side at least 5 rounds. Budgets at `preview`: ≤ 1.5 M triangles (shadows included) and ≤ 120 draw calls in frame, using LOD1 and LOD2 aggressively beyond 150 m. Be blunt about what falls short.
