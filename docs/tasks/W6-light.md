# Final light pass

Your last round hit the saturation targets but overshot. The world is now cold and flat, and the golden morning is gone. The lead's targets only covered saturation, which was the wrong emphasis, so this is a correction, and not a failure on your part. The answer lies between your last two rounds.

Target, from the same regions and method, now brightness and warmth as well. Get `morning` as close as you can:

| Region | Reference | Now |
|---|---|---|
| Shot 1 lit ground (.40-.70, .88-.98) | 149,124,111 | 129,114,98 |
| Shot 1 lit wall (.30-.42, .60-.68) | 149,103,81, clearly warm | measure it |
| Shot 7 corridor floor (.35-.60, .85-.97) | 168,155,149 | 72,65,71 (far too dark) |
| Shot 6 stone (.45-.65, .60-.75) | 100,86,74 | 77,76,80 (too cold) |
| Shot 3 roof (.40-.60, .70-.78) | 94,93,77 | 79,78,69 |
| Shot 1 zenith | 163,179,209 | 160,180,206 (good, keep it) |

1. Bring back a warm direct sun, so lit surfaces are clearly warmer than shadow, and raise exposure and midtones so nothing reads underexposed. Open shadows are cool, not black. Shot 1's wall should glow as in `ref1`.
2. Shot 7's corridor must feel flooded with morning light, as in `ref7`. Check whether the sun reaches in, and whether AO or the roof is crushing it.
3. Stop when each region is within about 15% per channel, or when going further hurts another shot. Judge by eye too: the whole set should look like one warm, golden morning.

Don't change albedos or geometry. Determinism and the moved-camera gate hold. Keep it short: up to 5 rounds, and report the table.
