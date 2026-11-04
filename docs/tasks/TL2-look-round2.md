# TL2: Look, round two

The lead compared shots 1, 3 and 5 with `ref1`, `ref3` and `ref5`. Determinism and cost are good. The look isn't accepted yet. Fix, biggest first:

1. **Sunlight has no warmth or punch.** In `ref1` the sun rakes across the masonry, which glows warm gold-brown, and every brick and eave throws a crisp shadow. In our shot 1 the same wall is flat cool grey. Make direct sun much warmer and stronger relative to sky fill, so lit
   surfaces are warm and shadows clearly cooler and darker. Check that the sun really reaches the south facade at this time of day, and move it if the 阙 shadow fills too much of the forecourt. The contrast between lit and shadowed brick is the goal.
2. **Clouds are popcorn:** blobby, hard-edged, low-resolution puffs scattered across the whole sky. `ref1` has thin high wisps and a clean gradient. `ref3` and `ref5` have soft warm cumulus low near the horizon, with open sky above. Athenaion's skies in
   `/lambda/nfs/jo-dc/PROJECTS/experiments/athenaion/media/overview.jpg` come from this same code, so start from its original settings and work from there. Far fewer clouds overhead, soft eroded edges, and warm-lit undersides toward the sun.
3. **Sky colour** is too dark and neutral. It should lift to a warm pale peach near the horizon and a clean, lighter blue above (`ref1`). The horizon must not be a hard line against the ground.
4. **Overall exposure and contrast:** match the refs' percentiles with `tools/colorstats.mjs`. Our midtones are grey and low-contrast, while the refs are rich and warm.

Keep the time presets, AO and budgets as they are. Don't change materials or geometry. At least 6 rounds, then report before and after on shots 1, 3 and 5.
