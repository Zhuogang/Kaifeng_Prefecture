# T9: Run well in a visitor's browser

Make this a static site that loads fast and runs on a Radeon 780M-class laptop at ~30 fps at 1080p. You can't measure real GPU frame rate here, so build the machinery and report counts. The lead has no way to test on a real GPU yet.

You own `src/core/loader.js`, `src/core/tiers.js`, `tools/build.mjs`, `index.html`, and may edit `src/main.js`. Other agents are changing world modules at the same time: don't edit them. Report what they need to do instead.

## Build

- **`node tools/build.mjs`** outputs `dist/`, a self-contained static site with three.js vendored (no `/node_modules` paths), `/`-relative imports fixed so it works from any sub-path, and any baked data. Add `dist/` to what's ignored by writing a note for the lead: you can't edit `.gitignore`. `node tools/serve.mjs` must be able to serve `dist/`.
- **Loading:** a clean, designed loading screen in keeping with the subject, with real progress and module names, no bare spinner. Build in slices that yield to the browser so the page never looks frozen. Report load time.
- **Baking:** look at which world modules are slowest (`[world] … built in` logs) and bake heavy geometry with `loadOrBuild` where it helps, so first view is fast. Report before and after. Target: interactive within 15 s on this machine's JS.
- **Quality tiers:** `src/core/tiers.js` with `low`, `medium`, `high`, chosen automatically from measured frame time over the first seconds and adjusted while running, with hysteresis, and overridable with `?tier=` and a key. Each tier sets resolution scale, shadow distance and cascades, AO, cloud steps, and LOD distances. On `low`, target under 1.5 M triangles and under 200 draw calls in frame.
- **Frustum and distance culling per module root.** Report how many draw calls and triangles are actually in frame looking along the avenue, at the palace, and from the air, for each tier.
- **Failure:** if WebGL2 is missing or context is lost, show a clear message.
- **Controls hint** on first load: a small, dismissable line naming the keys, including T for time of day.

## Acceptance

`dist/` loads from a sub-path through `tools/serve.mjs` in headless Chromium with no errors, reaches interactive, and `__explore` still works. `test/gates/moved-camera.mjs` and all tests pass. Report numbers per tier, and which world modules exceed budget.
