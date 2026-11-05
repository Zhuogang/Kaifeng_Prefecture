# D3: painted stone, then everything near the camera

The 宣德楼 hall is now good: leave it alone. Compare `out/gate-D2b/crops/c1-hall.jpg`, which I'm happy with, against `c2-mid.jpg`, which I'm not.

The D2b bridge swung too far. It was one flat tone with speckle, and it's now a stack of flat, saturated rectangles with hard edges, like voxels. It's also too yellow, and the deck has stair-steps. Neither is what the target does.

## 1. A painted stone recipe (fix the bridge first)

Look at `refs/style/crops/c2-mid.jpg` and `c2-near.jpg`. Stones in the target differ from each other only **a little**. Most of the richness is **inside** each stone: soft washes, mottling and worn edges. Joints are thin, dark and uneven. Light is what creates the big value differences, not the blocks.

Use this as one shared routine in `src/paint/stonework.js` or `materials.js`, with per-use parameters:

```glsl
// q: surface position in metres. size: block size in metres. Sketch, adapt it freely.
float course = floor(q.y/size.y + (noise(q*.7)-.5)*.10);              // joints wander
vec2 p = vec2(q.x/size.x + hash21(vec2(course,3.))*.7 + (noise(q*1.3)-.5)*.10, q.y/size.y + (noise(q*.7)-.5)*.10);
vec2 id = floor(p), f = fract(p);
float h = hash21(id+course), h2 = hash21(id+course+7.);
// Distance to the nearest joint, in metres, with a width that changes along the joint.
float d = min(min(f.x,1.-f.x)*size.x, min(f.y,1.-f.y)*size.y);
float width = mix(.012,.040,noise(q*5.));
float joint = 1.-smoothstep(width, width+max(fwidth(d)*1.5,.01), d);  // fades when too fine to see
// Between stones: small. Within stones: where the richness lives.
float tone = 1. + (h-.5)*.14;                                         // about ±7% only
tone *= 1. + (noise(q*1.1+h*40.)-.5)*.16 + (noise(q*3.7+h*90.)-.5)*.10;
vec3 mineral = mix(vec3(1.03,1.,.96), vec3(.96,.98,1.04), noise(q*.9+h2*30.));   // warm grey and lilac grey
tone *= 1. - smoothstep(.0,.10,d)*0.; // optional: lighten or darken worn edges slightly
vec3 stone = base*tone*mineral;
stone = mix(stone, stone*vec3(.42,.38,.36), joint*.8);
```

This must stay stable under motion: use existing derivative filtering, so nothing sparkles when it gets small.

## 2. The bridge, using that recipe

- **Colour:** base stone is a warm grey-cream, about `#cdbd9f`, greyer than today's yellow. Check against the target by eye.
- **Deck:** no stair-steps. It must be one continuous sweep with a very slight rise to the middle. Find out why it steps and fix the geometry, so that the cornice, beams and balustrade base are smooth lines.
- **Shadow does the separating:** the deck's underside is near dark brown. **It casts a dark band over the top of each pier,** which is one of the most useful things in the target. The side face of every pier is clearly darker than its front. Keep the light direction consistent across all the piers.
- **Piers:** soften them. Slightly chamfered or broken edges, so they aren't crisp boxes. Course lines come from the recipe, so they aren't stripes.
- **Balustrade:** reads as stone, with lit caps and recessed panels. Same recipe, smaller blocks. It shouldn't read as flat planks.
- **Right-hand quay and left bridge end:** same recipe. Today's right quay reads as a brick pattern of flat bars.
- **The reflection** copies the blocks, so it now has hard stripes too. Soften it: blur the reflection's fine detail or stretch it vertically, so piers keep their separate colours but no block edges appear in the water. D4 will add the water strokes.

## 3. 宣德楼's near surfaces

Use `test/gates/crops.py` regions `wall` and `near`, and `refs/style/crops/c1-wall.jpg` and `c1-near.jpg`.

- **The wall:** today it's plain tan. The target has soft, irregular flaking masonry with no neat courses. Stones roughly 1 to 2 m across, loosely coursed, more cobbled near the doors. Over them, broad washes: warm tan, dull olive lichen patches (mostly upper left and near the top), lilac shade patches, and some vertical streaking below the terrace edge. **This surface has swung between camouflage, plastic and plain before.** To avoid that: use the same recipe with low stone-to-stone contrast and wandering joints, keep broad washes dominant, and no blob should be high-contrast. `python3 -I test/gates/detail.py c1 <render>` wall ratios should land inside .7 to 1.3, but the eye decides.
- **The doors:** thick terracotta lintels with worn edges, faint plank lines on the leaves, a central gap, and a dark recess at the side. Keep the gold nails.
- **Near rail:** it's the largest thing on screen. In `c1-near`, each post is a thick square shaft with a neck and a broader cube cap. The top rail is thick and chamfered, and there's a lower rail with a short post between. Dry-brush paint wear runs along the length of the rail, with warm lit edges and deep red-brown shade. Today's rail is dark and simple. Its colour should be closer to the target's terracotta red.
- **Paving:** large slabs in perspective, with thin dark joints from the recipe, slightly different slabs, and a pale stone kerb of separate blocks beside the rail. Keep the cool violet shade and peach light.
- **Petals:** in `c1-near`, near petals are large, curled and two-toned, about 15 to 20 of them spread near the camera, getting smaller and denser with distance. They lie on the ground with soft contact shadow.

## 4. 州桥's near surfaces

Use regions `near` and `trunk`, and `refs/style/crops/c2-near.jpg`.

- **Quay wall:** large rough ashlar from the recipe, with bigger stones than the bridge, moss at the waterline, and a row of chunky kerb stones along the top with lit tops and shaded sides.
- **Mooring post and rope:** stacked rough stones with the rope wrapped around them. The rope is a real twisted cord, thick enough to read.
- **Paving:** slabs from the recipe, warmer than today, with peach dapple on cool shade.
- **The boat:** today's wear is angular. The target has long plank strakes running the hull's length, with wear and streaks **along the grain**, a worn lit gunwale, 3 or 4 thwarts with shadow beneath, visible ribs inside, and a dark interior. Keep the warm dappled light on it.
- **The trunk:** too smooth and too fluted, like wide brush bands. The target has deep dark furrows that break into irregular **plates**, each a few times longer than it is wide, with warm ochre highlights on the lit side, cooler brown in shade, and a little moss low down. Add cross-cracks, so furrows don't run forever. `src/paint/bark.js` is yours, and the same goes for the 宣德楼 tree's trunk, which today reads as a smooth dark arc. That trunk should also look thicker where it comes in from the frame edge.

## Limits

- **Add. Don't restyle.** Palette, light and composition stay.
- `node test/gates/perf.mjs`: at or under **320 ms for 宣德楼 and 600 ms for 州桥**, per-pixel under 80 ms. At most 50 calls and 1.6 M triangles.
- Motion: shimmer under .05%, no crawl or sparkle in joints along the path.
- `tools/paint/extremes.mjs` holds. `node --test test/*.spec.mjs` and `node test/gates/scroll.mjs` pass.
- Render view 0 at 1920×1080 and look at the crops before reporting. Report honestly against the target, crop by crop.

You own `src/paint/`, `src/modules/paint_*.js` and `tools/paint/`.
