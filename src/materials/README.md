# T2 procedural surfaces and ornament interfaces

All material factories accept `(engine, options = {})`. They return a standard/physical
three.js material built through `proceduralMaterial`. Colours are linear, lengths are
metres. Common options: `variation` (stable numeric seed), `wear` (0–1), `baseY` (world
height), `tint` (sRGB colour multiplier). No runtime assets or material texture lookups.

`engine.quality.detail < 1` uses three filtered value-noise octaves; high uses four.
One additional filtered noise call is used by timber, masonry, stone, paving, plaster
and paint. Tile and metal use only the base octaves. At a distance all families have at most
five noise evaluations even before octave filtering. At walking distance an additional
one (preview) or two (high) filtered evaluations supply pigment/aggregate grain; these
fade out completely at a world pixel footprint of 8 mm. `material.userData.shaderCost`
records these costs; engine environment, BRDF and shadow lookups are separate.

| File / factory | Additional options |
| --- | --- |
| tile.js / tileMaterial | variant: green, grey, jianbian; edgingWidth; ribbed (false for ornaments) |
| timber.js / timberMaterial | variant: vermilion, black; color; grainAxis (world direction); cavity vertex attribute |
| masonry.js / masonryMaterial | topY, batter (retreat/height), brickSize, limeWidth, courseHeight, coursePeriod |
| stone.js / stoneMaterial | waterline (world Y), polished (upward surface polish) |
| paving.js / pavingMaterial | variant: bluestone, brick; ruts, drains; layout (GLSL function definition below) |
| plaster.js / plasterMaterial | Common options |
| metal.js / metalMaterial | variant: gilt, iron |

Tile geometry supplies `tileCoord: vec4(column, row, edgeDistance, eaveDistance)`.
Column and row are continuous tile units; the last two values are metres. They
interpolate across a roof surface, including geometric cover-tile ribs. The explicit
`setTileCoordinates(geometry, mapping)` adapter can populate them. Missing attributes
have safe defaults, but cannot identify individual tiles or a jianbian field.

The paving layout is injected GLSL, for example:

```glsl
vec4 pavingLayout(vec3 p) {
  // course coordinates; signed distances to nearest rut and drain centres
  return vec4(p.x, p.z, abs(p.x)-0.72, abs(p.x)-4.5);
}
```

Return large distances to disable either line, or use `ruts: 0` / `drains: 0`.
Course spacing is 0.936 × 0.624 m bluestone (卷三 壓闌石 / 地面石), or inferred
0.36 × 0.18 m lane brick. The example rut/drain positions are inferred diagnostics;
T5 should provide its actual street layout. Repairs, block variation, grain and
recessed joints retain world scale under rotation. High frequencies fade by pixel
footprint; normal relief uses a wider filter than colour joints.

## Painted members

`paintMaterial(engine, {style: 'wucai'|'nianyu'|'danfen', ...common})` is in
`../yingzao/paint.js`. `paintHook(style)` exposes the underlying composable hook and
attribute declarations (its body requires shared.js surface globals/helpers).

Supply `memberUV` (normalized face coordinates), `memberSize` (face width/height in
metres), `memberType` (`MEMBER_TYPES`), and optionally `memberEdge` (distance to the
actual shaped edge in metres; -1 uses rectangular UV edges). Preserve attributes
when merging or instancing. For nonrectangular outlines, tessellate faces sufficiently
before baking edge distances; boundary-only triangles interpolate zero everywhere.
`setMemberAttributes` accepts face mapping and edge-distance callbacks.

The motifs reconstruct lotus/scroll and fourfold patterns from 卷十四, with softened
叠晕. They are inferred drawings, not exact facsimiles of historical painted members.
Danfen's white lower border is 1/8 member height, bounded by 0.5–1 寸 per the text.

## Ornaments

`../yingzao/ornament.js` exports:

- `chiwei`, `juquezi`, `chuishou`, `dunshou`, `wadang`, `dishui`: `{lod0,lod1}` geometries.
- `doorStuds(engine, options)`, `goulan(engine, options)`, `chazi(engine, options)`:
  `{lod0,lod1}` groups of instanced components. Caller chooses LOD and owns disposal.
- `roofOrnaments(engine, anchors, options)`: instanced groups for T1's chiwei and
  chuishou anchors. Accepts `{position:[x,y,z],rotation:yaw}`; numeric yaw follows
  T1's outward +Z convention. Explicit Euler arrays rotate native geometry directly.
- `ornamentTriangles(geometryOrGroup)`: actual triangles, including instance counts.

Native chiwei curves toward +X, front is +Z, base at y=0. Chiwei includes its fork.
`dunshou` returns one figure to instance in a modest row. Goulan/chazi accept paths
of `[x,y,z]` points and support sloping segments; posts are upright. Goulan defaults
to 卷三's 4 尺 height / maximum 7 尺 bay, with scaled member sections, relief panels,
cloud brackets and octagonal posts. Default lotus-bud caps are inferred from painting;
`lionFinials: true` selects sculpted lions, whose height is 1.5 尺 from the text.

The test yard is `src/modules/materials.js`: six required views plus a 500 m view
and a 5 cm offset of the 200 m view, all seven families,
variants, both ornament LODs, and three paint styles. It does not integrate these
materials into T1's hall or place objects into world districts. Hall generators must
supply the tile/member attributes before claiming full material integration.

## Reference comparison limits

`tools/colorstats.mjs` measurements from the saved T2 crops give these reference
contrast targets (sRGB luminance, 0–255): ref7 timber/context P10=22, P90=205;
ref6 stone relief P10=50, P90=149. The plain diagnostic coupons do not yet attain
those ranges: timber/context P10=40, P90=130, stone P10=95, P90=124. These crops
include different geometry and lighting, so they are visual contrast targets, not
an albedo calibration. The present surfaces and reliefs remain simpler and more
regular than the photoreal references; the lead's visual gate is still required.
