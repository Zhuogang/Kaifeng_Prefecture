import * as THREE from 'three';
import { YUJIE as P, YUJIE_VIEWS } from '../world/plan.js';
import { pavingMaterial } from '../materials/paving.js';
import { proceduralMaterial } from '../core/materials.js';
import { GeometryBatch } from '../yingzao/geometry.js';
import { buildCorridors, buildFences } from '../yujie/architecture.js';
import { buildCanals } from '../yujie/canals.js';
import { buildPlanting } from '../yujie/planting.js';
import { addPavingRelief } from '../yujie/paving-relief.js';
import { rowReaches, plazaEnd, onXuandeStructure, surfaceY, halfWidth, northEnd, southEnd, northShoulder, southShoulder, pavingLayoutGLSL } from '../yujie/layout.js';

function apron(batch, x0, x1, z0, z1, endX0 = x0, endX1 = x1) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    x0, surfaceY(z0), z0, x1, surfaceY(z0), z0, endX0, surfaceY(z1), z1, endX1, surfaceY(z1), z1,
  ], 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
  geometry.setIndex([0, 2, 1, 1, 2, 3]); geometry.computeVertexNormals(); batch.add(geometry); geometry.dispose();
}

function buildPaving(engine) {
  const road = new GeometryBatch(), lanes = new GeometryBatch(), banks = new GeometryBatch(), drains = new GeometryBatch();
  apron(road, -P.width / 2, P.width / 2, P.start, plazaEnd);
  for (const [start, end] of rowReaches) {
    apron(road, -P.section.road, P.section.road, start, end);
    for (const sign of [-1, 1]) {
      const ordered = (a, b) => [Math.min(sign * a, sign * b), Math.max(sign * a, sign * b)];
      apron(lanes, ...ordered(P.section.bank, P.section.edge), start, end);
      apron(banks, ...ordered(P.section.canal, P.section.bank), start, end);
      // inferred: shallow covered roadside gutters, with periodic dressed-stone covers.
      drains.box([sign * (P.section.bank + P.paving.laneDrainOffset), P.surfaceY + 0.009, (start + end) / 2], [0.32, 0.018, end - start]);
    }
  }
  for (const [z0, z1, w0, w1] of [[northShoulder, northEnd, P.width / 2, P.bridgeHalfWidth],
    [southEnd, southShoulder, P.bridgeHalfWidth, P.width / 2]]) {
    apron(road, -w0, w0, z0, z1, -w1, w1);
  }
  engine.add(road.mesh(pavingMaterial(engine, { layout: pavingLayoutGLSL(), ruts: 1, drains: 1, repairs: 1 }), 'yujie:coursed-imperial-road'), { castShadow: false });
  engine.add(lanes.mesh(pavingMaterial(engine, { variant: 'brick', layout: pavingLayoutGLSL(true), repairs: 1 }), 'yujie:brick-lanes'), { castShadow: false });
  engine.add(banks.mesh(proceduralMaterial({ name: 'yujie:orchard-soil', params: { roughness: 0.95 },
    // inferred: compacted pale silt with sparse grass, never a continuous lawn.
    color: `float s=cgVnoise2(cgP.xz*2.0); float soilPatch=cgVnoise2(cgP.xz*.37);
      diffuseColor.rgb=mix(vec3(.14,.115,.075),vec3(.09,.115,.045),smoothstep(.57,.78,soilPatch))*(.86+.28*s);`,
  }), 'yujie:planted-banks'), { castShadow: false });
  engine.add(drains.mesh(pavingMaterial(engine, { ruts: 0, drains: 0, tint: 0x757b7b }), 'yujie:covered-drains'), { castShadow: false });
}

export async function build(engine) {
  const previousGround = engine.groundHeight?.bind(engine) ?? (() => 0);
  buildPaving(engine);
  const corridors = buildCorridors(engine), fences = buildFences(engine), canals = buildCanals(engine);
  engine.groundHeight = (x, z) => {
    // Preserve the actual T6 bridge and river/quay surface through the crossing.
    if (z > northEnd && z < southEnd) return previousGround(x, z);
    if (z >= P.start && z <= P.end && Math.abs(x) <= halfWidth(z)) {
      if (corridors.modules.some(m => Math.abs(x - m.x) < 2.3 && z >= m.start && z <= m.end)) return corridors.floorY;
      if (onXuandeStructure(x, z)) return previousGround(x, z);
      // The avenue is a level constructed surface, independent of the silt relief below.
      return surfaceY(z);
    }
    return previousGround(x, z);
  };
  const planting = buildPlanting(engine);
  engine.registry.yujie = { corridors, fences, canals, planting, width: P.width };
  engine.registry.yujie.pavingRelief = addPavingRelief(engine);
  console.log('[yujie] ' + JSON.stringify({ width: P.width, corridors: corridors.modules.length, trees: planting.trees, lotus: planting.lotus }));
}

export async function test(engine) {
  await build(engine);
  // inferred: normal-perspective diagnostics along the lane at the two eye
  // heights requested in W2A. These observe the same city and paving at all ranges.
  // Use the uninterrupted southern reach: both the 40 m and 150 m inspection
  // distances must remain brick lane, rather than crossing the bridge funnel.
  const laneX=P.paving.laneTrack-3, z=P.crossings[2]+40;
  const pavingViews=[1.6,3].map(eye=>({pos:[laneX,P.surfaceY+eye,z],
    target:[laneX,P.surfaceY+.3,z+150],fov:40,near:.05}));
  return { views: [YUJIE_VIEWS.avenue, YUJIE_VIEWS.corridor, YUJIE_VIEWS.road, YUJIE_VIEWS.aerial, YUJIE_VIEWS.canal, YUJIE_VIEWS.funnel,...pavingViews] };
}
