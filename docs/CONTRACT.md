# Engineering contract

Zero-build ES modules with three.js r186 (import map in `index.html`). The engine and render harness are
ported from the sibling project athenaion (MIT):
`/home/ubuntu/jo-dc/PROJECTS/experiments/athenaion`. Read it freely and never modify it. Port what's useful.
Its Greek content (temples, statues, cypress, waterfalls) stays behind, and so does its reliance on fixed
cameras.

## What's different from athenaion

Athenaion is a film set: 9 fixed cameras, with terrain LOD and foreground dressing fitted to them. This is
a place. Any building must hold up from any angle, at any distance, including from 2 m away. That rules out
shot-only objects and any logic that depends on the active shot.

The look comes from two modes of one world, not two worlds:

- **explore**: moving camera, 1 sample per frame, budgets below.
- **settle**: when the camera stops, frames accumulate (jitter AA, soft shadows) and converge on the
  offline-quality image. Athenaion's `renderInteractive` already does this. Keep it.
- **still**: `tools/render.mjs` at `--quality high`, for validation and final images.

## Layout

```
index.html, src/main.js
src/core/      engine, atmosphere, sky, lighting, pipeline, materials. No world content.
src/world/     plan.js (every coordinate), shots.js (validation cameras only), looks.js, index.js (MODULE_ORDER)
src/yingzao/   rules.js (pure maths, no three.js or DOM), then the geometry generators
src/materials/ shared material families
src/modules/   <name>.js, each exporting build(engine) and test(engine)
tools/         render, session, snap, crop, sample, colorstats, serve
test/          lead-owned gate tests (node --test)
docs/          lead-owned
refs/          historical/ (lead-owned), generated/ (targets)
```

## Coordinates

Metres. +X east, -Z north, +Y up. Origin is the centre of 宣德楼's south face at ground level. 御街 runs
toward +Z. 1 宋尺 = 0.312 m (`CHI`). All positions come from `src/world/plan.js`, and every entry carries
`evidence: 'excavated' | 'text' | 'painting' | 'inferred'` plus a short `source`. A later evidence view will
colour the city by this field, so don't guess the tag.

## Module contract

```js
export async function build(engine) {}  // populate the full world from plan.js
export async function test(engine) { return { views: [{ pos, target, fov, sun? }] }; } // isolated scene
```

`src/world/index.js` runs modules in `MODULE_ORDER`. A throw is logged and the rest still builds.

Engine: `engine.scene`, `camera`, `renderer`, `quality` (`.density`, `.detail`),
`add(obj, {castShadow, receiveShadow})`, `onUpdate((t, dt) => {})`, `rng(label)`, `footprints`
(occupancy, also used for walk collision), `registry`.

Materials: use `proceduralMaterial()` with world-space GLSL hooks. Atmosphere and cascaded shadows are
injected by `engine.prepareScene()`. Don't set `scene.fog` or call CSM yourself. Lighting is linear HDR, and
tone mapping and grading happen in post, so don't pre-tone-map colours.

## Budgets

| | explore | still |
|---|---|---|
| Draw calls in any frame | ≤ 1500 | ≤ 3000 |
| Triangles in any frame | ≤ 6 M | ≤ 25 M |
| World build (JS, this machine, `preview`) | ≤ 30 s | ≤ 120 s |

Instance anything repeated. 铺作 sets, tiles at distance and 杈子 must not be one mesh each. Every building
generator produces LOD0 (full timber), LOD1 (merged, no individual brackets) and LOD2 (silhouette). Bake
heavy geometry with `loadOrBuild(name, fn)` when it helps.

This machine renders WebGL in software (llvmpipe on 64 cores), so frame rate here says nothing about real
GPUs. Enforce the budgets by counting draw calls and triangles.

## Commands

```bash
node tools/render.mjs --test <module> --view <n> --out out/<you>/<name>.png
node tools/render.mjs --shot <id> --quality preview
node tools/session.mjs --port <p> &    # persistent session, then:
node tools/snap.mjs --port <p> --shot 3 --out out/<you>/x.png
node --test test/
```

Prefer `preview` and low resolution while iterating, since software rendering is slow. Write renders under
`out/`, never elsewhere.

## Gates (run by the lead, in order)

1. **Tests:** `node --test test/` passes and `test/` is unchanged.
2. **Clean build:** the lead re-runs the render itself. No page errors, no shader errors.
3. **Budgets:** counts within the table above.
4. **Rules:** no `Math.random`, `Date`, `onShot` or `shots.js` import in world code; no external assets.
5. **Visual:** the lead looks at the renders against `refs/` and the Song-not-Qing table in the art bible.
6. **Review:** the lead reads the diff.

Failing any gate sends the work back with specifics.
