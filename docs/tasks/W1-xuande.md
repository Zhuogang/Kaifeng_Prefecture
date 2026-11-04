# Whole-world round 1: 宣德楼 (T4b)

You still own `src/yingzao/`, `src/materials/` (except `stone.js` and `paving.js`), `src/modules/xuande.js`. Light has improved a lot (TL), so judge again in the current light. Work through `docs/BACKLOG.md` under 宣德楼, plus these, biggest first:

1. **Open the central door** so visitors can walk through the platform, with a real flat-lintelled passage (timber lining, per `qingming_gate.jpg`) through to the palace side, and walkable footprints. `node test/gates/reachability.mjs` must pass for the forecourt and "through the gate". The other four stay closed.
2. **Forecourt is nearly black** in shot 1. It should be warm lit stone with visible coursing and long shadows, as in `ref1`.
3. **Masonry and frieze:** warm tonal richness and deep carved relief as in `ref1`, not line art. Doors without shading bands.
4. **Bracket band** at the eaves must catch light and read as individual brackets from 100 m, as in `ref1` and `ref3`, not a dark stripe.
5. Move shot 1 closer and lower to match `ref1`'s framing more closely (it's fine to not fit both 阙亭 in).

Since `buildHall` is shared by every building, improvements reach the whole city, so keep its API stable. At least 6 compare rounds.
