# P0: Prove the painted look on one scene

Read `docs/IMPRESSION.md`. This decides whether the direction works. Build one scene, 州桥 per `refs/style/c2.png`, in real time, and make it look hand-painted **while the camera moves**. It's the hardest scene we have: water, willow, stone, boat, distant building.

You own `src/paint/` (new) and `src/modules/paint_zhouqiao.js` (new), and may edit `src/core/pipeline.js` and `src/core/materials.js`, keeping `node --test test/*.spec.mjs` passing. Read `src/yingzao/`, `src/water/` and `src/flora/` and reuse what's useful, but this scene owes them nothing: simplify shapes, exaggerate, or write new simpler geometry. No external assets for this proof: everything in code, including sky and clouds.

## Approach. Use your judgement, but address each of these.

- **Shape language.** Remove micro-detail. Painters simplify: masses first, a few confident accents. `buildHall` at low detail is likely a good start for the towers. Silhouettes matter more than parts.
- **Painted light.** Soft ramped lighting instead of physically based shading. Warm light, cool violet-blue shadows, hue shifting rather than only darkening. Painted ambient occlusion. Consider gradient-mapped shading per material.
- **Brushwork that sticks to the world.** Stroke detail must belong to surfaces and not slide across the screen. Consider world-space or object-space brush textures driving colour variation, ragged edges and direction, and if you use a screen-space painterly filter such as a cheap anisotropic Kuwahara at reduced resolution, keep it subtle, so that it doesn't produce the shower-door effect. Avoid a uniform "Photoshop filter" look, and avoid hard toon bands and black outlines. Target loose gouache, not comic ink.
- **Foliage as brush dabs.** Willow as long sweeping painted ribbons and clumps with some light through them. Move them gently.
- **Water as painted strokes.** Horizontal broken strokes of reflected colour with some movement, per `c2`. Reflection simplified. It must not look like a physically accurate mirror.
- **Sky** as painted washes and soft gouache clouds with warm light.

## Output

In the module's `test(engine)`, return views: **0** matching `c2`'s framing as closely as you can, then **1-8**, a slow camera path of about 6 m dollying past the boat toward the bridge, evenly spaced. Add `?drift=1` so it plays in the page.

Use `refs/style/c2.png` to compare side by side. Iterate at least 10 rounds, biggest difference first. Check motion with views 1-8 by comparing consecutive frames: strokes must stay attached to surfaces, with no swimming, flicker or sliding. Make a `out/P0/motion.png` sheet of the 8 frames.

## Acceptance

- View 0 beside `c2.png`: a stranger accepts it as the same painter's work, at a lower level of finish. If it reads as a toon shader or a filtered 3D render, it isn't done.
- Consecutive motion frames hold together with no sliding or flicker.
- Deterministic, driven by `engine.time`.
- Budget at 1080p on a Radeon 780M, estimated: ≤ 1 M triangles, ≤ 100 draw calls, and report what each new pass costs. No full-resolution multi-pass filters while moving.
- Be blunt: say whether you think this direction can work in real time, and what would most improve it. If painted image backdrops would make a big difference, say so plainly with reasons, but don't use them here.
