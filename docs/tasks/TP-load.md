# TP: First-load time

Traced by the lead with `out/probe/load.mjs`, on an idle machine:

```
 0.7  [world] ground built in 29 ms
14.0  [world] bianhe built in 386 ms     <- 13 s unaccounted for before this
22.0  [main] world built
23.5  [main] shaders compiled in 403 ms
54.9  [main] interactive                 <- 31 s after shaders, was about 3 s before the last contrast pass
```

You own `src/core/loader.js`, `src/core/tiers.js`, `src/core/quality.js`, `src/main.js`, and for this task `src/water/carvings.js` and whichever single module holds the stall. Touch nothing else. Don't change how anything looks.

1. **The 13 s stall** happens before `bianhe.build` is timed, so probably during a module import (top-level work, maybe `src/water/carvings.js`). This is pure JavaScript, so real visitors pay for it on any GPU. Find it, then make it lazy, reuse results, or precompute: baking through `loadOrBuild` into `generated/` is fine, with `tools/build.mjs` copying the data into `dist/`. Target ≤ 2 s. The carving must look pixel-identical.
2. **The 31 s before interactive.** The cause is unknown. Interactive took about 26 s in total before the last contrast pass, but that pass's only `src/core` change was `aoStrength`, a uniform, so don't assume that's it. Check `src/world/looks.js` too, and profile the first frame directly. Find out why it's slow. Interactive should not wait on an expensive still: show the first frame at the explore settings and let refinement happen afterwards. Check that accumulation doesn't stall the browser while refining: each frame must yield.
3. **Keep the look.** Final stills at `--quality high --spp 12` must stay visually the same as `media/`, and determinism must hold.
4. Loading UI progress should stay honest through any remaining slow step.

## Acceptance

`node test/gates/dist.mjs` reports interactive in ≤ 25 s on this machine, ideally far less. All tests, `test/gates/moved-camera.mjs` and `test/gates/reachability.mjs` pass. Report the same trace after your change, and the frame times while moving and while refining, in `preview`.
