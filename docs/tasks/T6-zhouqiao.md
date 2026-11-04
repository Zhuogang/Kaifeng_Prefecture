# T6: 州桥, carved walls and the 汴河

Build the bridge and river from `docs/ART_BIBLE.md`. Targets: `refs/generated/ref5.png` and `ref6.png`, at athenaion's quality
(`/lambda/nfs/jo-dc/PROJECTS/experiments/athenaion/media/overview.jpg`). **It is not an arch bridge.** The sources say so; ref5 is right about that.

You own `src/materials/stone.js`, `src/water/`, `src/modules/zhouqiao.js` and `src/modules/bianhe.js`. Read `src/yingzao/` and other materials but don't edit them:
T4 is changing them right now, so use `buildHall` through its public API and report any bug. You may append to `src/world/plan.js`, `src/world/shots.js` and
`MODULE_ORDER`, re-reading each right before you edit. Athenaion's `src/water/` is worth porting from, but this water is calm, silt-green and murky, never turquoise.

## Build

- **汴河:** east-west at z ≈ 400 per the art bible, ~25 m wide at the bridge, running ~1 km to each side. Real bank geometry and water with reflections, ripples and depth colour. Cheap
  enough for an integrated GPU: no planar reflection pass unless you can keep it within budget, and consider screen-space or a blurred sky-only reflection instead.
- **州桥:** span ~25 m north-south, deck ~30 m wide with slight camber and bluestone paving, closely set bluestone columns and stone beams beneath, stone 楯栏 balustrade, per the art bible.
  Low enough that boats can't pass.
- **Carved walls:** bluestone embankment on both banks, ~25-30 m each side of the bridge, ~3.3 m tall, repeating groups ~7.5 m long of one 海马 and two cranes among clouds in deep relief, real
  displaced geometry or a parallax material that holds at 2 m. **The hardest part: it must read as carving, with sculptural depth and raking-light shadows like `ref6`.** Athenaion's SDF sculpting
  (`src/sculpt/`) is available.
- **Twin 阙** on the north bank at the road, using `buildHall` and a masonry base. Keep them modest; ref5's are too large.
- **Moored boats:** 2-3 empty timber river boats per `refs/historical/qingming_detail.jpg`. No crew.
- Flat ground and simple paving at each bridge end. T5 will build the avenue, so export the deck-end coordinates through `plan.js`. Leave willows to placement later, and register `WILLOWS`
  positions in `plan.js` for the banks.
- `engine.groundHeight` must drop to the deck and bank correctly so people can walk over the bridge. The river itself isn't walkable.

Add validation shots 5 and 6 in `shots.js` matching the reference framings. `--shot N` writes a side-by-side `_cmp.png`: use it.

## How to work

Compare side by side, name the biggest difference, fix it, repeat, biggest first. At least 6 rounds.

## Acceptance

A stranger should accept `shot5_cmp.png` and `shot6_cmp.png` as the same place at comparable quality, and it also holds up on the deck at eye level and from the bank at 2 m from the carving. Report
triangles and draw calls: the whole module ≤ 800k triangles and ≤ 80 draw calls in frame at `preview`. Be blunt about what falls short.
