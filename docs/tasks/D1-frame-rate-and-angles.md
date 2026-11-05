# D1: frame rate and wider angles

The client has seen both scenes and approved the look: "everything is good". They want three things: more detail, a higher frame rate, and slightly wider angles. They measure **15 to 16 FPS** on their machine.

This task makes the room for detail. D2 will spend it. Do not add detail here, and do not change how anything looks except where wider angles require it.

## What the numbers say

`test/gates/perf.mjs` runs the real scroll route in software at 960×540 (pixel ratio .75). Baseline in `out/D0/baseline.json`:

| Scene | Frame | Scales with pixels | Fixed | Calls | Triangles |
|---|---|---|---|---|---|
| 宣德楼 | 351 ms | 83 ms | 268 ms | 30 | 1,031,785 |
| 州桥 | 638 ms | 82 ms | 556 ms | 19 | 1,138,896 |

Most of the cost doesn't fall when resolution does, which explains why the adaptive ratio hit its .75 floor and the client is still at 15 FPS. The obvious suspect is the reflection: `WATER` and the 宣德楼 call site fix it at 1536×864, larger than the main image at that ratio, and it draws a full second copy of the scene with full-cost shaders. In 宣德楼 the water is a small part of the picture. Profile before you believe this.

## 1. Wider angles

Do this first, because culling depends on what can be seen.

- **Look range:** pointer look goes from ±3° yaw and ±1.5° pitch to **±6° yaw and ±3° pitch**. Define these as named constants, not inline in the handler.
- **Path:** fraction 0 stays exactly where it is, because view 0 is composed over the target. The rest of the path sweeps wider, so the viewing angle on the main building changes noticeably:
  - 宣德楼: end at about `pos [1.5, 7.6, 70]`, against today's `[-2.45, 7.1, 71]`. Keep the avenue, rails and framing blossom in the picture.
  - 州桥: double the sideways component of the travel, and let the camera rise about .6 m. Keep the boat, trunk and bridge in the picture.
  - Adjust these if the picture needs it, and report what you chose. The drift must stay as slow and gentle as it is now.
- **Nothing may break at the extremes.** No holes, set edges, floating objects, bare ground plane, or backdrop seams, at any path fraction combined with any look corner. Extending ground, backdrop or distant dressing is allowed.
- Write `tools/paint/extremes.mjs`: for one scene, render fractions 0, .5 and 1 at the four look corners, plus the centre, into a contact sheet under `out/D1/`. Look at them.

## 2. Frame cost

**Target, in `test/gates/perf.mjs`: each scene at 40% of baseline or less, so 宣德楼 ≤ 140 ms and 州桥 ≤ 255 ms.** Go lower if you can. Measure each change and keep what pays. The order below is my guess at the order of return, and your profile outranks it.

Start with a per-pass breakdown (main, reflection, wash, output), using a 1×1 `readPixels` after each pass to force completion, in `tools/paint/perf-passes.mjs`.

1. **Reflection size.** Derive it from the main drawing buffer (about half each way), not a fixed size. Resize with it.
2. **Reflection content.** The reflection is distorted and only seen in the water, so give it a cheap scene: stroke fields, broken colour and bark relief are invisible there. Compile cheap variants of the materials for this pass. Leave out what can't reflect into view: nearby foreground, anything outside the water's reach, small dressing. The reflected colours and large shapes must stay the same.
3. **Triangles.** Find out what the 1.1 M is made of. Drop instances that can never be on screen from any path fraction and look corner, and reduce those that stay tiny for the whole path. Do this at build time using the same `viewAt` and look constants, with a margin. The foreground keeps its full detail.
4. **Fragment cost.** Where a shader evaluates stacks of `noise`, `dab` or `pigmentDab` per pixel, bake the stack once at start-up into a small set of tiling, mipmapped textures, using the same GLSL and render targets, and sample those instead. They are generated in code, so this is allowed. This one matters most for D2: detail in a texture costs the same at any frequency.
5. **Everything else.** Look for `discard` overdraw on foliage, redundant passes, and the wash pass's size.

## 3. Adaptive quality

Today the ratio only ever falls, in .25 steps, and it never recovers. That throws away resolution for almost nothing, and it costs the client the detail they are asking for. Replace it:

- Budget 33 ms a frame. When over budget, give up the things that are hardest to see first: reflection every second frame, then a smaller reflection, then pixel ratio in .125 steps down to a floor of .75.
- When comfortably under budget (under 24 ms for 6 seconds), step back up. If a step up is undone within a few seconds, don't retry it for 30 seconds, so it can't oscillate.
- Render at full quality when there is no budget pressure. `render.mjs` output must stay deterministic: the test route always renders the reflection fresh.
- `?ratio=<n>` locks the pixel ratio and holds the ladder still. `test/gates/perf.mjs` passes `ratio=.75`, so that its runs compare with the baseline.
- `P` adds a line with the quality level and reflection size, and a line with the GPU name from `WEBGL_debug_renderer_info` when available. `window.__scroll.status()` gains the same fields. Existing fields don't change.

## Keep

- **The look.** Compare against `out/D0/` (`x0`, `x4`, `x8` for 宣德楼, `v0`, `v4`, `v8` for 州桥, same views). At normal size they should be hard to tell apart in the main image. Reflections may soften slightly, but not change colour or lose their shapes. Fraction 0 and view 0 stay in register with the earlier render.
- **Surface richness.** This is the failure I'm most worried about. Baking and culling must not smooth anything. Run `python3 -I test/gates/detail.py c1|c2 <render>` before and after: the ratios must not fall. Don't try to raise them in this task.
- **Motion.** Baked strokes stay fixed to surfaces. No new shimmer: `python3 -I test/gates/shimmer.py` on 10 fixed-camera frames, reversal rate under .05%. No popping along the path.
- **Start-up.** First frame in software stays at or below 6.2 s for 宣德楼 and 7.1 s for 州桥, including anything you bake.
- **Everything already passing.** `node --test test/*.spec.mjs`, `node test/gates/scroll.mjs` after `node tools/build.mjs`, the limits of 40 calls and 1.2 M triangles, and `?world=1`, whose engine path must not change.

## Files

You own `src/paint/`, `src/modules/paint_*.js`, `src/scroll/`, `index.html` where the readout needs it, and `tools/paint/`. Change `src/core/` only if a measurement shows it's necessary, only behind the existing `painted` option, and tell me why. `test/gates/perf.mjs` is lead-owned.

## Report

Add to the usual format: the per-pass table before and after, the perf gate's output before and after, what the 1.1 M triangles were and what's left, the final path numbers, and each change's measured gain. Say plainly if a target was missed.
