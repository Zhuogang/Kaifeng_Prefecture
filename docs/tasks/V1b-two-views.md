# V1b: finish 橋下 and 橋側

V1 passes its gate. Views 2, 3, 4 and 7 are accepted, and so is the page. Two pictures aren't there yet, and there's one small page fix. The scope limit still holds: change nothing else.

## View 6, 橋下: light it like a painting

The composition is right: keep the camera. Today it reads as clean clay, evenly lit, as if the columns stood outdoors on wet paving. You're standing in the shade under a stone deck. It should be a dim corridor with bright openings. All of this happens only in this view, through `paintView`, so view 1 can't change.

- **Value structure first.** Columns and ceiling sit in shadow, in the cool violet-grey shadow of `c2` and clearly darker than the sunlit bridge in views 1 and 2. The bright things are the openings: the sunlit bank at the far end and the sky and water in the gaps. A viewer should see the light at the end of the corridor before anything else. Keep it painted and readable, not near-black. The gate's near-black limit still applies.
- **Columns.** Faces toward the sides catch a warm edge of daylight, and faces toward the corridor stay in shadow. Near the water they pick up warm bounce. Today's joints wander like cartoon lines and the faces are big smooth cushions, most obviously on the near columns at both edges. Make the joints straighter, thinner and broken in places, with stone grain and small chips in the faces, so the near columns hold up at 1080p. Use the existing `paintedStone` recipe at a finer scale if you can. The dark ring at each column's base is too hard: soften it into a damp line.
- **Ceiling.** It's a flat tan today, and the ripple can't be seen. Make it dimmer, with warm light rising from the water, and a slow ripple you can see from where you stand, stronger toward the far end and the openings. Slow movement only, with no flicker.
- **Water.** It's a grey-olive field of streaks, and the columns have no reflections, so they don't stand in water. Raise the mirror strength in this view until each column has a dark reflection broken by the marks, and let the far end's light run down the centre as a warm path. The stream of marks is right as it is: keep it horizontal across the view.

## Views 4 and 5: give the river a far bank

Beyond the bridge's end, the water runs to a flat horizon with what look like waves, and view 5 reads as a seaside. Add one view-only piece of dressing, visible in both views 4 and 5:

- A far bank across the river, running roughly along z near x = 65: a low stone wall, a line of willows of varied height, and a few existing `hall()` roofs behind them, fading into the same warm haze as the distance in view 1. Aim for a calm, low silhouette that covers the flat horizon. Use existing helpers. Nothing new should need modelling.
- Its reflection has to show, because the water under it would look wrong without it. Add it to the reflection scene for those two views.
- The wave-like cloud shapes in view 5's water should calm down once the bank is there. If they don't, reduce the mirror's sky contrast for this view only.
- The lone strand of willow in view 5's top-right corner looks stuck on. Either remove it in this view or hang enough around it to read as a framing branch.
- `userData.paintView` takes a single index today. Let dressing list several views.

Keep to about 2 extra calls in each of these views, and the existing limits of 50 calls and 1.6 M triangles.

## The page: don't encode a PNG to fade

`changeView` calls `canvas.toDataURL('image/png')`, which blocks the main thread on every change of view, and more so at high resolution. Make `#scroll-fade` a `<canvas>`, and copy the last frame with `drawImage` at no more than 1280 px wide. Behaviour stays the same.

## Keep

`node test/gates/views.mjs` is the gate. Also run `test/gates/perf.mjs`, `shimmer.py` on view 6, `colour.py` on view 1, the specs and `test/gates/scroll.mjs`. View 1 and 宣德楼 must still match `out/V0/`.

## Report

The usual format. Attach `out/V1b/view6.png` and `out/V1b/view5.png`, rendered by `node test/gates/views.mjs out/V1b`. Compare view 6 with `refs/style/c2.png` and say honestly whether it looks like the same hand.
