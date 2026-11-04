# T5: 御街 at its real width

Build the avenue from `docs/ART_BIBLE.md`: 312 m wide, z = 0 to ~1300, cross-section as written there. Targets: `refs/generated/ref2.png`, `ref7.png`, `ref9.png`. **The bible's "main composition problem" section is your main job**: 312 m with nobody on it must feel majestic, not like an
airfield, without narrowing it. At 1.6 m eye height this ground fills most of the frame.

You own `src/modules/yujie.js` and `src/materials/paving.js`, and you may add new files under `src/yujie/`. Use `buildHall` (`?hall=corridor` is the 御廊 model), `chazi`, `src/water/` and `src/flora/` through their public APIs without editing them: report bugs instead. Append to `plan.js`, `shots.js` and
`MODULE_ORDER`, re-reading right before you edit. Other agents are working at the same time.

## Build

- Coursed bluestone 御道 with worn cart ruts, drains and repairs, brick lanes with real bond, per the backlog notes on paving: fine stones, not big flat rectangles. Must hold at 1.6 m and at 500 m without visible tiling.
- Two brick-lined 御沟 with water and instanced lotus leaves. Banks of peach, plum, pear and apricot blossom in rows with irregular spacing, fallen petals on ground and water.
- Vermilion and black 杈子 lines as the text describes, instanced, with occasional gaps so people can walk through. `engine.footprints` must stop walkers at fences, canals and corridor walls, except at those gaps and at small crossings over the canals.
- 御廊 on both sides for the whole length, as an instanced corridor module, with openings at cross streets every 150-250 m. It must not look copy-pasted: vary wear, tile tone and occasional bays.
- The funnel down to 州桥's deck on both banks, using the deck coordinates in `plan.js`. Don't edit T6's modules.
- Plan entries and evidence tags in `plan.js`. Keep width as one constant.

Add validation shot 2 matching `ref2` (cropped at the far right, so don't expect the gate in frame), and shot 7 matching `ref7`.

## Acceptance

Compare side by side at least 6 rounds, biggest difference first. Budgets at `preview`: ≤ 1.5 M triangles (shadows included) and ≤ 120 draw calls in frame for this module, from any eye-level view along the avenue. It holds from eye level on the road, in the lane under the corridor, and from 200 m up. Walking the length with
`__explore` never lets you pass a fence or fall in a canal. Be blunt about what falls short.
