# D2b: corrections to D2

I rendered view 0 at 1920×1080 and compared it with the targets. The halls are clearly better and the direction is right. These are the differences that still stand out. Look at `out/gate-D2/crops/c1-hall.jpg` and `c2-mid.jpg`, where the target is on top.

**Don't throw work away or restyle.** Don't smooth anything out to fix these. Each item below adds structure or value contrast.

## 宣德楼's main hall (and the side pavilions, in proportion)

1. **The bracket band is squashed.** Measured on the front elevation, the target's bracket zone is about as tall as the exposed column below it (about .95 of it). Yours is about .5. Lower the tie beams and shorten the exposed column, so the roof silhouette stays where it is, because it's registered to the target. Then let the sets grow into that height.
2. **Sets should stand apart.** They currently splay flat and overlap into a continuous frieze of planks. In the target, each column-head set is a tall stepped pyramid, about 60% of a bay wide at its top, three tiers widening upward on blocks, with a clear dark gap between tiers and between neighbouring sets. The between-column set is much smaller: about a third of the size, one block on an inverted V, sitting low. The big, small, big rhythm has to read at a glance.
3. **Columns must be round.** They read as flat square posts, some with a second flat post beside them. In the target they're round, with a soft lit side and a shaded side. Use real round geometry, with enough sides that the silhouette and shading read as round.
4. **The interior is too bright and too regular.** Replace the bright square grid across the main hall with deep shadow: mostly dark red-brown, with panelled doors and inner columns just visible. The grid is what makes it look mechanical. Galleries and tower windows can keep a quieter lattice.
5. **Ridges are too thin.** The main ridge should be a thick slab about 1.5 to 2 times what it is now, with a lit top and a shaded face. Hip ridges must clearly stand proud of the roof all the way from the main ridge to the corner, as dark raised bands, as in the target. Check that the end nubs are visible at 1080p.
6. **Tile rows read as even corduroy, too fine and too uniform.** On the main hall, go to about 60 rows, each wide enough to see. Increase the dark gutter contrast, and make the light vary more: long patches where several neighbouring rows go paler or darker together, and the odd broken run. **Choose the row count per roof from its on-screen size at view 0,** so each row is at least about 3 pixels wide at 1080p. On the 州桥 towers, rows are currently filtered away entirely and the roofs look smooth. There the target shows strong dark rows, about 30 to 45 across.

## 州桥's bridge: value structure first

This is the biggest remaining fault. The whole bridge, balustrade and quay are one cream tone with an even confetti speckle, so they read as a flat band.

7. **Replace the isotropic speckle on bridge stone** with block-by-block variation: each stone gets its own value and slight hue, with a soft wash inside it. Joints are dark and thin. The balustrade, deck, piers and right-hand quay all change this way. The confetti look on the balustrade is the worst of it.
8. **Give the stone real value range.** Lit front faces are warm cream, shaded side faces are clearly darker, the deck's underside is near dark brown, and a bright cornice line sits above a dark shadow line. Compare `c2-mid`: you can read the light direction on each pier from its two faces.
9. **Fix what you see through the gaps.** In the target, you see bright pale water and a low, light far bank through the gaps. Yours shows a dark blue-black mass, and dark brick at the left end. Find out what's behind the bridge and lighten or remove it. Only the shadow directly under the deck is dark.
10. **Piers need visible courses at 1080p:** 4 or 5 blocks with dark horizontal joints, uneven heights and a narrow shaded side. Today they read as flat pale rectangles.
11. **Deck:** two layers of beams with visible vertical joints between lengths, and a slight rise toward the middle if the geometry allows it.
12. **Balustrade:** posts with lit caps, panels with a darker recessed centre. It should read against the trees and water, not melt into them.

## Limits

The D2 limits still apply, with one change. Triangles are now near the limit (1.19 M), and a 3070 is mainly limited by fragment work, not by this triangle count. So triangles may go to **1.3 M** in this round, and `test/gates/perf.mjs` stays at or under 300 ms for 宣德楼 and 600 ms for 州桥, per-pixel under 80 ms. If a gate you can't edit enforces 1.2 M, stop at 1.2 M and say so.

Motion and shimmer limits still apply, and tile rows and block joints must not crawl along the path.

Render view 0 at 1920×1080, run `test/gates/crops.py`, and look before you report.
