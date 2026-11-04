# T4: 宣德楼, the hero, with everything combined

This is the make-or-break view. Build the real 宣德楼 from `docs/ART_BIBLE.md` and iterate until it holds up beside
`refs/generated/ref1.png` and `ref3.png`, using `refs/historical/ruihe_bright.jpg`, `qingming_gate.jpg`, `jinming.jpg` and
`jinci_side.jpg`. The target is athenaion's quality: see `/lambda/nfs/jo-dc/PROJECTS/experiments/athenaion/media/overview.jpg`.

You now own `src/yingzao/`, `src/materials/` (except `stone.js`, owned by T6), and `src/modules/xuande.js`. You may append to
`src/world/plan.js`, `src/world/shots.js` and `MODULE_ORDER` in `src/world/index.js`, re-reading each right before you edit, since
other agents append too. Keep `test/*.spec.mjs` passing.

## Build

- Battered masonry platform, five doors with gold studs and flat timber lintels, the carved frieze of dragons, phoenixes and
  clouds, 7-bay main hall, 曲尺朵楼 wings, two 阙亭 about 60 m forward, vermilion 杈子 and railings, palace wall running east and west
  with 左掖门 and 右掖门. Real scale, per the art bible, all positions in `plan.js` with evidence tags.
- Paved forecourt under it, so you judge the building on its real ground (T5 will extend this later).
- Add validation shots 1 and 3 in `shots.js` matching the reference framings. The `--shot N` render writes a side-by-side
  `_cmp.png`: use it constantly.

## What the lead found wrong in the first pass. Fix all of it.

1. **Brackets up close** are a blocky camouflage pattern (hall views 2 and 3). They must read as painted, weathered timber, like
   `ref7.png` and `jinci_porch.jpg`.
2. **Flat plastic look.** Columns are flat orange, roofs flat green. Real surfaces have paint wear, dirt gradients and ambient
   occlusion in every recess. Look at how much tone variation `ref1` has in one wall.
3. **Roof colour and relief.** Too saturated and smooth. `ref3` is a deep grey-green with heavy tile relief, dark troughs and a
   lighter dirty band near the eaves. Tile relief should catch the low sun.
4. **Eave curve.** Nearly straight from the front. It must visibly sweep up toward the corners, as in `ref3` and `jinci_side`.
5. **Proportions.** The bracket band reads too small against the roof. It should take up a big share of the facade, like `ref1` and
   `ref8`. Check it against `jinci_side`.
6. **鸱尾** is a thin crescent shark fin. Per 《瑞鹤图》 and `ref3` it's a chunky upright body, bigger at the base where it bites the
   ridge, curling inward at the top, with relief scales and fin edges. Keep the fork-shaped 拒鹊子.
7. **Paving** is big flat-coloured rectangles. Real stones are ~0.4-0.8 m, with thin dark joints, low tonal contrast, worn surfaces
   and fine normal detail (`ref1`).
8. **Brick** is far too large and too tan. 条砖 is about 0.41 × 0.20 × 0.08 m, and `ref1` is warm grey with fine courses.

## How to work

Render, compare with the reference side by side, name the biggest difference, fix it, repeat. Work on the biggest difference first,
and don't stop early: do at least 8 compare-and-fix rounds, and keep going while each round makes a visible improvement. `preview`
for iterating, `--quality high --spp 16` to check.

## Acceptance

- A stranger looking at `shot1_cmp.png` and `shot3_cmp.png` should think render and reference show the same place at comparable
  quality. It doesn't need to match pixel for pixel. Architecture follows the art bible where they disagree.
- Also hold up from the side, from behind, from 2 m at the doors and from the top of the platform. No camera-specific content. Report
  renders from those angles too.
- `node --test test/*.spec.mjs` passes.
- Budgets: the whole gate complex at LOD0 ≤ 2.5 M triangles in frame (shadow passes included) and ≤ 200 draw calls at `preview`.
  Report the numbers.
- List what still falls short, honestly. Say which of your renders you think is closest and which is furthest from the reference.
