# V1c: last touches

Accepted, don't change: views 1, 2, 3, 4 and 7, the page and 宣德楼. The light structure of view 6 is also accepted: dim corridor, bright exit, darker reflections. This round only fixes three faults in view 6, and the far bank in view 5.

## View 6, 橋下

**1. The stone has gone slate.** The columns are a uniform blue-violet, like wet concrete. Keep their value, but they are still the warm cream stone of the bridge, seen in shade. In `c2` shadows are violet with warmth still in them. So: a warmer, less saturated base shadow; warm light rising from the water over the lowest metre or so, fading upward; and a warm vertical edge on faces and corners turned toward the bright openings on either side, strongest on the near columns. The aim is that you could tell they're the same stones as in view 2.

**2. The ceiling has vertical bars.** Enlarged, the beams show hard-edged stripes about 10 to 20 px wide across their length, like a badly stretched low-resolution texture. That's the worst fault in the shot. Find what's causing it and remove it. The beams should carry a soft wash, with the slow ripple as broad, smooth, curving bands of warm light. Nothing should have hard vertical edges. Check at 2× zoom, in `out/V1c/` crops.

**3. The water has scan lines.** Near the column bases on the right and along the bottom, thin white and blue one-pixel ticks read as a rendering glitch, not paint. Widen and soften these marks into dabs in this view, and lower their contrast, so they're strokes of pale reflected sky. Keep the dark column reflections and the warm path down the centre, and make the path a little more visible.

## View 5, 橋側: the far bank

The bank now exists, but it reads as a long blank wall with evenly spaced lollipop trees and one hall hidden behind a tree. It also costs 520,000 triangles, which is too much for something this far away.

- Replace the willows with a continuous, overlapping treeline, using the cheap distance tree already in `compose` (a short trunk with a few ellipsoid crowns and sparse leaves). Vary the heights and spacing, and leave no gaps of sky at the base. Put 3 or 4 `hall()` roofs among the trees, each with its roof clear of the tree in front.
- Haze it all further, toward the warm distance of view 1, so that it sits behind the bridge in value.
- Break up the wall's long pale band: lower it, or vary it, and let trees come down to it in places.
- The whole dressing, reflection included, stays under 150,000 triangles. Views 4 and 5 should then report no more than about 1.1 M.

Then check view 4, which sees this bank at its right edge. It should still look as it does now, or better.

## The page

The hint line at the bottom should mention the views, for example `1–7 views`, on 州桥 only. 宣德楼's hint doesn't change.

## Keep

`node test/gates/views.mjs out/V1c`, `shimmer.py` on view 6, `perf.mjs`, the specs, and `scroll.mjs` after `build.mjs`. Report in the usual format, and attach `out/V1c/view6.png`, `out/V1c/view5.png` and your ceiling crop.
