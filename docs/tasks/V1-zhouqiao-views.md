# V1: more views of 州桥

The client compared this project with athenaion and wants more views and angles of 州桥. **They said twice to limit the scope.** This is not a world, a city or a free camera. It's six more authored shots of the bridge that already exists, each of which only has to look right from its own camera.

The lead scouted these on the current geometry. Most already work. Do only the fixes listed.

## The views

Add `VIEWS` to `src/paint/composition.js`. View 1 is today's path, unchanged.

| # | Name | Gloss | pos | target | fov | The picture |
|---|---|---|---|---|---|---|
| 1 | 河灣 | The bend | today's | today's | 45 | Unchanged |
| 2 | 舟中 | In the boat | -3, 1.35, 6.4 | 9, 3.4, -27 | 45 | Low on the water, the whole bridge and both towers above their reflections |
| 3 | 柳下 | Under the willow | -11, 3, 17 | 22, 3.4, -25 | 45 | Trunk on the left, mooring post and rope, dappled paving, bridge and towers beyond |
| 4 | 橋上 | On the bridge | -8, 5.35, -24.2 | 35, 8.5, -34 | 45 | Standing on the deck between the rails, towers ahead and to the left |
| 5 | 橋側 | Beside the bridge | -19.5, 3.6, -12 | 30, 3.2, -23 | 45 | The bridge's face receding, near rail below, tower at the end |
| 6 | 橋下 | Under the bridge | -12, 1.1, -24.2 | 30, 1.8, -30.5 | 50 | Between the two rows of columns, receding to the light. This is the line in the caption: 橋下密排石柱 |
| 7 | 遠望 | From above | 6, 15, 34 | 12, 2.2, -25 | 40 | The whole place: willow framing the left, boat, reflections, bridge, towers, roofs |

You may adjust a camera by up to 1 m and 3° if the picture needs it. Report what you changed.

Each view gets its own short, slow drift, using the same fraction and round-trip idea as view 1: at least .2 m of travel, at most .2 m/s. The look range stays ±6° and ±3°. Nothing may clip, and no hole may show, at any fraction and look corner.

## Fixes, and only these

**All views: the sky.** The cyclorama stops at about ±97°, which shows as black in views 4, 5 and 6. Extend its arc far enough to cover those frusta, about ±145°. The texture already uses mirrored wrapping, so the existing projection stays in register. Both the main and the reflected scene need this. No new images.

**View 2.** The hull rim takes the bottom 20% of the frame as a smooth brown band. Reframe so that it takes at most 10%, or give the visible part the worn plank look the rest of the boat has.

**View 4.** The willow `WILLOWS[2]`, at `[16.5,-27]`, stands in the middle of the deck. Move it along view 1's sight line to just beyond the north rail, and scale it so that it keeps its apparent size in view 1. It must keep its seed, so that it's the same tree. Its base mustn't be seen floating.

**View 6.** This is the main work, and it's the shot that matters most.
- The deck's underside is a flat, near-black plane. Give it visible cross beams, and warm light bounced up from the water with a soft moving ripple on it. It must read as a dim stone ceiling lit from below, not as a void. Painted, not photographic.
- The water shows large rectangular blocks. See the next section.
- The far end of the corridor is a pale blank wall. It should read as the sunlit bank or open light.
- Pieces of the tower show floating through the gaps. Hide or support them, for example with piles that exist only in this view.
- Check the column surfaces at this distance. Fix them only if they break the picture.

**View 7.** The hero willow's arching limb ends in a bare stick, and the tan ground right of the towers is empty. Add whips to the limb, and a few existing `hall()` roofs and broadleaf trees on that ground.

**Water, in the views that show it wrongly.** The dash field and its depth ramp are tuned to view 1's heading, so looking along x gives big blocks (view 6). I'd try a per-view transform of the coordinates used for the marks only, identity in view 1, so that marks always run across the view direction and shrink with distance as they do in view 1. Boat, bank and mirror shading keep using true world coordinates. Use a better approach if you find one, as long as view 1's water stays the same. `python3 -I test/gates/colour.py` must still pass on view 1.

**Dressing that only one view can see.** Composed shots are allowed to cheat. Where a fix would change view 1, or is only needed by one view, put it in a small mesh that's visible only in that view, and leave it out of the reflection unless it's needed there. That costs one call per view that has any, so use few.

## The page

- `engine.registry.paint.viewSet`: an array of `{name, gloss, viewAt, roundTrip}`, with one entry for 宣德楼 and seven for 州桥. `registry.paint.viewAt` and `registry.paint.views` keep their meaning, and indices 0 to 8 of `views` stay exactly as they are. Append the new views' fraction-0 frames as indices 9 to 14, so `tools/render.mjs --view` reaches them.
- **Controls:** keys 1 to 7, and a small on-screen list of buttons, each with `data-view="<0-based index>"`, showing the number and the name. It should be quiet, in the existing scroll UI style, and it must not cover the picture's centre. At phone width show numbers only. No list and no key response on 宣德楼.
- **Changing view:** set fraction and phase to 0, keep pointer look, and don't reload the page or rebuild anything. Cross-fade over about .7 s, using a snapshot of the last frame in an element with id `scroll-fade`. With reduced motion, cut instantly.
- **URL and API:** `?view=<1-based>`. `window.__scroll.view(i)` (0-based), `window.__scroll.views()` (names and glosses), and `status().view`. Existing fields don't change.
- **Captions:** the name reads `州橋 · 橋下`, and the two-line cycle restarts on a change of view. View 6 leads with the 橋下密排石柱 line. Don't add any quotation: those two lines are the only source text.
- **Culling:** use the union of all views. It saves under 2% in this scene today, so if the union saves nothing measurable, bypass it for this scene. Don't write per-view culling.

## Not in scope

No new buildings beyond the view 7 dressing, no new images or targets, no orbit or free camera, no wider look range, no changes to the quality ladder, no general river or bank work, no work on views beyond these seven, and no changes to 宣德楼. If you spot something else worth doing, put it in your report.

## Keep

- View 1 and 宣德楼 stay as approved, and `test/gates/views.mjs` compares them with `out/V0/`.
- At most 50 calls and 1.6 M triangles in every view.
- `test/gates/perf.mjs`: within 10% of today's 304 and 371 ms.
- Shimmer on 10 fixed-camera frames of views 2, 6 and 7: reversal rate under .05%, with `python3 -I test/gates/shimmer.py`. The ceiling ripple must read as slow movement, not flicker.
- Everything that passes today: `node --test test/*.spec.mjs`, and `node test/gates/scroll.mjs` after `node tools/build.mjs`.

## Files

You own `src/paint/`, `src/modules/paint_*.js`, `src/scroll/`, `index.html` where the UI needs it, and `tools/paint/`.

## Report

Add to the usual format: the final camera table, the output of `node test/gates/views.mjs`, and which fixes used view-only dressing. Look at every `out/V1/view*-sheet.png` before you finish, and say plainly which views you think are weakest.
