# TL: Light, sky and grade for the whole world

Right now every render looks like a clean CG viewport at noon, whatever is in it. Compare any `out/gate-T6/*.png` with `refs/generated/ref1.png`, or with
athenaion's real renders in `/lambda/nfs/jo-dc/PROJECTS/experiments/athenaion/media/overview.jpg`. Athenaion used this same engine, so the gap is mostly settings and tuning, and it's
closable. Read its `src/world/looks.js`, `src/core/` defaults and `docs/ART_BIBLE.md` exposure targets. Note that T0 changed some sky and atmosphere values, so compare them.

You own `src/core/sky.js`, `atmosphere.js`, `lighting.js`, `pipeline.js`, `quality.js` and `src/world/looks.js`, and the `SUN` entry in `plan.js`. Other agents are working at the same time on geometry and
materials, so touch nothing else and don't change material albedos. Judge against whatever geometry exists; it's improving as you work.

## What's wrong

1. **Sun too high and neutral.** Golden morning: warm, low and raking, per `ref1`. Lit surfaces glow, shadows are long and cool blue-grey, and never black or empty.
2. **Sky.** The streaky, combed cirrus is the single most artificial thing on screen. Use soft, believable clouds as in athenaion and `ref1`, warm near the horizon. On a flat plain the sky is half of every wide view.
3. **No contact shadow.** Recesses, under-eave zones and wall bases need deep ambient occlusion. Everything currently floats. It needs to work in explore mode on an integrated GPU, not only in offline stills.
4. **Flat exposure.** Reference images have deep darks and bright highlights. Set the tone curve and grade from `node tools/colorstats.mjs` against the refs. Rich but natural, per the art bible.
5. **Aerial perspective:** a kilometre of hazy warm depth should be visible down the avenue and over the city. It's missing at street level.

## Times of day

Add world-wide time presets in `looks.js`: `morning` (default, `ref1`-`ref4`, `ref7`, `ref8`), `sunset` (`ref5`, `ref6`) and `bluehour` (`ref9`), each setting sun, sky, atmosphere and grade. A validation shot may name a preset, as in `time: 'sunset'`, which
`applyShot` applies, because this is world state like a clock, not camera-specific dressing. Add `?time=` and a `T` key in `src/main.js` to cycle them while exploring (you may edit `main.js` for this). Bake nothing into albedo, and refresh the environment map on change.

## Budget

The target is about 30 fps at 1080p on a Radeon 780M. Report what each pass costs in `preview` relative to before (sample time here on llvmpipe is a rough proxy), and which features are explore-only or settle-only. When the camera stops, accumulation may add soft shadows and higher-quality AO. Don't add anything that
requires multiple full-screen passes at full resolution while moving.

## Acceptance

Shots 1, 3, 5, 6 (`node tools/render.mjs --shot N`) should look like photographs in the reference's light, even where the geometry is still crude. Compare with colour stats and your eye, at least 8 rounds. Determinism must still hold: `test/gates/moved-camera.mjs` passes, and rendering twice gives identical pixels. Report settings changed and honest gaps.
