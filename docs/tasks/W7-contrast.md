# Last pass: contrast

Colour and brightness by region are now close, but high-quality stills are washed out: low contrast, no deep darks, no bright highlights, and shadows tinted blue (see shot 7's floor and shot 6's stone). That's the remaining gap to `ref1`-`ref9` and athenaion's look. Region colour isn't the right metric. Use luminance percentiles, as athenaion did.

Targets (sRGB luminance, `node tools/colorstats.mjs`, consistent across athenaion's references): **p02 3-17, p10 23-39, p50 93-115, p90 196-203, p98 227-242.** Measure the refs too and aim at them.

1. Add contrast through the tone curve and light balance: deeper darks, brighter highlights, with midtones near the target. Direct sun stronger against sky fill.
2. **Shadows are too blue and too light.** Reduce sky fill and its saturation so shade reads neutral-cool and properly dark, particularly floors under eaves. Stone in shade must not look blue.
3. **Contact darkening:** recesses under eaves, wall bases and column bases need to go properly dark at high quality and in `preview`.
4. `preview` (what people see moving) and `high` (what they see when stopped) must look like the same image with more refinement. Right now `high` looks flatter than `preview`. Find out why (AO, environment map, accumulation or bloom) and fix it.

Report the percentile table for shots 1, 3, 5, 7, 8 before and after, in both qualities. Up to 6 rounds. Determinism and the moved-camera gate hold. Don't change albedos or geometry.
