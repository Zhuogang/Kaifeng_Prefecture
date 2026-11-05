# P3: finish 州桥

P2's composition and structure are accepted. This is the last round on this scene, so don't restructure anything:
improve surfaces and fix the faults below. The toolkit goes on to 宣德楼 next, so prefer fixes in shared code.

You own `src/paint/`, `src/modules/paint_zhouqiao.js`, `tools/paint/`. Budget: 1.2 M triangles, 40 draw calls, including
the reflection pass. You've got about 550 k triangles spare, so spend them on foliage.

## Faults, worst first (lead's reading at full size)

1. **Pale band in the water.** Below the bridge there's a wide cream band with a hard curved edge that reads as a
   sandbar, between the bridge's reflection and the towers' reflections. In c2 the water under the bridge is deep jade
   with the columns' reflections as lit vertical marks. Find what's being mirrored, likely the far bank, the abutment
   or the deck, and fix that. Water is darkest under and just below the bridge, and no edge in it is hard.
2. **Mid-distance willows read as palm trees.** Bare dark pole, crown on top. c2's are full round masses, foliage
   reaching close to the ground, trunk mostly hidden and short. The two in front of the towers are the worst.
3. **Stair-stepped edges in the reflections.** At full size, reflected edges break into rectangular digital steps. They
   should look brushed: soft, tapered, smooth displacement. Raise the reflection's resolution if it helps.
4. **Trunk looks combed, and sprinkled with white flecks.** Parallel hair-like lines, and a base flaring like draped
   cloth. Break the parallels with knots, burls and ridges that affect the silhouette. Sunlight on bark is warm
   orange-ochre, never white. Keep the deep violet-brown in shade, and keep it the darkest mass in the frame.
5. **Boat is varnished.** Glossy orange bowl with streaks. It should be weathered timber: dark inside, grey-brown wear,
   visible hull strakes and ribs, thwarts with thickness, dappled light, and a little dark water contact below it.
6. **Tower masonry is flat cream panels**, the flattest thing in the frame. Warm tan with quiet courses, darkening
   toward the top where the eave shadow falls. The passage is dark at its centre, with a warm glow.
7. **Bridge is washed out.** Column faces are khaki-grey. Sunlit faces should be warm cream-gold with a darker shade face
   and very dark gaps and soffit. Same for the parapet. Near quay wall is pale too, and should sit darker in the tree's
   shade, with coursed blocks and moss at the waterline.
8. **Paving is cool grey, the coping too clean.** Move paving to warm grey-brown with peach dapples. Coping stones vary,
   with chipped edges and wear. Rope is hemp brown, matte, not yellow.
9. **Leaves are large paper cut-outs.** Near leaves about 40% smaller and more numerous, more size variation, with a
   darker, softer inner mass so clumps have volume. Budget is there for it.
10. **Roofs have noise but no tile rows.** Add quiet tile rows that fade out with distance.

## Motion

- Pan during the dolly so the trunk stays in frame to the end of the path. At present it nearly leaves by view 7.
- Add `tools/paint/clip.mjs`: renders consecutive frames along the path to `out/P3/clip/f0000.png`, with arguments for start
  fraction, end fraction, frame count and seconds. Frame timing comes from `engine.time`, so it's deterministic.
- Render 10 consecutive frames at 30 fps from the middle of the path, 1280×720. Look at consecutive pairs. Foliage and
  water may move, but they must not shimmer or sparkle. Report mean absolute difference per frame pair, and for the
  willow and water regions. If fine foliage shimmers, fix it (alpha-to-coverage, wider minimum screen width, or fading
  strands by screen size).

## Done means

- At least 8 rounds, with what changed in each.
- `out/P3/compare.png`, `motion.png`, and the 10 clip frames.
- The tests pass, renders are byte-identical twice, the sub-path check passes.
- Rate each of the 10 faults as fixed, better or unchanged. Say what's still wrong, honestly.
