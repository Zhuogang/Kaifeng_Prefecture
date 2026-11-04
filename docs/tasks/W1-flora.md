# Whole-world round 1: flora (T3c)

You own `src/flora/`, `src/modules/flora.js`, `src/modules/cranes.js`. Three things:

1. **Place them in the world.** Nobody has. Add `flora` to `MODULE_ORDER` so `build(engine)` plants: willows along both 汴河 banks from the `WILLOWS` entry in `plan.js`, including ones framing the bridge per `ref5`, on the near bank; trees in the city's and palace's courts where those modules already expose them, or read their `plan.js` entries; and add cranes around 宣德楼's main roof with the perches on its 鸱尾 anchors (`engine.registry` or `plan.js`, as `src/modules/xuande.js` exposes them). Cranes must appear in shot 3 at `ref3`'s scale: much larger in frame than now, with
   the flock closer and lower over the roof.
2. **Willow crowns** read as hard-edged leaf panels up close. Use separate whips of varied length, with gaps, tapering to fine ends, and irregular crown outlines.
3. **Cranes** are still flat. Give bodies volume, and wings with layered feathers and shading, per `ref3`. Check at 15 m.

Budgets per `docs/tasks/T3-flora.md`. At least 4 compare rounds against `ref3` and `ref5`.
