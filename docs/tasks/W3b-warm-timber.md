# W3b: warm timber, and a sunlit boat

W3 is accepted in structure: tile rows, separated bracket layers and coursed walls are what the towers needed. **Keep them, and keep everything else accepted so far.** This round corrects overshoot. Four small things only, 州桥 only.

## 1. Timber is too dark and goes near-black

Measured on the saturated reddish pixels of the towers:

| | p25 | Median | p75 | Hue |
|---|---|---|---|---|
| `c2` | 187 116 89 | 224 136 96 | 241 147 105 | 19° |
| Ours, view 1 | 57 38 25 | 150 95 62 | 194 118 79 | 22° |

So the hue is right, and the value is far too low. In `c2` even shaded timber glows warm: the eave shadow is a warm red-brown, not a dark brown. Only the narrow gaps are dark.

- Lift lit and shaded timber toward those numbers. Shaded timber keeps its warmth and sits around p25.
- Dark gaps stay dark, because they're what gives depth, but they're small and warm: about 70 45 40, not black. `look.py` p1 for view 4 is .06 and should be above about .10.
- Same for window interiors and the deep doorway: dark warm umber, not a black hole, and you should still sense lattice and depth. Keep the gaps from filling in: W3's separation must survive.
- A slightly redder cast, of about 2° to 3°, is fine.

## 2. Near timber is flat

In view 4, where the tower fills the frame, beams, columns and bracket faces are clean flat orange with hard edges, like cut card. At that distance they should carry fine, low-contrast wood marks along each member, a small value difference from member to member, worn lighter edges and some darker staining. These should fade with distance, so views 1, 2 and 7 keep the readability W3 won.

## 3. Boat

It went too dark and lost its sun pools. Measured: `c2` shade 67 59 46, ours 62 46 32, and the lit side in `c2` is warm and bright, about 185 150 110. Bring back clear pools of warm sun on the seats, gunwale and hull side, and honey-brown mid-tones, about halfway between W2b and W3. Keep W3's quieter scratches and plank lines.

## 4. Mid-distance willows: volume

The colour is right now, but the strands are so even that they read as hay or grass. Group them: 3 to 5 large clumps per tree, each lit at its top and sunny side and darker at its lower, shaded side, with deep olive in the gaps between clumps. Keep them airy at the edges and don't change the overall yellow.

## Keep

`node test/gates/views.mjs out/W3b`, `perf.mjs` at most 480 ms on 州桥, `shimmer.py` under .05% on views 1, 2, 4 and 7, the specs, and `scroll.mjs` after `build.mjs`.

## Report

The usual format, with the same timber measurement, in `out/W3b/`. Attach 1080p crops of the tower in views 2 and 4, the boat in view 1 and a mid willow.
