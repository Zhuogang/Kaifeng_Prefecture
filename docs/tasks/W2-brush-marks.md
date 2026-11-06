# W2: brush marks, so it stops looking plastic

W1 is accepted: the sunlight changed the scene. What still reads as plastic is the surfaces. Look at `refs/style/crops/c2-near.jpg` next to `out/W1/view1.png`: in `c2`, the stone, trunk, boat and paving are built from flat, opaque, visible marks of slightly different colour. Ours are smooth gradients with soft blotches, like an airbrush. The trunk in view 3 and the boat are the clearest cases.

The client asked for more detail and beauty and less plastic. This round is the surface. It's still 州桥 only, and 宣德楼 stays locked. No new buildings, cameras or page work.

## 1. A mark layer, the same size on screen at any distance

This is the core of the task, and it applies to stone, plaster, timber, roof, bark and paving in all seven views.

- **Anchored to surfaces.** Marks stay fixed to the object as the camera drifts, with no shower-door effect.
- **Constant on-screen size.** Pick the two nearest octaves from the pixel footprint and cross-fade them, so that marks stay roughly 4 to 10 px wide at 1080p whether a surface is at 2 m or 80 m. That's what holds both the near post and the far tower. Near surfaces get fine marks rather than big blurry ones, and distance doesn't turn to mush or noise.
- **Flat, opaque, with edges.** Each mark is one colour, with a crisp antialiased edge. No smooth gradient inside a mark, and no soft-noise blotches.
- **Light is applied per mark.** Don't paint marks over a smooth ramp. Break the sun and shade decision by mark, so that form turns in steps of paint, and shadow edges break along strokes instead of being blurred. Keep it from turning into toon bands: the steps are many, small and irregular.
- **Directional.** Along the courses on stone, along growth on bark, along the plank on timber, across the slope on tile, short and mixed on paving. Where a surface has no useful coordinates, use its dominant world axis.
- **Value more than hue.** Earlier rounds learned that pushing hue per stroke goes iridescent. Use mostly value variation, with a small warm or cool shift in pairs.
- **Replace, don't stack.** Remove the soft washes and blotches this makes redundant, including the camouflage-like mottling on the tower's lower wall and the deck.
- **Cost.** I'd bake a tiling texture at load from the same GLSL, so it's two lookups per pixel rather than stacks of noise. Deterministic, and generated in code. Your measurements decide.

The view 6 column branch returns early: bring it into this, so that the near columns get marks too. Keep its accepted light.

## 2. Pigments the marks sit on

Medians measured from `c2`, with `python3 -I test/gates/look.py out/W2/view1.png`. These are the big remaining gaps. Guides, as before.

| Surface | `c2` shade | `c2` sun | Ours, shade | Ours, sun | What's wrong |
|---|---|---|---|---|---|
| Near paving | 102 100 113 | 208 167 141 | 151 124 108 | 227 189 167 | Too light and mauve. In `c2` it's mostly violet-grey shade with pools of warm sun |
| Water by the piers | 102 115 94 | 208 180 129 | 132 131 104 | 228 199 152 | About 30 levels too bright. A pale cream band sits under the bridge |
| Near willow leaves | 88 94 52 | yellow-green, about 190 190 90 | 107 115 79 | pale | Grey-green and flat. `c2` is more saturated and has a wider range |

- **Paving and deck.** Warm tan in sun, violet-grey in shade, also on the deck in view 4, which today reads lilac all over. Get the near quay mostly into the tree's shade with pools of light, as in `c2`. Stronger leaf dapple from the shadow map, or a larger shade area, is fine.
- **Water by the bridge.** Remove the pale band. Each pier's reflection should be dark at its foot and break into gold further out, over deep green. Open water further from the bridge stays as it is.
- **Willows.** A dark, cool, saturated inner crown, real shadow inside it, and leaves in sun going luminous yellow-green. Each whip's value varies. No flat sage.

## 3. Near objects

These fill the frame in some views, so they need more than the mark layer.

- **Hero trunk (views 1, 3).** Bold furrows along the growth, with dark cool crevices and warm lit ridges, built from broad strokes. The blurred streaks should go.
- **Boat (views 1, 2, 7).** Each plank its own colour, lighter worn edges and darker gaps, a darker interior, thwarts catching light, and pools of sun from the willow on the hull and seats, as in `c2`. Measured range: shade 67 59 46, sun about 185 150 110.
- **Stone (all views).** Block-to-block variety in lavender, ochre and warm tan, within each block's marks. Dark joints, worn arrises, and a dark damp band with a touch of moss at the waterline on piers and quay, as in `c2`. Today's stone is clean, pale butter.
- **Tower walls (views 1 to 5, 7).** The lower wall reads as ochre camouflage. `c2` has cream plaster, streaked and worn, in sun about 249 207 155 and shade about 120 98 88, above a stone plinth.
- **Mooring post.** Keep it blocky, and give it weathering and a darker base.

## Keep

- `node test/gates/views.mjs out/W2`. 宣德楼 unchanged, no holes, budget, controls.
- **No boiling.** Marks must hold still under drift. `shimmer.py` under .05% on 10 fixed-camera frames of views 1, 3, 4 and 7. Also render 24 frames along the path in views 3 and 4 and look: marks must not crawl or pop as octaves cross-fade.
- `test/gates/perf.mjs`: 州桥 at most 480 ms in software (today 417). Start-up may grow by up to 1 s.
- The specs, and `scroll.mjs` after `build.mjs`. `detail.py c2` and `look.py` are guides, and the eye decides.

## Files

`src/paint/`, `src/modules/paint_*.js`, `tools/paint/`. Everything behind `profile==='zhouqiao'`.

## Report

The usual format, plus: how the mark layer works and what it costs, `look.py` for all views against `out/W1/`, and `crops.py c2` crops. Attach a 1080p crop of the trunk in view 3, the boat in view 1, and the deck in view 4. Compare them honestly with `c2`, and name the most plastic thing left.
