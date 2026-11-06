# W1: real sunlight on 州桥

The client approved all seven views, then said: "make it more detailed and beautiful, maybe even the color and contrast, now it is way too plastic."

View 1's overall contrast already measures close to `c2`, so a global grade isn't the fix. Put `c2` beside a render and the difference is light. In `c2`, and in athenaion, every object casts a shadow and every crevice is dark. In our scene nothing casts anything: the rails leave no shadow on the deck, the eaves none on the walls, the deck none on the piers. Shading is a smooth function of the normal plus blotchy noise, and that's what plastic looks like.

This round is the light. The next round is brush marks and near objects, so don't start those here.

`out/W0/` holds the current render of every view at 1080p. All seven views change in this task, including view 1: it's no longer locked. Composition and cameras stay. 宣德楼 stays locked to `out/V0/`, so put everything behind `profile==='zhouqiao'` and leave its sun and materials alone.

## 1. A cast-shadow map, baked once

- Render depth once at load from an orthographic sun camera covering what the views see (about x −50 to 90, z −70 to 45), at about 4096². Bake once rather than per frame, so the cost per frame is only the lookups. Software start-up may grow by up to 1.5 s.
- Sample it in the paint materials with a small soft filter: a few taps with a rotation anchored to world position, never to the screen, or it will crawl. Edges should be soft and painted, with no acne, peter-panning or visible texels at 1080p, on the near rail in view 5 or the deck in view 4.
- The sun for this scene: `paintSun` can differ on this profile. In `c2` the light comes from behind the viewer's left, low and golden. Fronts of the bridge and towers (facing +z) are lit, the quay wall (facing +x) is in shade, and shadows fall away to the right and back. Start around elevation 35° and tune it by looking. All seven views need to keep clear form with this one sun.
- Casters: stone, plaster, timber, roof, bark, and leaves, so that foliage gives real dapple. Leaves may use simplified coverage in the depth pass. Wind doesn't need to reach it. View-only dressing needn't cast.
- What this must visibly produce: the rails' shadows across the deck, eave and bracket shadows on walls and columns, the deck and capitals in shadow on the piers, the boat shadowed by the quay and tree, the hero willow's dapple on the quay and boat, tower shadows on the ground behind.
- Replace authored fake shadows that this makes redundant, such as the eave and canopy proxies on the walls, and the quay dapple if the real dapple is as good. Remove them rather than stacking them.
- The reflection materials should sample it too, so that shaded piers reflect dark. That's what grounds the bridge in the water.

## 2. Sun and shade as two colours

Rebuild the stone, plaster, timber, roof and paving lighting on `sun = max(dot(n,l),0) * shadow`, so that lit and shaded are clearly different pigments rather than a smooth ramp. The lit side is warm gold. The shade is violet-grey with warmth left in it, and lighter where it faces open sky or bounces off warm stone.

These are medians measured from `c2`, in sRGB. `python3 -I test/gates/look.py out/W1/view1.png` prints the same boxes for yours.

| Surface | `c2` shade | `c2` sun | Ours now, shade | Ours now, sun |
|---|---|---|---|---|
| Rail and deck face | 135 127 113 | 227 191 156 | 128 105 80 | 212 194 166 |
| Pier shafts | 101 88 74 | 236 190 146 | 120 114 101 | 200 183 153 |
| Quay wall (in shade) | 106 89 76 | 163 144 138 | 142 133 118 | 204 187 163 |

Hues of timber already measure about right, so don't shift them: shadow will give them depth. The paving's dapple is too pink. Its lit tone in `c2` is 210 169 142, and its shade 102 100 113.

Treat these numbers as a guide. A lesson from earlier rounds: colour numbers can match while the picture is wrong, and pushing to a number causes new faults. Look at `c2`.

## 3. Crevices

Rails, brackets, eaves, joints and column bases need dark contact occlusion. Find out whether the pipeline's existing AO can run in the painted route, cheaply and without shimmer, tinted violet rather than black, at a small radius. If it can't, darken the crevices another way: for example, baked per-vertex occlusion on the bracket and rail geometry. Tell me which you used, and what it costs.

## 4. Contrast in the other views

Views 2, 4, 5 and 7 are washed out compared with `c2`, partly because they're all sunlit stone and pale sky. `look.py` prints value percentiles and local contrast. As a guide: p5 about .18 to .26, p25 about .38 to .46, and hp8 at least .08, in each of views 1 to 5 and 7. Get there through light and shadow, not a tone curve. Don't crush the darks: a painting's blacks stay lifted, so p1 stays above about .10.

View 6 keeps its accepted light structure. Its branch stays, and it should simply not break.

## Keep

- `node test/gates/views.mjs out/W1`: 宣德楼 unchanged, no holes, budget, controls. Software frame cost: `test/gates/perf.mjs` may grow by up to 25% on 州桥 (today 373 ms), and must not grow on 宣德楼.
- Shimmer on views 2, 4 and 7: `shimmer.py`, reversal under .05%. Shadows are static, so they shouldn't flicker. Moving dapple isn't required.
- The specs, and `scroll.mjs` after `build.mjs`. `colour.py` on view 1 is a guide this round: report it, and don't let it pull the water away from `c2`.

## Files

You own `src/paint/`, `src/modules/paint_*.js`, `src/scroll/`, `tools/paint/`. Change `src/core/` only if a measurement shows it's needed, only behind the existing `painted` option, and tell me why.

## Report

The usual format, plus: sun direction, map size, what AO you used, the old fakes you removed, `look.py` output for all views against `out/W0/`, and 1080p renders of every view at `out/W1/`, using `node test/gates/views.mjs`. Say honestly how it compares with `c2`, and name the most plastic thing left.
