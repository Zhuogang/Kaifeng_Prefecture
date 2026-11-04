# T3b: Make the trees and cranes look real

You own `src/flora/`, `src/modules/flora.js`, `src/modules/cranes.js`. The first pass (`node tools/render.mjs --test flora --view N`) is
technically clean but looks like a game asset. Bar: `refs/generated/ref2.png`, `ref5.png`, `ref7.png`, `ref3.png`, and the Song scroll's
willows in `refs/historical/qingming_gate.jpg`. Athenaion's foliage is the quality target:
`/lambda/nfs/jo-dc/PROJECTS/experiments/athenaion/media/overview.jpg`, with code in its `src/vegetation/` and `src/materials/foliage.js`.

## What the lead found wrong

1. **Willow** is sparse sticks with big leaves. It must be a full, soft crown with **dense curtains of hundreds of long thin whips** hanging
   nearly straight down, with tiny narrow leaves that merge into a haze at any distance past 10 m (`ref5`). Alpha-card strips are the way
   to do this cheaply. Keep the gnarled pollard trunk, but its bark reads like a cartoon: make it less contrasty and less regular.
2. **Blossom trees** are bare Y-shaped sticks with tufts. They need 4-5 orders of fine branching and a **dense cloud of tiny flowers** covering
   the crown, with sparse fresh leaf, and only glimpses of dark branch through it (`ref2`, `ref7`). A row at 150 m must read as soft pink and white
   clouds on dark stems, not dots.
3. **Palace trees** are lollipops with sparse dots. Real tree crowns are clumped masses with dark gaps, self-shadowed and translucent at the edges.
4. **Cranes** are flat paper cut-outs. They need body volume, a long neck held straight in flight, broad long wings about 2.4 m across with layered
   feathers, black trailing feathers, legs trailing, red crown patch, and shading that shows form (`ref3`, `ruihe_bright.jpg`).
5. **Foliage shading** is flat. Add leaf translucency toward the sun, crown ambient occlusion, per-clump tone variation, and no pure saturated greens.
6. **Lotus** is the closest: lower the saturation, add subtle radial veins and an upturned rim, with soft contact shadow on the water.

## How to work

Compare each view with its reference side by side, name the biggest difference, fix it, repeat, biggest first. At least 6 rounds. Keep the earlier API
and the budgets from `docs/tasks/T3-flora.md`.

## Acceptance

Beside `ref2`, `ref5` and `ref7`, a stranger should accept these as the same kind of tree at comparable quality. Report the budgets and be blunt about what
still falls short.
