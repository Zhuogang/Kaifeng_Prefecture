# S1: fix what P3 regressed, then build 宣德楼

Two parts, in order, in one run. You own `src/paint/`, `src/modules/paint_*.js`, `tools/paint/`. Write renders under
`out/S1/`. Budget for each scene: 1.2 M triangles, 40 draw calls, including any reflection pass. Both scenes must still
render when you finish.

## Part A: three P3 regressions on 州桥. At most 4 rounds

These live in shared code that 宣德楼 needs, so they come first.

1. **Trunk went flat clay-orange.** Region `trunk` measures saturation .68, p50 .25, p90 .35. c2 is .28, .33, .53. P2's
   trunk had better surface. In c2 bark is grey-brown with tan highlights, not orange. Give it deep dark crevices and
   lit ridges, in world space. Keep the burls, roots and the silhouette from P3. Keep it broken up, not combed.
2. **Bridge columns went saturated gold, and they fuse with their reflections.** `columns` p50 is .68 against c2's .52.
   - Column faces are warm stone at c2's value, not gold.
   - Reflections are clearly weaker than the objects, about 55 to 60% of their value, and mixed with jade. Bright
     reflected bars are why it reads as a golden comb.
   - Add a visible dark contact at each column's waterline so the eye can find the water's surface.
   - **The reflected edge of the bridge curves**, through about (.2, .687), (.5, .61), (.85, .58). A straight bridge in a
     planar mirror gives a straight line. Find out what bends it, and report the cause. Soften the near-black line under
     the coping.
3. **Mid-distance willows became rectangular green blocks** with flat cut bottoms. Make rounded, irregular domes with
   uneven strand lengths, lit tops, a darker underside and a short trunk just visible.
4. Paving saturation .32 against c2's .17. Bring it down. The post is too bright, and should sit near the paving's value.

Then re-run the regional table for `c2` and report it. Don't start other 州桥 work.

## Part B: 宣德楼, `src/modules/paint_xuande.js`, `?test=paint_xuande`

Target: `refs/style/c1.png`. Study it before you start. Views: 0 lays over c1, 1 to 8 move along a slow path up the
avenue, at least 3 m of travel, with a slight pan so the layers separate. Reuse the 州桥 toolkit. Parameterise it where
needed. Don't copy it. `?drift=1` as in 州桥. Use `assets/backdrops/bd2.jpg` for sky and far distance.

### Landmarks, in image fractions of c1

| Landmark | c1 position |
|---|---|
| Main hall roof | eaves x .285 to .765, ridge y .235, 鸱尾 tops y .18 at x .37 and .635, eave edge about y .30 to .33 |
| Main hall body | columns and balcony down to platform top y .46, with large brackets as the hall's main feature |
| Platform | top edge y .46, x .335 to .72. Battered sides: foot y .67, x .295 to .77 |
| Five doors | centres x .385, .46, .535, .61, .685. Each about .07 wide, y .565 to .67. Flat lintels, red leaves. **Not arched** |
| Side towers | left centre x .19, right centre x .83. Ridge y .31, eaves x .12 to .26 and x .745 to .912, base y .46 |
| Corridors and side walls | link the towers to the hall at y .42 to .47. Battered walls below, foot y .65 |
| Avenue | starts at the platform foot, widens to the bottom of the frame, about x .2 to beyond 1.0 |
| Left rail | near post at x .13, y .80 to 1.0. Runs in to about (.37, .67) |
| Right rail | from (1.0, .77) in to about (.65, .665) |
| Canal, left | x 0 to .33, y .70 to 1.0. Stone kerb, jade water reflecting the blossom |
| Hero tree | dark trunk enters at left around y .50, leans up and right, limbs reach about x .60 at y .05. Big pink blossom close to the camera |
| Blossom groves | left x 0 to .28, y .36 to .70, white at x .07, pink at x .18 and .25. Right x .77 to 1.0, y .50 to .70, pink and white mixed |
| Cranes | three, at about (.60, .11), (.74, .11), (.85, .22), in flight |
| Fallen petals | scattered near (.33, .93) and (.38, .96), and thin elsewhere |

Save `out/S1/overlay.png`, a 50% blend with c1, and use it every round.

### Details

- **Avoid the flat-wall trap.** The platform is the biggest surface in frame. It should have warm ochre plaster and
  masonry with vertical stains, patches, dark seepage below the top and a darker foot, all brushed in world space. c1's
  wall has quiet variation everywhere, and no regular courses.
- **Doors:** deep red with a dark frame, a thick timber lintel and a recessed reveal that casts shadow. Slight variation in
  the paint.
- **Hall:** use `src/yingzao/` for true Song proportions. Large 铺作 are the point. Dark timber shadow under the eaves, warm
  red-brown timber, with a green-grey roof with tile rows. 鸱尾 with 拒鹊子. No yellow roofs, no Qing forms.
- **Avenue:** pale stone slabs. The shadow pattern is the composition: large soft-edged violet-blue shade, peach sunlit
  patches, moving a little in wind, cast from off-screen trees. Use `dappleGLSL`, at a larger scale.
- **Rails:** dark red posts with square caps and heavy rails, with wear and shadow. The near post is a strong foreground
  element, so it needs real detail.
- **Blossom:** a new shared `blossom.js`. Near blossom is individual five-petal flowers in clusters, on dark twigs, with a
  few small leaves. Mid groves are masses of dabs with darker undersides and an irregular outline. They must not read as
  balls on sticks. Dark, gnarled trunks using the same bark as the willow.
- **Falling petals:** a few drift across frame, driven by `engine.time`. Lying petals are on the ground.
- **Cranes:** slow wing beats and a slow glide. Check `src/modules/cranes.js` for the shape, but paint them in this style.
- **Water:** the same reflection function, in the canal only. Keep the draw count in budget.

### Regional values, as a check

Measured from c1. Don't grade to hit them. A miss tells you where to look.

| Region (x0, y0, x1, y1) | L p10 | L p50 | L p90 | Sat | R-B |
|---|---|---|---|---|---|
| hero_tree (0, 0, .3, .3) | .27 | .59 | .81 | .29 | +.18 |
| roof (.33, .25, .70, .30) | .49 | .58 | .69 | .11 | +.06 |
| hall (.34, .34, .70, .45) | .30 | .38 | .58 | .45 | +.28 |
| wall (.33, .48, .73, .555) | .63 | .71 | .77 | .37 | +.33 |
| doors (.365, .575, .705, .665) | .39 | .51 | .79 | .52 | +.43 |
| side_tower (.13, .33, .25, .45) | .33 | .42 | .75 | .24 | +.13 |
| left_trees (0, .40, .28, .68) | .36 | .64 | .85 | .27 | +.20 |
| right_trees (.77, .52, 1, .68) | .52 | .73 | .86 | .29 | +.25 |
| avenue (.40, .72, .95, .98) | .42 | .47 | .75 | .19 | +.03 |
| canal (.02, .75, .15, .95) | .27 | .46 | .69 | .36 | +.19 |
| sky (.68, .03, .98, .28) | .69 | .80 | .88 | .20 | +.09 |
| rail (.13, .80, .27, .97) | .30 | .42 | .74 | .45 | +.30 |

## Done means

- At least 10 rounds on Part B, with what changed in each. Check motion: views 0, 1, 4, 8, and 10 consecutive clip frames.
- `out/S1/` holds compare and overlay for 宣德楼, compare for 州桥, and motion sheets for both.
- The tests pass. Both scenes render byte-identically twice. The sub-path check passes for both scenes and both backdrops.
- Report your honest view of what still falls short of c1, and rate each Part A fault as fixed, better or unchanged.
