# T11: Evidence view

Most of this city is inferred, and visitors should be able to see how much. Press `V` to tint the world by what we actually know, from the `evidence` tags in `src/world/plan.js`: `excavated`, `text`, `painting`, `inferred`.

You own `src/core/evidence.js`, and you may edit `src/main.js` and `index.html` for the key and legend, and add `userData.evidence` tagging in world modules with minimal one-line edits only. Other agents are working in those modules at the same time, so re-read right before each edit, and touch nothing else in them.

- Colour by module and major object with a clear legend, in the page's existing loading-screen style. Tag these from `plan.js` and `docs/ART_BIBLE.md`: 州桥 span, deck and carved walls `excavated`; 铁塔 `excavated` (it still stands); 宣德楼 five doors and 朵楼 `text`, its 鸱尾 and roof `painting`; 御街 width and order `text`; city blocks and palace layout `inferred`.
- Clicking or pressing `V` again restores the normal view with no leftover state. Rendering with evidence off must stay pixel-identical (`test/gates/moved-camera.mjs` passes, plus rendering twice).
- Selecting a tagged thing shows its one-line source from `plan.js`, such as "约阔二百余步 《东京梦华录》卷二", in the legend when the camera looks at it near the screen centre. Keep this cheap, and don't raycast every frame at high cost.

Report renders of the avenue and the 州桥 with the view on. Costs no draw calls when off.
