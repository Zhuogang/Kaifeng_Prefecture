# S3: broken colour, bark and surfaces, on both scenes

You own `src/paint/` except `playback.js`, plus `src/modules/paint_xuande.js`, `src/modules/paint_zhouqiao.js` and `tools/paint/` except files
named `scroll-*`. Another agent is working on `src/main.js`, `index.html`, `src/scroll/`, `src/paint/playback.js` and `tools/build.mjs`, so leave those
alone, and retry a build if it collides. Write under `out/S3/`. Budgets: 1.2 M triangles and 40 draw calls per scene.

Composition is accepted in both scenes. Don't recompose. This round is surfaces only.

## The finding

Whenever a texture was criticised it got smoothed, so surfaces have swung between camouflage and plastic. `test/gates/detail.py` now measures
it. Run it every round:

    python3 -I test/gates/detail.py c1 <render.png>
    python3 -I test/gates/detail.py c2 <render.png>

It compares band-pass energy with the target, for luma (L) and warm-cool chroma (C), in a fine and a medium band. **Luma is mostly close. Chroma is far
short**: wall .11, paving .24, boat .28, trunk .34, columns .37, water .36, canal .41, avenue .51. In the paintings a stroke moves hue as well as value. Ours move
value only, and that's a large part of why they look like smooth 3D renders and not gouache. The hall goes the other way: L 1.47 and 1.63, because its interior is near black.

**Done means every ratio in both tables sits between .7 and 1.3.** The upper bound is as binding as the lower. A wall at 2.0 is camouflage again.

## 1. Broken colour, in shared code

In `paintMaterial`, strokes must shift colour as well as value. Attach them in surface space as `variation` is, not screen space. Start from this and tune it:

```glsl
// two independent stroke fields, signed, in the same coordinates as the material's variation
float s1 = dab(q * f1), s2 = dab(q * f2 + 17.);
float fade = 1. - smoothstep(.6, 1.6, max(length(dFdx(q * f2)), length(dFdy(q * f2))));   // no strokes below pixel size: this prevents shimmer
vec3 warmCool = s1 > 0. ? WARM : COOL;
vec3 pigment  = s2 > 0. ? PIGMENT_A : PIGMENT_B;
c *= mix(vec3(1.), warmCool, abs(s1) * 2. * amount * fade) * mix(vec3(1.), pigment, abs(s2) * 2. * amount * fade);
```

Per material, as multipliers around 1 and in the spirit of the target:

- Stone and wall: ochre, rose, olive-grey. Shade side: violet against brown.
- Timber: amber, red, grey.
- Water: jade, teal, warm cream. Broad horizontal strokes.
- Roof: green-grey, slate blue, warm grey.
- Avenue: peach, rose, warm grey.

Leaves and blossom are already close. Leave them unless the table says otherwise.

Check shimmer as you go. Render 10 clip frames from a fixed camera for each scene and run `python3 -I test/gates/shimmer.py <dir>`. Keep the mean under .05%.

## 2. Bark, in shared code

Four rounds have failed here: combed, clay, contour lines, smooth tube. c2's bark is braided ridges with deep dark crevices. Compare a full-size crop of c2 with yours. Use **ridged** noise with a braiding warp:

```glsl
vec2 g = vec2(q.x * A, q.y * B);                     // A:B about 8:1, so ridges run along growth. About 6 to 8 ridges across the trunk
g.x += 1.1 * noise(vec2(q.x * .7, q.y * .22));       // braiding: ridges wander and merge. Without this it looks combed
float n = noise(g) * .65 + noise(g * 2.3 + 11.) * .35;
float ridged = 1. - abs(2. * n - 1.);                // 1 on the crevice lines
float crevice = smoothstep(.72, .93, ridged);        // thin, near-black crevice
float plate = smoothstep(.2, .7, 1. - ridged);       // the raised plates between crevices
```

- Colour: crevice near black, warm (about sRGB .13, .09, .09). Plates mid brown in shade (.30, .24, .24, leaning violet), and tan to ochre on their sun side (.72, .55, .34). Grey-green lichen in slow patches.
- Normal: derive it from `plate`, so ridges catch the sun on one side and throw shade on the other.
- Silhouette: add low-frequency radial displacement in `willow.js`, using the same field, so the outline is lumpy and not a smooth tube.
- Remove the stuck-on oval burl. Keep the root flare.

宣德楼's hero tree uses the same bark in a darker charcoal-brown, per c1.

## 3. 宣德楼

- **Wall.** Compare with c1. It has stone blocks showing through near the doors, grey-olive lichen in the upper band and rose-ochre plaster. Add large low-contrast block courses in the lower third. Cast the hero tree's dappled shadow across the wall's upper left, as c1 does.
- **Lintels. Lead's correction: S2's brief said "dark lintel" and that was wrong.** In c1 lintels are terracotta, and lit, with the dark shadow below them. Door leaves are warmer and lighter than yours.
- **門皆金釘朱漆.** The source says the doors are vermilion lacquer with gold nails. Add rows of small gold studs on the leaves, which is a cheap, strict Song detail.
- **Hall.** Too near-black, L 1.47 and 1.63. Lift the interior to warm dark brown with a faint glow. Brackets are stacked dark logs: make them warm red-orange with lit lower faces, each cluster reading as a fan of arms, and the columns thicker.
- **Roof.** Stronger tile rows, heavier ridge and hip ridges.

## 4. 州桥

- **Water is milky.** `water_low` sat .14 against .21, p50 .60 against .54. Deeper jade in the lower left, stronger warm reflections, broken colour.
- **Columns** are grey. Cooler in shade but warmer in sun. c2's sat is .28.
- **Paving:** peach dapples, broken colour, chroma .24 now. **Boat:** L .51, C .28, more wear and more plank-by-plank variation.

## Done means

- At least 10 rounds, listing what changed in each.
- Final tables from `test/gates/detail.py` for both scenes, every ratio within .7 to 1.3, or say which miss and why.
- Shimmer below .05% mean for both. Regional values from `test/gates/regions.py` in the report, as a check, so nothing has drifted.
- `out/S3/` holds compare images for both scenes and full-size crops beside the target for bark, wall, hall, water and paving.
- The tests pass, renders are byte-identical twice, the sub-path check passes.
