# T0: Bootstrap the engine and explore mode

Port the engine and tooling from `/lambda/nfs/jo-dc/PROJECTS/experiments/athenaion` (read-only, MIT) and get
it rendering an empty flat world on this machine. No Chinese buildings yet.

## Port

- `index.html`, `src/main.js`. `package.json` and the lockfile are already in place and `node_modules` is
  installed (`three` r186, `puppeteer-core`, `pngjs`). Don't run `npm`.
- `src/core/*`
- `tools/`: `serve`, `render`, `session`, `snap`, `crop`, `sample`, `colorstats`, `satstats`, `bake`. Skip the
  video tools.
- Copy athenaion's `LICENSE` to `THIRD_PARTY_NOTICES.md` with a line saying what was ported.

## Change

1. **Linux and software GL.** `render.mjs` and `session.mjs` hardcode Windows Chrome and `--use-angle=d3d11`.
   - Find the browser via `$CHROME`, else
     `~/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux-arm64/chrome-headless-shell`.
     It's the only browser your sandbox can see. Full Chrome crashes in the sandbox, because its process-singleton
     lock needs `socket(AF_UNIX)`, which is blocked.
   - Launch puppeteer with `headless: 'shell'`, `pipe: true` and
     `--no-sandbox --disable-dev-shm-usage --no-proxy-server --use-angle=vulkan --enable-features=Vulkan --ignore-gpu-blocklist`.
     I've tested this inside your sandbox: it gives WebGL2 on llvmpipe, loading a page from a server on 127.0.0.1.
     `out/probe/harness.mjs` is the working minimal example. Keep `$ANGLE` as an override.
   - Default `GPU_SLOTS` to 2.
   - If `ffmpeg` isn't visible in the sandbox, skip the compare image and report it.
2. **Remove the world.** `core/engine.js` imports `world/layout.js` and `world/looks.js`. Replace them with
   a new `src/world/plan.js` (exports `SUN` default az 120, el 25, and `dirFromAzEl`), `src/world/looks.js`
   (empty), `src/world/shots.js`, and `src/world/index.js` with `MODULE_ORDER = ['ground']`.
3. **Remove camera-dependent content hooks.** Delete `engine.onShot` and `shotHooks`. Keep `applyShot`, which
   only sets camera, sun, grade, atmosphere. Drop `window.__profile` if it depends on removed things. Keep
   `engine.slots` only if still used; otherwise remove it.
4. **`src/modules/ground.js`:**
   - `build`: a flat plain, ±0.5 m of low-frequency relief, warm silt and grass colour, extending ≥ 20 km to
     a hazy horizon with no visible edge.
   - Add one 20 × 20 × 10 m plain box at (0, 0, -40), registered in `engine.footprints`, for lighting and
     collision checks.
   - `test`: returns two views, one at eye height looking at the box and one aerial at 150 m.
5. **Shots:** two validation shots in `shots.js`: `id: 1` eye-level south of the box, `id: 2` aerial.
6. **Explore controller,** new `src/core/explore.js`, replacing orbit controls in interactive mode:
   - Pointer-lock mouse look, WASD, E/Q up/down in fly mode, Shift for 5×, `F` toggles fly and walk.
   - Walk: eye at 1.6 m above ground height, collision against `engine.footprints` with a 0.3 m radius, sliding
     along obstacles.
   - Default speed 4 m/s walk, 40 m/s fly. Start in walk mode.
   - Accumulate when still, as `renderInteractive` does. Any movement restarts it.
   - Expose `window.__explore = { step(dtSeconds, keys), position(), mode(), setMode() }` so it can be driven
     headlessly. `keys` is a set of key names, and dt is passed in rather than read from a clock.
   - Keep the HUD, listing position, mode, samples, draw calls and triangles.
7. **`tools/check-explore.mjs`:** launches the page headlessly and uses `__explore` to assert:
   walking north moves the camera; walking into the box stops at its face plus radius and never enters; eye height
   stays within 0.01 m of ground + 1.6 in walk mode; sliding along the wall works; fly mode leaves the ground.
   Exit non-zero on failure.

## Acceptance (I'll re-run all of this myself)

- `node tools/render.mjs --test ground --view 0 --out out/t0/test0.png` exits 0 with no page errors, no shader
  errors and no missing-import errors. `--view 1` too.
- `node tools/render.mjs --shot 1 --quality high --spp 4 --out out/t0/shot1.png` works. Report seconds per
  sample at 1672×941 for `preview` and `high`, since that decides how we iterate.
- Rendering the same shot twice gives identical pixels. Compare decoded pixels and report the result, including if
  llvmpipe proves non-deterministic.
- `node tools/check-explore.mjs` passes.
- These greps return nothing, apart from `THIRD_PARTY_NOTICES.md`:
  - `grep -rniE "athen|acropolis|colossus|parthenon|\bowls?\b|greek|cypress|olive" src tools index.html`
  - `grep -rnE "onShot|shotHooks" src`
  - `grep -rnE "Math\.random|Date\.now|new Date" src`
- Ground and sky look like a plausible hazy morning plain. No black sky, no visible ground edge, no banding.

## Out of scope

Buildings, vegetation, water, `src/yingzao/`. `test/yingzao.spec.mjs` will fail until T1, which is expected,
so don't create `rules.js`.

If the sandbox stops you launching Chromium or binding a local port, report exactly what failed. Don't look for a
way around the sandbox.
